import Link from "next/link";
import { getSession } from "@/lib/session";
import { nclcFor, nclcLabel } from "@/lib/tcf";
import { StartButton } from "./StartButton";

export const metadata = { title: "Expression écrite — TCF Prep" };

const TASKS = [
  { n: "Tâche 1", t: "Message", d: "Describe and explain in an everyday situation: a form, an email, a note to neighbours.", words: "60–120 words" },
  { n: "Tâche 2", t: "Email or article", d: "Reply to an email or write for a blog or newsletter: tell, describe, give advice and justify.", words: "120–150 words" },
  { n: "Tâche 3", t: "Argumentative article", d: "Sum up two documents in your own words, then give and defend your own position.", words: "120–180 words" },
];

const STATUS: Record<string, string> = { writing: "In progress", submitted: "Being evaluated…", failed: "Not evaluated" };

export default async function EEPage({ searchParams }: PageProps<"/practice/ee">) {
  const { limit } = await searchParams;
  const { supabase, user } = await getSession();
  const { data: rows } = await supabase
    .from("ee_attempts")
    .select("id, status, score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const open = rows?.find((r) => r.status === "writing");

  return (
    <>
      <p className="eyebrow">Expression écrite</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl md:text-5xl"><span className="text-chrome">Writing épreuve</span></h1>
        <div className="sm:text-right">
          <StartButton label={open ? "Resume your épreuve" : "Start an épreuve"} />
          <p className="mt-2 text-xs text-muted">60 minutes, 3 tasks, like exam day.</p>
        </div>
      </div>
      <p className="mt-3 max-w-2xl text-muted">
        Write on the same kinds of supports as the real test, with a live word counter and a French accent keyboard. When you hand in your copy you get a score out of 20, your NCLC level, your texts corrected and a model answer for each task.
      </p>
      {limit && (
        <p className="mt-4 rounded-2xl border border-line bg-well px-4 py-3 text-sm text-muted">
          You&apos;ve used your épreuves for today. Come back tomorrow for a new one.
        </p>
      )}

      <div className="glass grain mt-8 grid rounded-3xl md:grid-cols-3">
        {TASKS.map((t, i) => (
          <div key={t.n} className={`p-7 ${i < 2 ? "border-b border-line md:border-b-0 md:border-r" : ""}`}>
            <p className="eyebrow">{t.n}</p>
            <p className="mt-2 text-lg">{t.t}</p>
            <p className="mt-1 text-sm text-muted">{t.d}</p>
            <p className="mt-4 text-xs text-muted">
              <span className="rounded-full border border-line px-3 py-1">{t.words}</span>
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">
        Official rules: respect the minimum and maximum word count of each task, do the tasks in order, stay on topic. A task that is missing, off-topic or far outside the word count can bring the whole copy down to « A1 non atteint ».
      </p>

      <h2 className="mt-12 text-xl">Your épreuves</h2>
      {rows?.length ? (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-3xl border border-line">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={r.status === "writing" ? `/practice/ee/${r.id}` : `/practice/ee/review/${r.id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-well"
              >
                <span className="text-sm">
                  {new Date(r.created_at).toLocaleDateString("en-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                {r.status === "graded" && r.score != null ? (
                  <span className="text-sm">
                    <b className="text-lg">{r.score}</b>
                    <span className="text-muted">/20 · NCLC {nclcLabel(nclcFor("EE", r.score))}</span>
                  </span>
                ) : (
                  <span className="text-sm text-muted">{STATUS[r.status] ?? r.status}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">No épreuve yet. Block out an hour and start your first one.</p>
      )}
    </>
  );
}
