import Link from "next/link";
import { notFound } from "next/navigation";
import { Waiting } from "@/components/Waiting";
import { countWords, EE_TASK_RANGE, msSince, normalizeAnswers, taskTexts, type EESujet } from "@/lib/ee";
import type { EEEvaluation } from "@/lib/ee-grade";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { nclcLabel } from "@/lib/tcf";
import { regradeEE } from "../../actions";

export const metadata = { title: "Expression écrite · Results | TCF Prep" };
export const maxDuration = 300;

const TASK_NAMES = ["Message", "Email or article", "Argumentative article"];
const CRITERIA: [keyof EEEvaluation["criteria"], string][] = [
  ["realisation", "Task completion"],
  ["lexique", "Vocabulary"],
  ["grammaire", "Grammar"],
  ["orthographe", "Spelling"],
  ["coherence", "Coherence"],
];

export default async function EEReviewPage({ params }: PageProps<"/practice/ee/review/[attemptId]">) {
  const { attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const { user } = await getSession();
  // Sujets are server-only (no RLS policy), so read with the admin client after checking ownership.
  const { data: a } = await createAdminClient()
    .from("ee_attempts")
    .select("id, user_id, status, answers, evaluation, created_at, submitted_at, t1:task1_id(id, task, prompt, sheet, documents), t2:task2_id(id, task, prompt, sheet, documents), t3:task3_id(id, task, prompt, sheet, documents)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!a || a.user_id !== user.id) notFound();

  const one = <T,>(x: T | T[]) => (Array.isArray(x) ? x[0] : x);
  const sujets = [one(a.t1), one(a.t2), one(a.t3)] as unknown as EESujet[];
  const texts = taskTexts(normalizeAnswers(a.answers));
  const ev = a.evaluation as EEEvaluation | null;
  const date = new Date(a.created_at).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" });
  const stuck = a.status === "submitted" && msSince(a.submitted_at) > 5 * 60_000;
  const retry = (
    <form action={regradeEE.bind(null, a.id)}>
      <button className="btn btn-primary mt-5">Retry the evaluation</button>
    </form>
  );

  return (
    <>
      <Link href="/practice/ee" className="text-sm text-muted hover:text-fg">← Expression écrite</Link>
      <p className="eyebrow mt-6">Expression écrite · {date}</p>
      <h1 className="mt-3 text-4xl md:text-5xl"><span className="text-chrome">Your results</span></h1>

      {a.status === "writing" && (
        <p className="mt-8 text-muted">
          This épreuve is still in progress. <Link className="underline" href={`/practice/ee/${a.id}`}>Go back to it</Link>
        </p>
      )}
      {a.status === "submitted" && (stuck ? (
        <div className="glass grain mt-8 max-w-2xl rounded-3xl p-8">
          <p className="text-lg">The evaluation is taking too long.</p>
          {retry}
        </div>
      ) : (
        <Waiting label="The jury is correcting your copy…" />
      ))}
      {a.status === "failed" && (
        <div className="glass grain mt-8 max-w-2xl rounded-3xl p-8">
          <p className="text-lg">Your copy couldn&apos;t be evaluated.</p>
          <p className="mt-2 text-sm text-muted">Something went wrong on our side. Your texts are saved; you can try the evaluation again.</p>
          {retry}
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
        </>
      )}

      {(a.status === "graded" || a.status === "submitted" || a.status === "failed") && (
        <>
          <h2 className="mt-12 text-xl">By task</h2>
          <div className="mt-4 space-y-4">
            {sujets.map((s, i) => {
              const t = ev?.tasks.find((x) => x.task === i + 1);
              const [min, max] = EE_TASK_RANGE[(i + 1) as 1 | 2 | 3];
              const n = countWords(texts[i]);
              const ok = n >= min && n <= max;
              return (
                <div key={s.id} className="glass grain rounded-3xl p-7">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p>
                      <span className="eyebrow">Tâche {i + 1}</span>
                      <span className="ml-3 text-lg">{TASK_NAMES[i]}</span>
                    </p>
                    {t && (
                      <p className="text-sm">
                        <b className="text-xl">{t.score}</b>
                        <span className="text-muted">/20 · {t.level}</span>
                      </p>
                    )}
                  </div>
                  <p className="mt-3 text-sm italic text-muted">{s.prompt}</p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="flex justify-between text-sm">
                        <span>Your text</span>
                        <span className={ok ? "text-ok" : "text-ko"}>{n} mots ({min}–{max})</span>
                      </p>
                      <p className="mt-2 whitespace-pre-line rounded-2xl border border-line p-4 text-sm leading-relaxed">
                        {texts[i].trim() || <span className="text-muted">Nothing written.</span>}
                      </p>
                    </div>
                    {t?.corrected && (
                      <div>
                        <p className="text-sm text-ok">Corrected</p>
                        <p className="mt-2 whitespace-pre-line rounded-2xl border border-ok-line bg-ok-soft p-4 text-sm leading-relaxed">{t.corrected}</p>
                      </div>
                    )}
                  </div>

                  {t && (
                    <>
                      <p className="mt-5 text-fg/85">{t.comment}</p>
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
                      <details className="mt-5 rounded-2xl border border-line p-4">
                        <summary className="cursor-pointer text-sm">Model answer ({countWords(t.model)} mots)</summary>
                        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg/85">{t.model}</p>
                      </details>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {ev && ev.corrections.length > 0 && (
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
      {ev && <p className="mt-6 text-xs text-muted">This is an estimate from an AI jury based on the TCF Canada criteria, not an official result.</p>}
    </>
  );
}
