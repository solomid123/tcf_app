import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { nclcLabel } from "@/lib/tcf";
import { Waiting } from "./Waiting";

export const metadata = { title: "Expression orale · Results | TCF Prep" };

type Line = { phase: string; role: "candidate" | "examiner"; text: string };
type Crit = { score: number; comment: string };
type Evaluation = {
  overall: number;
  nclc: number;
  level: string;
  summary: string;
  tasks: { task: number; score: number; level: string; comment: string; strengths: string[]; improvements: string[] }[];
  criteria: Record<"realisation" | "lexique" | "grammaire" | "coherence" | "aisance", Crit>;
  corrections: { said: string; better: string; why: string }[];
  stats: { words: number; secs: number; wpm: number | null }[];
};

const TASK_NAMES = ["Entretien dirigé", "Exercice en interaction", "Point de vue"];
const CRITERIA: [keyof Evaluation["criteria"], string][] = [
  ["realisation", "Task completion"],
  ["lexique", "Vocabulary"],
  ["grammaire", "Grammar"],
  ["coherence", "Coherence"],
  ["aisance", "Fluency & pronunciation"],
];
const PHASE_TASK: Record<string, number> = { intro: 1, t1: 1, t2prep: 2, t2: 2, t3: 3, end: 3 };

export default async function EOReviewPage({ params }: PageProps<"/practice/eo/review/[attemptId]">) {
  const { attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const { supabase, user } = await getSession();
  // RLS only lets users read their own simulations.
  const { data: a } = await supabase
    .from("eo_attempts")
    .select("id, user_id, status, transcript, evaluation, created_at, t2:task2_id(prompt), t3:task3_id(prompt)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!a || a.user_id !== user.id) notFound();

  const one = <T,>(x: T | T[]) => (Array.isArray(x) ? x[0] : x);
  const sujets = ["", one(a.t2)?.prompt ?? "", one(a.t3)?.prompt ?? ""];
  const lines = ((a.transcript ?? []) as Line[]).filter((l) => l.text);
  const ev = a.evaluation as Evaluation | null;
  const date = new Date(a.created_at).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <Link href="/practice/eo" className="text-sm text-muted hover:text-fg">← Expression orale</Link>
      <p className="eyebrow mt-6">Expression orale · {date}</p>
      <h1 className="mt-3 text-4xl md:text-5xl"><span className="text-chrome">Your results</span></h1>

      {(a.status === "recorded" || a.status === "live") && <Waiting />}
      {a.status === "created" && (
        <p className="mt-8 text-muted">
          This simulation hasn&apos;t started yet. <Link className="underline" href={`/practice/eo/${a.id}`}>Start it</Link>
        </p>
      )}
      {a.status === "failed" && (
        <div className="glass grain mt-8 max-w-2xl rounded-3xl p-8">
          <p className="text-lg">This simulation couldn&apos;t be evaluated.</p>
          <p className="mt-2 text-sm text-muted">
            We didn&apos;t record enough speech to grade it: the épreuve was ended early, the connection dropped or the microphone didn&apos;t pick up your voice. It doesn&apos;t count as a TCF result.
          </p>
          <Link href="/practice/eo" className="btn btn-primary mt-5 inline-flex">Try another simulation</Link>
        </div>
      )}

      {a.status === "graded" && ev && (
        <>
          <div className="glass grain mt-8 grid gap-6 rounded-3xl p-8 md:grid-cols-[auto_1fr] md:items-center">
            <div className="flex items-end gap-6">
              <div>
                <p className="text-6xl font-bold tabular-nums">{ev.overall}<span className="text-2xl text-muted">/20</span></p>
                <p className="mt-1 text-sm text-muted">Estimated score</p>
              </div>
              <div className="border-l border-line pl-6">
                <p className="text-3xl font-bold">NCLC {nclcLabel(ev.nclc)}</p>
                <p className="mt-1 text-sm text-muted">CEFR {ev.level}</p>
              </div>
            </div>
            <p className="leading-relaxed text-fg/85 md:border-l md:border-line md:pl-6">{ev.summary}</p>
          </div>

          <h2 className="mt-12 text-xl">By criterion</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {CRITERIA.map(([k, label]) => {
              const c = ev.criteria[k];
              return (
                <div key={k} className="rounded-3xl border border-line p-5">
                  <p className="text-sm text-muted">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{c.score}<span className="text-sm text-muted">/20</span></p>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-well">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, c.score * 5)}%` }} />
                  </span>
                  <p className="mt-3 text-sm text-fg/80">{c.comment}</p>
                </div>
              );
            })}
          </div>

          <h2 className="mt-12 text-xl">By task</h2>
          <div className="mt-4 space-y-4">
            {ev.tasks.map((t) => {
              const s = ev.stats?.[t.task - 1];
              return (
                <div key={t.task} className="glass grain rounded-3xl p-7">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p>
                      <span className="eyebrow">Tâche {t.task}</span>
                      <span className="ml-3 text-lg">{TASK_NAMES[t.task - 1]}</span>
                    </p>
                    <p className="text-sm">
                      <b className="text-xl">{t.score}</b>
                      <span className="text-muted">/20 · {t.level}</span>
                    </p>
                  </div>
                  {sujets[t.task - 1] && <p className="mt-3 text-sm italic text-muted">« {sujets[t.task - 1]} »</p>}
                  <p className="mt-3 text-fg/85">{t.comment}</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-ok">Strengths</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-fg/80">
                        {t.strengths.map((x) => <li key={x}>{x}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm text-accent">To work on</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-fg/80">
                        {t.improvements.map((x) => <li key={x}>{x}</li>)}
                      </ul>
                    </div>
                  </div>
                  {s && (
                    <p className="mt-4 text-xs text-muted">
                      {s.words} words · {s.secs} s of speech{s.wpm ? ` · ${s.wpm} words/min` : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {ev.corrections.length > 0 && (
            <>
              <h2 className="mt-12 text-xl">Corrections</h2>
              <ul className="mt-4 divide-y divide-line overflow-hidden rounded-3xl border border-line">
                {ev.corrections.map((c, i) => (
                  <li key={i} className="p-5">
                    <p className="text-sm text-ko line-through decoration-ko/50">{c.said}</p>
                    <p className="mt-1 text-ok">{c.better}</p>
                    <p className="mt-1 text-sm text-muted">{c.why}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-6 text-xs text-muted">
            This is an estimate from an AI jury based on the TCF Canada criteria, not an official result.
          </p>
        </>
      )}

      {lines.length > 0 && (
        <details className="mt-12 rounded-3xl border border-line p-6">
          <summary className="cursor-pointer text-lg">Transcript</summary>
          <div className="mt-4 space-y-3">
            {lines.map((l, i) => (
              <div key={i}>
                {(i === 0 || PHASE_TASK[lines[i - 1].phase] !== PHASE_TASK[l.phase]) && (
                  <p className="eyebrow mb-2 mt-5">Tâche {PHASE_TASK[l.phase]}</p>
                )}
                <p className={`text-sm ${l.role === "candidate" ? "text-fg" : "text-muted"}`}>
                  <b>{l.role === "candidate" ? "You" : "Examiner"}:</b> {l.text}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
