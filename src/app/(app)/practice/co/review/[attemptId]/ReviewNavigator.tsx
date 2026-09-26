"use client";

import { useState } from "react";
import type { Level } from "@/lib/bank";

const LETTERS = ["A", "B", "C", "D"];

export type ReviewItem = {
  id: string;
  position: number;
  level: Level;
  question: string | null;
  options: string[];
  answer: number;
  explanation: string;
  transcript: { speaker: string; role: string; text: string }[];
  image: string | null;
  audio: string | null;
};

export function ReviewNavigator({ items, answers }: { items: ReviewItem[]; answers: (number | null)[] }) {
  const [sel, setSel] = useState(0);
  const it = items[sel];
  const mine = answers[it.position - 1] ?? null;
  const status = (i: number) => {
    const a = answers[items[i].position - 1];
    return a == null ? "skipped" : a === items[i].answer ? "ok" : "ko";
  };

  return (
    <div className="glass grain mt-6 rounded-3xl p-6 md:p-8">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Questions">
        {items.map((q, i) => {
          const s = status(i);
          return (
            <button
              key={q.id}
              role="tab"
              aria-selected={i === sel}
              aria-label={`Question ${q.position}: ${s === "ok" ? "correct" : s === "ko" ? "wrong" : "no answer"}`}
              onClick={() => setSel(i)}
              className={`grid h-8 w-8 place-items-center rounded-md text-xs font-bold tabular-nums transition ${
                s === "ok" ? "border border-ok-line bg-ok-soft text-ok" : s === "ko" ? "border border-ko-line bg-ko-soft text-ko" : "border border-line bg-well text-muted"
              } ${i === sel ? "ring-2 ring-accent ring-offset-2 ring-offset-transparent" : "hover:opacity-80"}`}
            >
              {q.position}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-5 text-xs text-muted">
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-ok-line bg-ok-soft" /> Correct</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-ko-line bg-ko-soft" /> Wrong</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-line bg-well" /> No answer</span>
      </div>

      <div className="mt-7 border-t border-line pt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            <span className="text-xl font-bold">Question {it.position}</span>
            <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs text-muted">{it.level}</span>
            <span className="ml-3 text-sm text-muted">
              {mine == null ? "No answer" : `You: ${LETTERS[mine]}`} · Correct: {LETTERS[it.answer]}
            </span>
          </p>
          <div className="flex gap-2">
            <button className="btn btn-glass px-4 py-2 text-sm" disabled={sel === 0} onClick={() => setSel(sel - 1)}>← Previous</button>
            <button className="btn btn-glass px-4 py-2 text-sm" disabled={sel === items.length - 1} onClick={() => setSel(sel + 1)}>Next →</button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            {it.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.image} alt="Drawing for this question" className="mb-4 aspect-[4/3] w-full rounded-2xl border border-line bg-white object-contain p-2" />
            )}
            {it.audio && <audio key={it.id} controls preload="none" src={it.audio} className="w-full" />}
            {it.question && <p className="mt-5 text-lg">{it.question}</p>}
            <ul className="mt-4 space-y-2">
              {it.options.map((o, i) => (
                <li
                  key={i}
                  className={`flex gap-3 rounded-xl border px-3 py-2 text-sm ${
                    i === it.answer ? "border-ok-line bg-ok-soft" : i === mine ? "border-ko-line bg-ko-soft" : "border-line"
                  }`}
                >
                  <span className="font-bold">{LETTERS[i]}</span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            {it.transcript.length > 0 && (
              <>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Transcript</p>
                <div className="mt-3 space-y-2 rounded-2xl bg-well p-4 text-sm leading-relaxed">
                  {it.transcript.map((t, i) => (
                    <p key={i}>
                      <span className="text-muted">{t.role || t.speaker} : </span>
                      {t.text}
                    </p>
                  ))}
                </div>
              </>
            )}
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-muted">Explanation</p>
            <p className="mt-2 text-sm leading-relaxed text-fg/85">{it.explanation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
