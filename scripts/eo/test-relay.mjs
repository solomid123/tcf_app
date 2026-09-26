// End-to-end test of the EO relay with a synthetic candidate (Azure TTS audio). Creates and deletes a temp user.
// Usage: node --env-file=.env.local scripts/eo/test-relay.mjs   (relay must be running)
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const R = process.env.AZURE_AI_RESOURCE;
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const email = "eo-test@tcfprep.test", password = `T${Math.random().toString(36).slice(2)}!9x`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pcm(text) {
  const r = await fetch(`https://${R}.cognitiveservices.azure.com/tts/cognitiveservices/v1`, {
    method: "POST",
    headers: { "Ocp-Apim-Subscription-Key": process.env.AZURE_AI_KEY, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "raw-24khz-16bit-mono-pcm" },
    body: `<speak version="1.0" xml:lang="fr-FR"><voice name="fr-FR-DeniseNeural">${text}</voice></speak>`,
  });
  return Buffer.from(await r.arrayBuffer());
}

const { data: created } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
const userId = created.user.id;
try {
  const { data: s } = await anon.auth.signInWithPassword({ email, password });
  const [{ data: t2 }, { data: t3 }] = await Promise.all([2, 3].map((t) => admin.from("eo_sujets").select("id, prompt").eq("task", t).limit(1).single()));
  const { data: att } = await admin.from("eo_attempts").insert({ user_id: userId, task2_id: t2.id, task3_id: t3.id, voice: "fr-CA-Thierry:DragonHDLatestNeural", avatar: "harry" }).select("id").single();
  console.log("T2:", t2.prompt, "\nT3:", t3.prompt);

  const ws = new WebSocket("ws://localhost:8787/eo", { headers: { Origin: "http://localhost:3000" } });
  const waiters = [];
  const waitFor = (pred, ms = 60000) => new Promise((res, rej) => { const w = { pred, res }; waiters.push(w); setTimeout(() => rej(new Error("timeout waiting")), ms); });
  let audioBytes = 0;
  const t0 = Date.now();
  ws.on("message", (raw) => {
    const e = JSON.parse(raw);
    if (e.type === "response.audio.delta") audioBytes += e.delta.length;
    if (e.type === "eo.line") console.log(`${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s ${e.role.padEnd(9)} ${e.text}`);
    if (e.type === "eo.phase") console.log(`---- phase ${e.phase}`);
    if (e.type === "error") console.log("ERROR", e.error?.message);
    for (const w of [...waiters]) if (w.pred(e)) { waiters.splice(waiters.indexOf(w), 1); w.res(e); }
  });
  ws.on("close", (c, r) => console.log("closed", c, String(r)));
  await new Promise((r) => ws.on("open", r));
  ws.send(JSON.stringify({ type: "eo.auth", token: s.session.access_token, attempt: att.id, avatar: false }));

  const say = async (text) => {
    const buf = Buffer.concat([await pcm(text), Buffer.alloc(24000 * 2 * 3)]); // + 3 s of silence
    for (let i = 0; i < buf.length; i += 4800) { ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: buf.subarray(i, i + 4800).toString("base64") })); await sleep(50); }
  };
  const done = () => waitFor((e) => e.type === "response.done");

  await done(); // greeting
  await say("Je m'appelle Karim Benali.");
  await waitFor((e) => e.type === "eo.phase" && e.phase === "t1");
  await say("Alors, j'ai trente-deux ans, je suis ingénieur en informatique et j'habite à Casablanca avec ma femme et mes deux enfants. Je voudrais m'installer au Canada l'année prochaine.");
  await done();
  await say("Le week-end, j'aime beaucoup faire du vélo et cuisiner avec mes enfants.");
  await done();
  ws.send(JSON.stringify({ type: "eo.phase", phase: "t2prep" }));
  await done();
  await say("Ceci ne doit pas être entendu pendant la préparation.");
  ws.send(JSON.stringify({ type: "eo.phase", phase: "t2" }));
  await say("Bonjour, j'aimerais avoir quelques informations. Quels sont vos horaires d'ouverture ?");
  await done();
  await say("Et combien ça coûte pour un mois ?");
  await done();
  ws.send(JSON.stringify({ type: "eo.phase", phase: "t3" }));
  await done();
  await say("À mon avis, c'est une très bonne idée, parce que les jeunes comprennent mieux les règles quand ils participent à leur élaboration. Par exemple, dans mon lycée, nous avions un conseil des élèves. Cependant, il faut que les adultes gardent le dernier mot.");
  await done();
  ws.send(JSON.stringify({ type: "eo.phase", phase: "end" }));
  const rec = await waitFor((e) => e.type === "eo.recorded", 30000);
  console.log("recorded:", rec.status, `examiner audio ≈ ${Math.round((audioBytes * 0.75) / 48000)} s`);

  for (let i = 0; i < 40; i++) {
    const { data } = await admin.from("eo_attempts").select("status, score, evaluation").eq("id", att.id).single();
    if (data.status === "graded" || data.status === "failed") {
      console.log("status:", data.status, "score:", data.score, "NCLC:", data.evaluation?.nclc, "level:", data.evaluation?.level);
      console.log(data.evaluation?.summary);
      console.log(JSON.stringify(data.evaluation?.tasks?.map((t) => [t.task, t.score, t.level])), JSON.stringify(data.evaluation?.corrections?.slice(0, 2)));
      break;
    }
    await sleep(3000);
  }
} finally {
  await admin.auth.admin.deleteUser(userId);
  console.log("temp user deleted");
}
process.exit(0);
