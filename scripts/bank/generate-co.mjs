// Generates one complete Compréhension orale épreuve (39 original items in the TCF Canada format):
// text (Azure OpenAI) -> blind answer check -> audio (Azure Speech) -> pictures (FLUX) + vision check -> Supabase.
//
//   node --env-file=.env.local scripts/bank/generate-co.mjs --serie 1 [--only 1-4] [--publish | --status pool] [--concurrency 4] [--recast]
//
// Progress is cached in scripts/bank/out/co-serie-N/ so the script can be re-run to resume after a failure.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { escapeXml, image, llmJson, tts, visionJson } from "./azure.mjs";
import { blueprint, INSTRUCTIONS, TOPICS } from "./co-blueprint.mjs";
import { CHECK_SCHEMA, checkPrompt, GUESS_SCHEMA, guessPrompt, IMAGE_STYLE, imageCheckPrompt, ITEM_SCHEMA, itemPrompt, SYSTEM } from "./co-prompts.mjs";

// ---------- args ----------
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? def : process.argv[i + 1] ?? true;
};
const SERIE = Number(arg("serie", 1));
const PUBLISH = process.argv.includes("--publish");
// --status pool: generated for the "New série" pool (handed to a user on request). Otherwise published or draft.
const STATUS = arg("status", PUBLISH ? "published" : "draft");
if (!["draft", "pool", "published"].includes(STATUS)) throw new Error(`bad --status ${STATUS}`);
const CONCURRENCY = Number(arg("concurrency", 4));
const only = arg("only", null);
const [ONLY_FROM, ONLY_TO] = only ? only.split("-").map(Number) : [1, 39];

const OUT = path.join("scripts", "bank", "out", `co-serie-${SERIE}`);
fs.mkdirSync(OUT, { recursive: true });
const STATE_FILE = path.join(OUT, "items.json");
const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) : {};
const save = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const log = (p, ...m) => console.log(`[Q${String(p).padStart(2, "0")}]`, ...m);

// ---------- deterministic randomness per série ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(SERIE * 7919);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const slots = blueprint();
// Balanced answer letters across the épreuve (about 10 of each A/B/C/D).
const targets = shuffle(Array.from({ length: 39 }, (_, i) => i % 4));
// Topics: rotate through each level's pool so every série gets different situations.
const topicFor = (slot) => {
  const pool = TOPICS[slot.level];
  const sameLevel = slots.filter((s) => s.level === slot.level);
  const idx = sameLevel.indexOf(slot);
  return pool[((SERIE - 1) * sameLevel.length + idx) % pool.length];
};

// ---------- voices ----------
const NARRATOR = "fr-FR-Vivienne:DragonHDLatestNeural";
const VOICES = {
  france: {
    F: ["fr-FR-Denise:DragonLatestNeural", "fr-FR-DeniseNeural", "fr-FR-BrigitteNeural", "fr-FR-CoralieNeural", "fr-FR-CelesteNeural", "fr-FR-JosephineNeural", "fr-FR-YvetteNeural", "fr-FR-JacquelineNeural"],
    M: ["fr-FR-Remy:DragonHDLatestNeural", "fr-FR-HenriNeural", "fr-FR-AlainNeural", "fr-FR-JeromeNeural", "fr-FR-YvesNeural", "fr-FR-ClaudeNeural", "fr-FR-MauriceNeural"],
  },
  // Azure has one Québec female voice and three male ones (the plain Sylvie/Thierry voices are the same people as the HD ones).
  quebec: { F: ["fr-CA-Sylvie:DragonHDLatestNeural"], M: ["fr-CA-Thierry:DragonHDLatestNeural", "fr-CA-JeanNeural", "fr-CA-AntoineNeural"] },
  belgique: { F: ["fr-BE-CharlineNeural"], M: ["fr-BE-GerardNeural"] },
  suisse: { F: ["fr-CH-ArianeNeural"], M: ["fr-CH-FabriceNeural"] },
};
const SENIOR = new Set(["fr-FR-YvetteNeural", "fr-FR-JacquelineNeural", "fr-FR-MauriceNeural", "fr-FR-ClaudeNeural"]);

function castVoices(speakers, position) {
  const used = new Set();
  const cast = {};
  speakers.forEach((s, i) => {
    let pool = VOICES[s.accent]?.[s.gender] ?? VOICES.france[s.gender];
    if (s.age === "senior") pool = [...pool.filter((v) => SENIOR.has(v)), ...pool];
    else pool = pool.filter((v) => !SENIOR.has(v)).concat(pool.filter((v) => SENIOR.has(v)));
    const start = (position * 3 + i) % Math.max(pool.length, 1);
    const rotated = [...pool.slice(start), ...pool.slice(0, start)];
    // Prefer HD voices; always keep speakers distinct (a second Québécoise falls back to a voice from France).
    const pick = [...rotated.filter((v) => v.includes("Dragon")), ...rotated, ...VOICES.france[s.gender]].find((v) => !used.has(v)) ?? VOICES.france[s.gender][0];
    used.add(pick);
    cast[s.id] = pick;
  });
  return cast;
}

// Accent plan, decided here rather than by the model (which always picks France): about a third of the
// items are voiced by Québec speakers, plus one Belgian and one Swiss item. Separate RNG so the letter plan is unchanged.
const accentRand = rng(SERIE * 104729);
const accentOrder = Array.from({ length: 39 }, (_, i) => i + 1)
  .map((p) => [accentRand(), p])
  .sort((a, b) => a[0] - b[0])
  .map(([, p]) => p);
const PLANNED_ACCENT = Object.fromEntries(accentOrder.map((p, i) => [p, i < 13 ? "quebec" : i === 13 ? "belgique" : i === 14 ? "suisse" : "france"]));
// Items written before the plan existed may be set in France; those keep French voices.
const FRANCE_ONLY = /\b(Paris|parisien\w*|Lyon|Marseille|Bordeaux|Toulouse|Lille|Nantes|Strasbourg|France|euros?|SNCF|RER|TGV)\b/i;
function accentFor(slot, item) {
  const planned = PLANNED_ACCENT[slot.position];
  if (planned === "france") return "france";
  const text = [item.context, item.topic, ...item.turns.map((t) => t.text), ...item.options].join(" ");
  return FRANCE_ONLY.test(text) ? "france" : planned;
}
const locale = (voice) => voice.slice(0, 5);

// ---------- text generation ----------
const MAX_WORDS = { A1: 40, A2: 70, B1: 100, B2: 155, C1: 185, C2: 205 };

function validate(item, slot) {
  const errs = [];
  if (item.options?.length !== 4) errs.push("need exactly 4 options");
  if (new Set(item.options.map((o) => o.trim().toLowerCase())).size !== 4) errs.push("duplicate options");
  if (item.options.some((o) => !o.trim())) errs.push("empty option");
  if (!(item.answer >= 0 && item.answer <= 3)) errs.push("bad answer index");
  const ids = new Set(item.speakers.map((s) => s.id));
  if (!item.speakers.length) errs.push("no speakers");
  if (slot.kind === "image_description") {
    if (!item.image_prompt.trim()) errs.push("missing image_prompt");
  } else {
    if (!item.turns.length) errs.push("no turns");
    if (item.turns.some((t) => !ids.has(t.speaker))) errs.push("turn with unknown speaker");
  }
  if (slot.kind === "spoken_response" && item.speakers.length < 2) errs.push("spoken_response needs S1 and S2");
  if ((slot.kind === "short_document" || slot.kind === "long_document") && !item.question.trim()) errs.push("missing question");
  // Keep the whole épreuve's audio around 25 minutes so candidates have time to answer within 35.
  const words = item.turns.map((t) => t.text).join(" ").split(/\s+/).filter(Boolean).length;
  const max = MAX_WORDS[slot.level];
  if (slot.kind.endsWith("document") && words > max) errs.push(`document too long (${words} words, maximum ${max})`);
  return errs;
}

// Move the correct option to the balanced target letter.
function placeAnswer(item, target) {
  const correct = item.options[item.answer];
  const others = shuffle(item.options.filter((_, i) => i !== item.answer));
  const options = [...others];
  options.splice(target, 0, correct);
  return { ...item, options, answer: target };
}

// Picture items: vary who is in the photo across the épreuve and across séries.
const SUBJECTS = [
  "un homme d'une trentaine d'années qui s'adresse à un ami ou un collègue",
  "une dame âgée qui s'adresse à un commerçant ou un employé",
  "un parent qui s'adresse à ses enfants",
  "une jeune femme qui s'adresse à un groupe d'amis",
  "un employé (serveur, vendeur, guichetier, agent) qui s'adresse à un client",
  "un enfant qui s'adresse à un adulte",
  "un couple qui se parle",
];
const subjectHint = (slot) =>
  slot.kind === "image_description"
    ? `\nPersonnage qui parle sur le dessin : ${SUBJECTS[(SERIE * 4 + slot.position) % SUBJECTS.length]}.`
    : "";

async function writeItem(slot, avoid) {
  const seen = SEEN[seenKey(slot)] ?? [];
  let feedback = subjectHint(slot);
  for (let attempt = 1; attempt <= 5; attempt++) {
    const raw = await llmJson({
      instructions: SYSTEM,
      input: itemPrompt({ slot, topic: topicFor(slot), avoid, seen, accent: PLANNED_ACCENT[slot.position] }) + feedback,
      schema: ITEM_SCHEMA,
      name: "tcf_item",
    });
    const errs = validate(raw, slot);
    if (errs.length) {
      log(slot.position, `attempt ${attempt} invalid: ${errs.join(", ")}`);
      feedback = `${subjectHint(slot)}\n\nATTENTION, ta tentative précédente était invalide : ${errs.join(", ")}. Corrige.`;
      continue;
    }
    const item = placeAnswer(raw, targets[slot.position - 1]);
    let check = null;
    if (slot.kind !== "image_description") {
      check = await llmJson({ input: checkPrompt(item, slot.kind), schema: CHECK_SCHEMA, name: "check" });
      if (check.answer !== item.answer || check.ambiguous) {
        log(slot.position, `attempt ${attempt} failed blind check (got ${check.answer}, ambiguous=${check.ambiguous}): ${check.issues}`);
        feedback = `${subjectHint(slot)}\n\nATTENTION, un relecteur a jugé ta tentative précédente problématique : ${check.issues}. Écris un item entièrement nouveau, avec une seule bonne réponse indiscutable.`;
        continue;
      }
    }
    // Too easy? A reader who never heard the recording should not be able to spot the key.
    const guess = await llmJson({ input: guessPrompt(item, slot.kind), schema: GUESS_SCHEMA, name: "guess" });
    if (!(guess.confident && guess.answer === item.answer)) return { item, check };
    log(slot.position, `attempt ${attempt} too easy — guessable without listening: ${guess.reason}`);
    feedback = `${subjectHint(slot)}\n\nATTENTION, ta tentative précédente était TROP FACILE : on trouvait la bonne réponse sans écouter (${guess.reason}). Écris un item entièrement nouveau où les 4 propositions sont aussi plausibles les unes que les autres sans le document.`;
  }
  throw new Error("could not produce a valid item after 5 attempts");
}

// ---------- audio ----------
function buildSsml(slot, item, cast) {
  const slow = slot.level === "A1" || slot.level === "A2";
  // The explicit <lang> matters: HD voices guess the language from the text and read "Question 1." in English.
  const say = (voice, text, lead = 0) =>
    `<voice name="${voice}">${lead ? `<break time="${lead}ms"/>` : ""}<lang xml:lang="${locale(voice)}">${slow ? `<prosody rate="-6%">${escapeXml(text)}</prosody>` : escapeXml(text)}</lang></voice>`;
  const parts = [say(NARRATOR, `Question ${slot.position}.`)];
  const optionsBy = (voice) =>
    item.options.map((o, i) => say(voice, `${"ABCD"[i]}. ${o}`, i === 0 ? 900 : 1100)).join("");

  if (slot.kind === "image_description") {
    parts.push(optionsBy(cast[item.speakers[0].id]));
  } else if (slot.kind === "spoken_response") {
    const [s1, s2] = item.speakers;
    parts.push(say(cast[item.turns[0].speaker] ?? cast[s1.id], item.turns[0].text, 800));
    parts.push(optionsBy(cast[s2.id]));
  } else {
    item.turns.forEach((t, i) => parts.push(say(cast[t.speaker], t.text, i === 0 ? 800 : 350)));
  }
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="fr-FR">${parts.join("")}</speak>`;
}

// ---------- pictures ----------
async function makePicture(slot, item) {
  const correct = item.options[item.answer];
  let extra = "";
  let scene = item.image_prompt;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let buf;
    try {
      // Booklet pictures are printed in greyscale: strip any stray tint the model adds.
      buf = await sharp(await image(`${IMAGE_STYLE} Scene: ${scene}${extra}`)).grayscale().jpeg({ quality: 88 }).toBuffer();
    } catch (e) {
      if (!/refusal|moderat|safety/i.test(e.message)) throw e;
      log(slot.position, `picture attempt ${attempt} refused by the image model — rewriting the scene`);
      ({ scene } = await llmJson({
        input: `This image prompt was refused by an image model's safety filter. Rewrite it so it depicts the same scene and still unmistakably shows "${correct}", but with nothing a safety filter could flag (no blades, knives, tools in hand pointing at people, weapons, fire, medicine, alcohol, children alone, injuries). Keep it concrete and visual, in English.\n\nPrompt: ${scene}`,
        schema: { type: "object", additionalProperties: false, required: ["scene"], properties: { scene: { type: "string" } } },
        name: "scene",
      }));
      continue;
    }
    const v = await visionJson({ imageBuf: buf, prompt: imageCheckPrompt(item.options), schema: CHECK_SCHEMA });
    if (v.answer === item.answer && !v.ambiguous) return { buf, attempts: attempt };
    log(slot.position, `picture attempt ${attempt} rejected (vision chose ${v.answer}, ambiguous=${v.ambiguous}): ${v.issues}`);
    extra = ` The picture must show unmistakably and prominently: "${correct}". It must clearly NOT match: ${item.options
      .filter((_, i) => i !== item.answer)
      .map((o) => `"${o}"`)
      .join(", ")}.`;
  }
  throw new Error("picture failed the vision check 3 times");
}

// ---------- pipeline ----------
// A picture item whose situation can't be drawn unambiguously is rewritten from scratch (up to 3 scenarios).
async function processSlot(slot) {
  for (let scenario = 1; ; scenario++) {
    try {
      return await processSlotOnce(slot);
    } catch (e) {
      if (slot.kind !== "image_description" || scenario >= 3 || !/vision check/.test(e.message)) throw e;
      log(slot.position, `scenario ${scenario} could not be drawn clearly — writing a new situation`);
      delete state[slot.position];
      save();
      fs.rmSync(path.join(OUT, `q${String(slot.position).padStart(2, "0")}.mp3`), { force: true });
    }
  }
}

async function processSlotOnce(slot) {
  const p = slot.position;
  const s = (state[p] ??= { position: p, level: slot.level, kind: slot.kind, points: slot.points });

  if (!s.item) {
    const avoid = Object.values(state).filter((x) => x.item && x.position !== p).map((x) => x.item.topic);
    const { item, check } = await writeItem(slot, avoid);
    Object.assign(s, { item, check });
    save();
    log(p, `text ok — ${item.context} (${item.topic})`);
  }
  if (!s.cast) {
    const accent = accentFor(slot, s.item);
    s.item.speakers = s.item.speakers.map((sp) => ({ ...sp, accent }));
    s.cast = castVoices(s.item.speakers, p);
    save();
  }
  const audioFile = path.join(OUT, `q${String(p).padStart(2, "0")}.mp3`);
  if (!fs.existsSync(audioFile)) {
    fs.writeFileSync(audioFile, await tts(buildSsml(slot, s.item, s.cast)));
    log(p, "audio ok");
  }
  if (slot.kind === "image_description") {
    const imgFile = path.join(OUT, `q${String(p).padStart(2, "0")}.jpg`);
    if (!fs.existsSync(imgFile)) {
      const { buf, attempts } = await makePicture(slot, s.item);
      fs.writeFileSync(imgFile, buf);
      log(p, `picture ok (attempt ${attempts})`);
    }
  }
}

async function pool(items, n, fn) {
  const queue = [...items];
  const failures = [];
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) {
        const it = queue.shift();
        try {
          await fn(it);
        } catch (e) {
          failures.push(it.position);
          log(it.position, "FAILED:", e.message);
        }
      }
    }),
  );
  return failures;
}

// Picture and question-réponse items are compared with every earlier one of their kind (they can sit at any
// of their positions); documents with the same position.
const seenKey = (x) => (x.kind === "image_description" || x.kind === "spoken_response" ? x.kind : x.position);

async function loadSeen() {
  const { data: sets } = await supabase.from("bank_sets").select("id").eq("skill", "CO").neq("number", SERIE).order("number", { ascending: false }).limit(15);
  if (!sets?.length) return {};
  const { data: rows } = await supabase
    .from("bank_items")
    .select("position, kind, level, question, options, answer, transcript")
    .in("set_id", sets.map((x) => x.id));
  const seen = {};
  for (const r of rows ?? []) {
    const gist = r.kind === "image_description" || r.kind === "spoken_response"
      ? `${r.transcript?.[0]?.text ? r.transcript[0].text + " → " : ""}${r.options[r.answer]}`
      : `${r.question} (${(r.transcript?.[0]?.text ?? "").slice(0, 90)}…)`;
    (seen[seenKey(r)] ??= []).push(gist);
  }
  return seen;
}

async function upload() {
  const done = slots.filter((sl) => state[sl.position]?.item);
  if (done.length !== 39) {
    console.log(`Only ${done.length}/39 items ready — kept locally, not uploaded yet. Re-run without --only to finish.`);
    return;
  }
  const { data: existing } = await supabase.from("bank_sets").select("owner_id").eq("skill", "CO").eq("number", SERIE).maybeSingle();
  if (existing?.owner_id) throw new Error(`Série ${SERIE} already belongs to a user — refusing to overwrite it.`);
  const { data: set, error } = await supabase
    .from("bank_sets")
    .upsert({ skill: "CO", number: SERIE, title: `Série ${SERIE}`, status: STATUS }, { onConflict: "skill,number" })
    .select("id")
    .single();
  if (error) throw error;

  const rows = [];
  for (const sl of slots) {
    const s = state[sl.position];
    const base = `co/serie-${SERIE}/q${String(sl.position).padStart(2, "0")}`;
    const put = async (ext, type) => {
      const file = path.join(OUT, `q${String(sl.position).padStart(2, "0")}.${ext}`);
      if (!fs.existsSync(file)) return null;
      // Content hash in the name, so a regenerated file never shows a stale cached copy.
      const buf = fs.readFileSync(file);
      const key = `${base}-${crypto.createHash("sha1").update(buf).digest("hex").slice(0, 8)}.${ext}`;
      const { error: e } = await supabase.storage.from("bank").upload(key, buf, { contentType: type, upsert: true });
      if (e) throw e;
      return key;
    };
    const it = s.item;
    const spoken = sl.kind === "image_description" || sl.kind === "spoken_response";
    rows.push({
      set_id: set.id,
      position: sl.position,
      level: sl.level,
      points: sl.points,
      kind: sl.kind,
      instruction: INSTRUCTIONS[sl.kind],
      question: it.question || null,
      options: it.options,
      options_spoken: spoken,
      answer: it.answer,
      explanation: it.explanation,
      transcript: it.turns.map((t) => ({ speaker: t.speaker, voice: s.cast[t.speaker], text: t.text, role: it.speakers.find((x) => x.id === t.speaker)?.role ?? "" })),
      audio_path: await put("mp3", "audio/mpeg"),
      image_path: await put("jpg", "image/jpeg"),
    });
  }
  await supabase.from("bank_items").delete().eq("set_id", set.id);
  const { error: insErr } = await supabase.from("bank_items").insert(rows);
  if (insErr) throw insErr;
  console.log(`Uploaded Série ${SERIE}: 39 items (${STATUS}).`);
}

// What earlier séries already asked at each position, so a new série never repeats them.
const SEEN = await loadSeen();

const todo = slots.filter((s) => s.position >= ONLY_FROM && s.position <= ONLY_TO);
// --recast: keep the texts and pictures, redo voice casting and audio.
if (process.argv.includes("--recast")) {
  for (const sl of todo) {
    if (state[sl.position]) delete state[sl.position].cast;
    fs.rmSync(path.join(OUT, `q${String(sl.position).padStart(2, "0")}.mp3`), { force: true });
  }
  save();
}
console.log(`CO Série ${SERIE}: ${todo.length} item(s), concurrency ${CONCURRENCY}`);
const t0 = Date.now();
const failures = await pool(todo, CONCURRENCY, processSlot);
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(0)}s. ${failures.length ? `Failed: ${failures.join(", ")} (re-run to retry)` : "No failures."}`);
if (failures.length) process.exitCode = 1;
else await upload();
