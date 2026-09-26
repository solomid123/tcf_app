import Link from "next/link";
import { notFound } from "next/navigation";
import { bankUrl, loadSet, type Level } from "@/lib/bank";
import { getSession } from "@/lib/session";
import { nclcLabel } from "@/lib/tcf";

export const metadata = { title: "Results — Compréhension orale — TCF Prep" };

const LETTERS = ["A", "B", "C", "D"];
const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default async function COReviewPage({ params }: PageProps<"/practice/co/review/[attemptId]">) {
  const { attemptId } = await params;
  const { supabase } = await getSession();
  // RLS: users can only read their own attempts.
  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, set_id, score, nclc, correct, total, duration_seconds, details, completed_at")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt?.set_id) notFound();
  const loaded = await loadSet(attempt.set_id);
  if (!loaded) notFound();

  const answers: (number | null)[] = attempt.details?.answers ?? [];
  const items = loaded.items;
  const byLevel = LEVELS.map((lv) => {
    const its = items.filter((it) => it.level === lv);
    return { lv, total: its.length, ok: its.filter((it) => answers[it.position - 1] === it.answer).length };
  });
  const mins = Math.floor((attempt.duration_seconds ?? 0) / 60);
  const secs = (attempt.duration_seconds ?? 0) % 60;

  return (
    <>
      <p className="eyebrow">Compréhension orale · {loaded.set.title}</p>
      <h1 className="mt-3 text-4xl md:text-5xl"><span className="text-chrome">Your results</span></h1>

      <div className="mt-10 grid gap-5 md:grid-cols-[1.1fr_1fr]">
        <div className="glass grain rounded-3xl p-8">
          <p className="text-sm text-muted">TCF score</p>
          <p className="mt-1 text-6xl font-bold">
            {Math.round(Number(attempt.score))}
            <span className="text-2xl text-muted">/699</span>
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 text-center">
            {[
              ["NCLC", nclcLabel(attempt.nclc)],
              ["Correct", `${attempt.correct}/${attempt.total}`],
              ["Time", `${mins}:${String(secs).padStart(2, "0")}`],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{k}</p>
                <p className="mt-1 text-xl">{v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass grain rounded-3xl p-8">
          <p className="text-sm text-muted">By level</p>
          <div className="mt-5 space-y-3">
            {byLevel.map(({ lv, ok, total }) => (
              <div key={lv} className="flex items-center gap-4">
                <span className="w-8 text-sm font-bold">{lv}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${total ? (ok / total) * 100 : 0}%` }} />
                </div>
                <span className="w-12 text-right text-sm tabular-nums text-muted">{ok}/{total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/practice/co/${loaded.set.id}`} className="btn btn-glass">Retake this série</Link>
        <Link href="/practice/co" className="btn btn-glass">All séries</Link>
      </div>

      <h2 className="mt-14 text-2xl">Question review</h2>
      <p className="mt-1 text-muted">Listen again with the transcript and see why each answer is right.</p>

      <div className="mt-6 space-y-4">
        {items.map((it) => {
          const mine = answers[it.position - 1];
          const ok = mine === it.answer;
          return (
            <details key={it.id} className="glass group rounded-3xl p-6 open:pb-8">
              <summary className="flex cursor-pointer list-none items-center gap-4">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${ok ? "bg-success/20 text-success" : "bg-danger/15 text-danger"}`}>
                  {ok ? "✓" : "✗"}
                </span>
                <span className="flex-1">
                  <span className="font-bold">Question {it.position}</span>
                  <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs text-muted">{it.level}</span>
                  <span className="ml-2 text-sm text-muted">
                    {mine == null ? "No answer" : `You: ${LETTERS[mine]}`} · Correct: {LETTERS[it.answer]}
                  </span>
                </span>
                <span className="text-muted transition group-open:rotate-180">⌄</span>
              </summary>

              <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1fr]">
                <div>
                  {it.image_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bankUrl(it.image_path)!} alt="" className="mb-4 aspect-[4/3] w-full rounded-2xl border border-line object-cover" />
                  )}
                  {it.audio_path && <audio controls preload="none" src={bankUrl(it.audio_path)!} className="w-full" />}
                  {it.question && <p className="mt-5 text-lg">{it.question}</p>}
                  <ul className="mt-4 space-y-2">
                    {it.options.map((o, i) => (
                      <li
                        key={i}
                        className={`flex gap-3 rounded-xl border px-3 py-2 text-sm ${
                          i === it.answer ? "border-success/50 bg-success/10" : i === mine ? "border-danger/40 bg-danger/10" : "border-line"
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
            </details>
          );
        })}
      </div>
    </>
  );
}
