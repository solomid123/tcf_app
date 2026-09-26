"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "intro" | "t1" | "t2prep" | "t2" | "t3" | "end";
type Stage = "setup" | "connecting" | "live" | "saving" | "error";

const DURATION: Partial<Record<Phase, number>> = { t1: 120, t2prep: 120, t2: 210, t3: 270 };
const NEXT: Partial<Record<Phase, Phase>> = { t1: "t2prep", t2prep: "t2", t2: "t3", t3: "end" };
// These clocks start once the examiner has finished reading the consigne and the sujet.
const CLOCK_AFTER_EXAMINER = new Set<Phase>(["t2prep", "t3"]);
const STEPS: [Phase, string][] = [["intro", "Accueil"], ["t1", "Tâche 1"], ["t2prep", "Préparation"], ["t2", "Tâche 2"], ["t3", "Tâche 3"]];
const RATE = 24000; // Voice Live PCM16 rate
const WORKLET = `class Mic extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor("mic",Mic);`;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function toBase64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function Simulation(props: { attemptId: string; token: string; relayUrl: string; examiner: string; task2: string; task3: string }) {
  const { attemptId, token, relayUrl, examiner, task2, task3 } = props;
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("setup");
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("intro");
  const [left, setLeft] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [useAvatar, setUseAvatar] = useState(true);
  const [avatarState, setAvatarState] = useState<"off" | "connecting" | "on" | "failed">("off");
  const [captions, setCaptions] = useState(false);
  const [line, setLine] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);

  const ws = useRef<WebSocket | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const avatarAudio = useRef<HTMLAudioElement | null>(null);
  const phaseRef = useRef<Phase>("intro");
  const avatarLive = useRef(false);
  const playing = useRef<AudioBufferSourceNode[]>([]);
  const nextTime = useRef(0);
  const pendingClock = useRef<{ phase: Phase; created: boolean } | null>(null);
  const recorded = useRef(false);

  const send = (o: object) => ws.current?.readyState === WebSocket.OPEN && ws.current.send(JSON.stringify(o));
  const advance = (next: Phase) => send({ type: "eo.phase", phase: next });

  function startClock(p: Phase) {
    const d = DURATION[p];
    if (!d) return;
    pendingClock.current = null;
    setLeft(d);
    setDeadline(Date.now() + d * 1000);
  }

  // Countdown; when it runs out the épreuve moves on, like the real examiner would.
  useEffect(() => {
    if (deadline == null) return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        clearInterval(id);
        const next = NEXT[phaseRef.current];
        if (next && ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify({ type: "eo.phase", phase: next }));
      }
    }, 250);
    return () => clearInterval(id);
  }, [deadline]);

  function stopPlayback() {
    playing.current.forEach((s) => {
      try {
        s.stop();
      } catch {}
    });
    playing.current = [];
    nextTime.current = 0;
  }

  function playPcm(b64: string) {
    const c = ctx.current;
    if (!c || avatarLive.current) return;
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const pcm = new Int16Array(bytes.buffer, 0, bytes.length >> 1);
    const buf = c.createBuffer(1, pcm.length, RATE);
    const data = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) data[i] = pcm[i] / 32768;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    const at = Math.max(c.currentTime + 0.03, nextTime.current);
    src.start(at);
    nextTime.current = at + buf.duration;
    playing.current.push(src);
    setSpeaking(true);
    src.onended = () => {
      playing.current = playing.current.filter((s) => s !== src);
      if (!playing.current.length) setSpeaking(false);
    };
  }

  async function connectAvatar(iceServers: RTCIceServer[]) {
    setAvatarState("connecting");
    const peer = new RTCPeerConnection({ iceServers });
    pc.current = peer;
    peer.addTransceiver("video", { direction: "recvonly" });
    peer.addTransceiver("audio", { direction: "recvonly" });
    peer.ontrack = (e) => {
      const stream = new MediaStream([e.track]);
      if (e.track.kind === "video" && video.current) video.current.srcObject = stream;
      if (e.track.kind === "audio" && avatarAudio.current) {
        avatarAudio.current.srcObject = stream;
        avatarAudio.current.play().catch(() => {});
      }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected" && !avatarLive.current) {
        avatarLive.current = true;
        setAvatarState("on");
        send({ type: "eo.ready" });
      } else if (peer.connectionState === "failed") setAvatarState("failed");
    };
    await peer.setLocalDescription(await peer.createOffer());
    // Send the offer once ICE candidates are gathered (or after 3 s).
    await new Promise<void>((res) => {
      if (peer.iceGatheringState === "complete") return res();
      const t = setTimeout(res, 3000);
      peer.onicegatheringstatechange = () => peer.iceGatheringState === "complete" && (clearTimeout(t), res());
    });
    send({ type: "session.avatar.connect", client_sdp: btoa(JSON.stringify(peer.localDescription)) });
    setTimeout(() => !avatarLive.current && setAvatarState("failed"), 20000);
  }

  function onEvent(e: { type: string; [k: string]: unknown }) {
    switch (e.type) {
      case "session.updated": {
        const av = e.avatar as { ice_servers?: RTCIceServer[] } | null;
        if (av?.ice_servers && !pc.current) connectAvatar(av.ice_servers);
        break;
      }
      case "eo.phase": {
        const p = e.phase as Phase;
        phaseRef.current = p;
        setPhase(p);
        setConfirmEnd(false);
        setDeadline(null);
        setLeft(null);
        if (p !== "intro") stopPlayback();
        if (CLOCK_AFTER_EXAMINER.has(p)) {
          pendingClock.current = { phase: p, created: false };
          setTimeout(() => pendingClock.current?.phase === p && startClock(p), 45000); // safety net
        } else startClock(p);
        break;
      }
      case "response.created":
        if (pendingClock.current) pendingClock.current.created = true;
        setSpeaking(true);
        break;
      case "response.done":
        if (avatarLive.current) setSpeaking(false);
        if (pendingClock.current?.created) startClock(pendingClock.current.phase);
        break;
      case "response.audio.delta":
        playPcm(e.delta as string);
        break;
      case "input_audio_buffer.speech_started":
        setListening(true);
        stopPlayback(); // the candidate can interrupt, as in a real conversation
        break;
      case "input_audio_buffer.speech_stopped":
        setListening(false);
        break;
      case "eo.line":
        if (e.role === "examiner") setLine(e.text as string);
        break;
      case "eo.recorded":
        recorded.current = true;
        setStage("saving");
        router.push(`/practice/eo/review/${attemptId}`);
        break;
      default:
        if (typeof e.server_sdp === "string" && pc.current) {
          pc.current.setRemoteDescription(JSON.parse(atob(e.server_sdp))).catch(() => setAvatarState("failed"));
        }
    }
  }

  async function start(withAvatar: boolean) {
    setStage("connecting");
    setError("");
    try {
      if (!mic.current) {
        mic.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      }
      if (!ctx.current) {
        const c = new AudioContext();
        ctx.current = c;
        await c.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" })));
        const node = new AudioWorkletNode(c, "mic");
        c.createMediaStreamSource(mic.current).connect(node);
        // Resample the mic to 24 kHz PCM16 and stream it in 100 ms chunks.
        const ratio = c.sampleRate / RATE;
        let pending: number[] = [];
        let pos = 0;
        node.port.onmessage = (m: MessageEvent<Float32Array>) => {
          const input = m.data;
          for (; pos < input.length; pos += ratio) pending.push(input[Math.floor(pos)]);
          pos -= input.length;
          if (pending.length < RATE / 10) return;
          const chunk = pending;
          pending = [];
          let sum = 0;
          const out = new Int16Array(chunk.length);
          chunk.forEach((v, i) => {
            const s = Math.max(-1, Math.min(1, v));
            out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            sum += s * s;
          });
          setLevel(Math.min(1, Math.sqrt(sum / chunk.length) * 6));
          const p = phaseRef.current;
          if (p !== "t2prep" && p !== "end") send({ type: "input_audio_buffer.append", audio: toBase64(new Uint8Array(out.buffer)) });
        };
      }
      await ctx.current.resume();
    } catch {
      setStage("error");
      setError("We couldn't access your microphone. Allow microphone access in your browser and try again.");
      return;
    }

    const sock = new WebSocket(relayUrl);
    ws.current = sock;
    sock.onopen = () => sock.send(JSON.stringify({ type: "eo.auth", token, attempt: attemptId, avatar: withAvatar }));
    sock.onmessage = (m) => {
      const e = JSON.parse(m.data);
      if (e.type === "eo.phase" || e.type === "session.updated") setStage((s) => (s === "connecting" ? "live" : s));
      onEvent(e);
    };
    sock.onclose = (e) => {
      if (recorded.current || ws.current !== sock) return;
      setStage("error");
      setError(e.code === 4001 && e.reason ? `The simulation couldn't start (${e.reason}).` : "The connection to the examiner was lost.");
    };
  }

  function restartWithoutAvatar() {
    const old = ws.current;
    ws.current = null;
    old?.close();
    pc.current?.close();
    pc.current = null;
    avatarLive.current = false;
    setAvatarState("off");
    setUseAvatar(false);
    // Give the server a moment to release the unused simulation.
    setTimeout(() => start(false), 2000);
  }

  useEffect(
    () => () => {
      ws.current?.close();
      pc.current?.close();
      mic.current?.getTracks().forEach((t) => t.stop());
      ctx.current?.close();
    },
    [],
  );

  const stepIndex = STEPS.findIndex(([p]) => p === phase);
  const showSujet2 = phase === "t2prep" || phase === "t2";
  const clockPending = left == null && DURATION[phase] != null;

  if (stage === "setup" || (stage === "error" && !ws.current)) {
    return (
      <>
        <p className="eyebrow">Expression orale · Simulation</p>
        <h1 className="mt-3 text-4xl md:text-5xl"><span className="text-chrome">Before you start</span></h1>
        <div className="glass grain mt-8 max-w-2xl rounded-3xl p-8">
          <ul className="space-y-3 text-fg/80">
            <li>🎧 Use headphones, so the examiner doesn&apos;t hear itself through your speakers.</li>
            <li>🤫 Find a quiet room. The épreuve lasts about 13 minutes and can&apos;t be paused.</li>
            <li>🇫🇷 Speak only in French. You can ask the examiner to repeat or rephrase at any time.</li>
            <li>⏱️ The timings are those of the real test: 2 min, then 2 min of preparation and 3 min 30, then 4 min 30.</li>
          </ul>
          <div className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={useAvatar} onChange={(e) => setUseAvatar(e.target.checked)} />
              Show the examiner on video (avatar)
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} />
              Show what the examiner says (not available on exam day)
            </label>
          </div>
          {error && <p className="mt-5 rounded-2xl border border-ko-line bg-ko-soft px-4 py-3 text-sm text-ko">{error}</p>}
          <button className="btn btn-primary mt-6 w-full" onClick={() => start(useAvatar)}>
            Start the épreuve
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">Expression orale · Simulation</p>
        <ol className="flex flex-wrap gap-2 text-xs">
          {STEPS.map(([p, label], i) => (
            <li
              key={p}
              className={`rounded-full border px-3 py-1 ${
                i === stepIndex ? "border-accent text-fg" : i < stepIndex || phase === "end" ? "border-line bg-well text-muted" : "border-line text-muted"
              }`}
            >
              {label}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        {/* The examiner */}
        <div className="glass grain relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl">
          <video ref={video} autoPlay playsInline className={`h-full w-full object-cover ${avatarState === "on" ? "" : "hidden"}`} />
          <audio ref={avatarAudio} autoPlay />
          {avatarState !== "on" && (
            <div className="flex flex-col items-center gap-5">
              <span
                className={`h-28 w-28 rounded-full bg-accent/25 transition-transform duration-300 ${speaking ? "scale-110 animate-pulse" : ""}`}
                style={{ boxShadow: speaking ? "0 0 60px var(--accent)" : "none" }}
              />
              <p className="text-sm text-muted">
                {stage === "connecting" || avatarState === "connecting" ? "Connecting to the examiner…" : `${examiner}, examinateur`}
              </p>
            </div>
          )}
          {avatarState === "failed" && (
            <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-line bg-well p-4 text-sm">
              The video couldn&apos;t connect.{" "}
              <button className="underline" onClick={restartWithoutAvatar}>
                Continue with voice only
              </button>
            </div>
          )}
          {captions && line && (
            <p className="absolute inset-x-6 bottom-6 rounded-2xl bg-black/60 px-4 py-3 text-sm text-white">{line}</p>
          )}
        </div>

        {/* The candidate's side */}
        <div className="flex flex-col gap-5">
          <div className="glass grain rounded-3xl p-6">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-muted">
                {phase === "intro" ? "Accueil" : phase === "t2prep" ? "Préparation" : phase === "end" ? "Fin de l'épreuve" : STEPS[stepIndex]?.[1]}
              </p>
              <p className="text-4xl font-bold tabular-nums">{left != null ? fmt(left) : clockPending ? "…" : "—"}</p>
            </div>
            <div className="mt-4 flex items-center gap-3 text-sm text-muted">
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-well">
                <span className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width]" style={{ width: `${phase === "t2prep" ? 0 : level * 100}%` }} />
              </span>
              <span className="w-28 text-right">
                {phase === "t2prep" ? "Mic paused" : listening ? "Listening…" : speaking ? "Examiner speaking" : "Your turn"}
              </span>
            </div>
          </div>

          {showSujet2 && (
            <div className="glass grain rounded-3xl p-6">
              <p className="eyebrow">Sujet · Tâche 2</p>
              <p className="mt-3 leading-relaxed">{task2}</p>
              <p className="mt-3 text-xs text-muted">Ask questions to get information. You speak first and lead the conversation.</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Brouillon : notez vos idées de questions…"
                className="mt-4 h-32 w-full resize-none rounded-2xl border border-line bg-well p-3 text-sm outline-none focus:border-accent"
              />
              {phase === "t2prep" && (
                <button className="btn btn-primary mt-3 w-full" disabled={clockPending} onClick={() => advance("t2")}>
                  I&apos;m ready, start the conversation
                </button>
              )}
            </div>
          )}

          {phase === "t3" && !clockPending && (
            <div className="glass grain rounded-3xl p-6">
              <p className="eyebrow">Sujet · Tâche 3</p>
              <p className="mt-3 leading-relaxed">{task3}</p>
              <p className="mt-3 text-xs text-muted">Give your opinion, justify it with examples and try to convince the examiner.</p>
            </div>
          )}

          {phase === "intro" && (
            <p className="px-2 text-sm text-muted">Listen to the examiner, then answer. The épreuve moves on by itself when each task&apos;s time is up.</p>
          )}

          {stage === "saving" ? (
            <p className="px-2 text-sm text-muted">Saving your recording…</p>
          ) : stage === "error" ? (
            <p className="rounded-2xl border border-ko-line bg-ko-soft px-4 py-3 text-sm text-ko">
              {error}{" "}
              <a className="underline" href={`/practice/eo/review/${attemptId}`}>
                See what was recorded
              </a>
            </p>
          ) : phase !== "end" && (
            <div className="px-2">
              {confirmEnd ? (
                <div className="flex items-center gap-3 text-sm">
                  <span>End the épreuve now?</span>
                  <button className="btn btn-primary" onClick={() => advance("end")}>Yes, end</button>
                  <button className="btn btn-glass" onClick={() => setConfirmEnd(false)}>Cancel</button>
                </div>
              ) : (
                <button className="text-sm text-muted underline" onClick={() => setConfirmEnd(true)}>
                  End the épreuve
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
