"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { PublicItem } from "@/lib/bank";
import { Bullets } from "@/components/Bullets";
import { submitCO } from "../actions";

const LETTERS = ["A", "B", "C", "D"];
const DURATION = 35 * 60;
type Phase = "separator" | "playing" | "done";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function Bars({ active }: { active: boolean }) {
  return (
    <span className="flex h-5 items-end gap-[3px]" aria-hidden>
      {[0.55, 1, 0.7, 0.9, 0.45].map((h, i) => (
        <span
          key={i}
          className={`eq-bar w-[3px] rounded-full bg-accent ${active ? "eq-on" : ""}`}
          style={{ height: `${active ? h * 100 : 20}%`, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </span>
  );
}

export function Player({ setId, title, items }: { setId: string; title: string; items: PublicItem[] }) {
  const [started, setStarted] = useState(false);
  const [examConditions, setExamConditions] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => items.map(() => null));
  const [phase, setPhase] = useState<Phase>("separator");
  const [left, setLeft] = useState(DURATION);
  const [pending, startTransition] = useTransition();
  const audio = useRef<HTMLAudioElement | null>(null);
  const startedAt = useRef(0);
  const submitted = useRef(false);
  const answersRef = useRef(answers);

  const item = items[index];
  const last = index === items.length - 1;

  const submit = useCallback(
    (final: (number | null)[]) => {
      if (submitted.current) return;
      submitted.current = true;
      audio.current?.pause();
      startTransition(() => submitCO(setId, final, startedAt.current, examConditions));
    },
    [setId, examConditions],
  );

  // Play the separator chime, then the recording, whenever the question changes.
  useEffect(() => {
    if (!started) return;
    const el = (audio.current ??= new Audio());
    let cancelled = false;
    const playItem = () => {
      if (cancelled) return;
      if (!item.audio) return setPhase("done");
      setPhase("playing");
      el.onended = () => !cancelled && setPhase("done");
      el.src = item.audio;
      el.play().catch(() => !cancelled && setPhase("done"));
    };
    el.onended = playItem;
    el.src = "/audio/separator.mp3";
    el.play().catch(playItem);

    // Warm up the next question so it starts instantly.
    const upcoming = items[index + 1];
    if (upcoming?.audio) Object.assign(new Audio(), { preload: "auto", src: upcoming.audio });
    if (upcoming?.image) new Image().src = upcoming.image;

    return () => {
      cancelled = true;
      el.onended = null;
      el.pause();
    };
  }, [started, index, item, items]);

  // Épreuve timer: when it runs out, answers lock and the épreuve is submitted.
  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const remaining = DURATION - Math.floor((Date.now() - startedAt.current) / 1000);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(id);
        submit(answersRef.current);
      }
    }, 500);
    return () => clearInterval(id);
  }, [started, submit]);

  useEffect(() => {
    if (!started) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (!submitted.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [started]);

  const choose = (i: number) => {
    const nextAnswers = answers.map((v, j) => (j === index ? i : v));
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
  };
  const advance = () => {
    if (last) return submit(answers);
    setPhase("separator");
    setIndex((i) => i + 1);
  };
  const replay = () => {
    const el = audio.current;
    if (!el || !item.audio) return;
    el.onended = () => setPhase("done");
    el.src = item.audio;
    setPhase("playing");
    el.play().catch(() => setPhase("done"));
  };

  if (!started) {
    return (
      <div className="glass grain mx-auto max-w-2xl rounded-3xl p-8 md:p-10">
        <p className="eyebrow">Compréhension orale · {title}</p>
        <h1 className="mt-3 text-3xl md:text-4xl"><span className="text-chrome">Listening épreuve</span></h1>
        <p className="mt-3 text-muted">39 questions · 35 minutes · levels A1 → C2, in the order of the real TCF Canada.</p>
        <Bullets
          className="mt-7 text-fg/80"
          items={[
            "Each recording starts automatically after the chime.",
            "Questions 1–4: look at the picture and pick the sentence that fits the situation, what one of the characters is saying.",
            "Questions 5–7: pick the best reply among the four you hear.",
            "Questions 8–39: listen to the document, then answer the written question.",
            "You can't go back to a previous question.",
          ]}
        />
        <label className="mt-8 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-well p-4">
          <input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={examConditions} onChange={(e) => setExamConditions(e.target.checked)} />
          <span>
            <span className="block">Exam conditions</span>
            <span className="text-sm text-muted">Each recording is played once, like on exam day. Untick to allow replays.</span>
          </span>
        </label>
        <button
          className="btn btn-primary mt-8 w-full"
          onClick={() => {
            startedAt.current = Date.now();
            setStarted(true);
          }}
        >
          Start the épreuve
        </button>
        <p className="mt-3 text-center text-xs text-muted">Use headphones in a quiet room for the best experience.</p>
      </div>
    );
  }

  const chosen = answers[index];
  const listening = phase !== "done";
  const lowTime = left <= 5 * 60;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="glass sticky top-24 z-10 rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm">
            <span className="text-muted">Question</span> <span className="text-lg font-bold">{item.position}</span>
            <span className="text-muted"> / {items.length}</span>
          </p>
          <p className="hidden text-xs uppercase tracking-[0.2em] text-muted sm:block">Compréhension orale</p>
          <p className={`font-mono text-lg tabular-nums ${lowTime ? "text-danger" : ""}`} aria-label="Time left">{fmt(left)}</p>
        </div>
        <div className="mt-3 flex gap-[3px]">
          {items.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i < index ? "bg-accent/70" : i === index ? "bg-fg" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <div className="glass grain mt-5 rounded-3xl p-6 md:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-fg/80">{item.instruction}</p>
          <div className="flex items-center gap-3 rounded-full border border-line bg-well px-4 py-2 text-sm">
            <Bars active={listening} />
            <span className="text-muted">{phase === "separator" ? "Question suivante…" : phase === "playing" ? "Écoute en cours" : "Enregistrement terminé"}</span>
            {!examConditions && phase === "done" && (
              <button onClick={replay} className="text-accent underline-offset-4 hover:underline">Réécouter</button>
            )}
          </div>
        </div>

        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="Drawing for this question" className="mx-auto mt-7 aspect-[4/3] max-h-[46vh] w-full max-w-2xl rounded-2xl border border-line bg-white object-contain p-2 [width:auto]" />
        )}

        {item.question && <p className="mt-8 text-xl leading-snug md:text-2xl">{item.question}</p>}

        <div role="radiogroup" aria-label="Answers" className={`mt-7 grid gap-3 ${item.options ? "" : "grid-cols-4"}`}>
          {LETTERS.map((L, i) => {
            const on = chosen === i;
            return (
              <button
                key={L}
                role="radio"
                aria-checked={on}
                onClick={() => choose(i)}
                disabled={pending}
                className={`flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition ${
                  on ? "border-accent bg-accent/15 shadow-[0_0_0_1px_var(--accent)]" : "border-line bg-well hover:bg-tint/50"
                } ${item.options ? "" : "justify-center"}`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${on ? "bg-accent text-bg" : "bg-tint text-fg"}`}>{L}</span>
                {item.options && <span className="leading-snug">{item.options[i]}</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-6">
          <p className="text-sm text-muted">{chosen == null ? "No answer selected" : `Answer ${LETTERS[chosen]} selected`}</p>
          <button className="btn btn-primary" onClick={advance} disabled={pending || (examConditions && listening && chosen == null)}>
            {pending ? "Scoring…" : last ? "Finish the épreuve" : "Valider →"}
          </button>
        </div>
      </div>
    </div>
  );
}
