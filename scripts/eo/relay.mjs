// Expression orale relay: browser <-> our server <-> Azure Voice Live.
// The Azure key never reaches the browser; the server decides the examiner's instructions and records the transcript.
// Usage: node --env-file=.env.local scripts/eo/relay.mjs   (port EO_RELAY_PORT, default 8787)
import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import WebSocket, { WebSocketServer } from "ws";
import { PHASES, phaseInstructions, SPEAKS_FIRST } from "./examiner.mjs";
import { gradeAttempt } from "./grade.mjs";

const PORT = Number(process.env.EO_RELAY_PORT ?? 8787);
const MODEL = process.env.EO_VOICE_MODEL ?? "gpt-4.1";
const MAX_MS = 20 * 60_000; // hard cap per simulation (the épreuve itself is 12 min + preparation)
const ORIGINS = (process.env.EO_ALLOWED_ORIGINS ?? "http://localhost:3000").split(",").map((s) => s.trim());
const UPSTREAM = `wss://${process.env.AZURE_AI_RESOURCE}.services.ai.azure.com/voice-live/realtime?api-version=2025-10-01&model=${MODEL}`;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

// How long a silence ends the candidate's turn: longer in tâche 3, where people pause to think.
const SILENCE_MS = { intro: 900, t1: 1100, t2prep: 900, t2: 900, t3: 2200, end: 900 };
const turnDetection = (phase) => ({ type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: SILENCE_MS[phase] });

const log = (id, ...m) => console.log(new Date().toISOString().slice(11, 19), String(id).slice(0, 8), ...m);

const server = http.createServer((_q, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("eo relay ok");
});
const wss = new WebSocketServer({ server, path: "/eo", maxPayload: 1 << 20 });

wss.on("connection", (client, req) => {
  if (!ORIGINS.includes(req.headers.origin)) return client.close(4003, "origin not allowed");
  let started = false;
  const authTimer = setTimeout(() => !started && client.close(4001, "auth timeout"), 10_000);
  client.once("message", async (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type !== "eo.auth") throw new Error("expected eo.auth");
      const { data: u } = await supabase.auth.getUser(msg.token);
      if (!u?.user) throw new Error("bad token");
      const { data: a } = await supabase
        .from("eo_attempts")
        .select("*, t2:task2_id(prompt, brief), t3:task3_id(prompt, brief)")
        .eq("id", msg.attempt)
        .maybeSingle();
      if (!a || a.user_id !== u.user.id) throw new Error("not your attempt");
      if (a.status !== "created") throw new Error("this simulation was already used");
      clearTimeout(authTimer);
      started = true;
      start(client, a, !!msg.avatar);
    } catch (e) {
      client.close(4001, String(e.message).slice(0, 100));
    }
  });
});

function start(client, a, avatar) {
  const id = a.id;
  const sujets = { task2: a.t2, task3: a.t3 };
  const transcript = [];
  const t0 = Date.now();
  let phase = "intro";
  let responding = false;
  let finished = false;
  let introTurns = 0;
  let greeted = false;
  const speechMs = new Map(); // item_id -> ms of candidate speech
  let speechStart = 0;

  supabase.from("eo_attempts").update({ status: "live", started_at: new Date().toISOString() }).eq("id", id).then(() => {});
  log(id, `start (avatar=${avatar})`);

  const up = new WebSocket(UPSTREAM, { headers: { "api-key": process.env.AZURE_AI_KEY } });
  const send = (o) => up.readyState === WebSocket.OPEN && up.send(JSON.stringify(o));
  const tell = (o) => client.readyState === WebSocket.OPEN && client.send(JSON.stringify(o));
  const persist = () => supabase.from("eo_attempts").update({ transcript }).eq("id", id).then(() => {});
  const saver = setInterval(persist, 30_000);
  const cap = setTimeout(() => finish("time cap"), MAX_MS);

  function setPhase(next) {
    if (PHASES.indexOf(next) <= PHASES.indexOf(phase)) return;
    phase = next;
    if (responding) send({ type: "response.cancel" });
    send({ type: "session.update", session: { instructions: phaseInstructions(phase, sujets), turn_detection: turnDetection(phase) } });
    if (SPEAKS_FIRST.has(phase)) send({ type: "response.create" });
    tell({ type: "eo.phase", phase });
    log(id, "phase", phase);
  }

  up.on("open", () => {
    send({
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: phaseInstructions("intro", sujets),
        voice: { name: a.voice, type: "azure-standard" },
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "azure-speech", language: "fr-FR" },
        input_audio_noise_reduction: { type: "azure_deep_noise_suppression" },
        input_audio_echo_cancellation: { type: "server_echo_cancellation" },
        turn_detection: turnDetection("intro"),
        ...(avatar ? { avatar: { character: a.avatar, style: a.avatar === "lisa" ? "casual-sitting" : "casual" } } : {}),
      },
    });
  });

  up.on("message", (raw) => {
    const e = JSON.parse(raw);
    switch (e.type) {
      case "session.created":
        return;
      case "session.updated":
        // Only the avatar's connection details go to the browser, never the instructions.
        tell({ type: "session.updated", avatar: e.session?.avatar?.ice_servers ? { ice_servers: e.session.avatar.ice_servers } : null });
        if (!greeted) {
          greeted = true;
          tell({ type: "eo.phase", phase: "intro" });
          // With an avatar the examiner waits until the video is connected (eo.ready); otherwise greet now.
          if (!avatar) send({ type: "response.create" });
        }
        return;
      case "input_audio_buffer.speech_started":
        speechStart = e.audio_start_ms ?? 0;
        break;
      case "input_audio_buffer.speech_stopped":
        if (e.item_id) speechMs.set(e.item_id, (e.audio_end_ms ?? 0) - speechStart);
        if (phase === "intro") introTurns++;
        break;
      case "conversation.item.input_audio_transcription.completed":
        if (e.transcript?.trim()) {
          transcript.push({ phase, role: "candidate", text: e.transcript.trim(), t: Date.now() - t0, speech_ms: speechMs.get(e.item_id) ?? 0 });
          tell({ type: "eo.line", role: "candidate", text: e.transcript.trim() });
        }
        return;
      case "response.created":
        responding = true;
        break;
      case "response.audio_transcript.done":
        if (e.transcript?.trim()) {
          transcript.push({ phase, role: "examiner", text: e.transcript.trim(), t: Date.now() - t0 });
          tell({ type: "eo.line", role: "examiner", text: e.transcript.trim() });
        }
        return;
      case "response.done":
        responding = false;
        if (phase === "intro" && introTurns > 0) setPhase("t1");
        else if (phase === "end") setTimeout(() => finish("completed"), 1500);
        break;
      case "error":
        if (/no active response/i.test(e.error?.message ?? "")) return;
        log(id, "upstream error", e.error?.message);
        break;
    }
    tell(e);
  });
  up.on("close", (code, reason) => {
    log(id, "upstream closed", code, String(reason));
    finish("upstream closed");
  });
  up.on("error", (err) => log(id, "upstream error", err.message));

  client.on("message", (raw) => {
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (m.type === "input_audio_buffer.append") {
      if (phase !== "t2prep" && typeof m.audio === "string") send({ type: "input_audio_buffer.append", audio: m.audio });
    } else if (m.type === "session.avatar.connect" && typeof m.client_sdp === "string") {
      send({ type: "session.avatar.connect", client_sdp: m.client_sdp });
    } else if (m.type === "eo.ready" && avatar && phase === "intro" && !responding && transcript.length === 0) {
      send({ type: "response.create" });
    } else if (m.type === "eo.phase" && PHASES.includes(m.phase)) {
      setPhase(m.phase);
    }
    // Everything else (custom instructions, tools, other models…) is dropped.
  });
  client.on("close", () => finish("client left"));

  async function finish(why) {
    if (finished) return;
    finished = true;
    clearInterval(saver);
    clearTimeout(cap);
    try {
      up.close();
    } catch {}
    const words = transcript.filter((l) => l.role === "candidate").reduce((n, l) => n + l.text.split(/\s+/).length, 0);
    const status = words >= 15 ? "recorded" : "failed";
    await supabase.from("eo_attempts").update({ transcript, status, ended_at: new Date().toISOString() }).eq("id", id);
    tell({ type: "eo.recorded", status });
    try {
      client.close(1000, "done");
    } catch {}
    log(id, `finished (${why}): ${transcript.length} lines, ${words} candidate words, ${Math.round((Date.now() - t0) / 1000)} s`);
    if (status !== "recorded") return;
    try {
      const ev = await gradeAttempt(supabase, id);
      log(id, `graded ${ev.overall}/20 (NCLC ${ev.nclc})`);
    } catch (err) {
      log(id, "grading failed", err.message);
      await supabase.from("eo_attempts").update({ status: "failed" }).eq("id", id);
    }
  }
}

server.listen(PORT, () => console.log(`EO relay on :${PORT} (model ${MODEL}, origins ${ORIGINS.join(" ")})`));
