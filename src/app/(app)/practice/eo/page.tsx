import Link from "next/link";
import { getSession } from "@/lib/session";
import { nclcFor, nclcLabel } from "@/lib/tcf";
import { StartButton } from "./StartButton";

export const metadata = { title: "Expression orale — TCF Prep" };

const TASKS = [
  { n: "Tâche 1", t: "Entretien dirigé", d: "The examiner asks about you: family, studies, work, hobbies, plans.", time: "2 min", prep: "No preparation" },
  { n: "Tâche 2", t: "Exercice en interaction", d: "You get a situation and lead the conversation by asking the examiner questions.", time: "3 min 30", prep: "2 min preparation" },
  { n: "Tâche 3", t: "Point de vue", d: "You argue your opinion on a topic, with examples, and try to convince.", time: "4 min 30", prep: "No preparation" },
];

const STATUS: Record<string, string> = {
  created: "Not started",
  live: "In progress",
  recorded: "Being evaluated…",
  failed: "Not evaluated",
};

export default async function EOPage({ searchParams }: PageProps<"/practice/eo">) {
  const { limit } = await searchParams;
  const { supabase, user } = await getSession();
  const { data: rows } = await supabase
    .from("eo_attempts")
    .select("id, status, score, created_at")
    .eq("user_id", user.id)
    .neq("status", "created")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <>
      <p className="eyebrow">Expression orale</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl md:text-5xl"><span className="text-chrome">Speaking simulation</span></h1>
        <div className="sm:text-right">
          <StartButton />
          <p className="mt-2 text-xs text-muted">A live 13-minute interview with a Québec examiner.</p>
        </div>
      </div>
      <p className="mt-3 max-w-2xl text-muted">
        Speak with the examiner exactly as on exam day: three tasks, real timings, no second take. When you finish you get a score out of 20, your NCLC level and detailed feedback.
      </p>
      {limit && (
        <p className="mt-4 rounded-2xl border border-line bg-well px-4 py-3 text-sm text-muted">
          You&apos;ve used your simulations for today. Come back tomorrow for a new one.
        </p>
      )}

      <div className="glass grain mt-8 grid rounded-3xl md:grid-cols-3">
        {TASKS.map((t, i) => (
          <div key={t.n} className={`p-7 ${i < 2 ? "border-b border-line md:border-b-0 md:border-r" : ""}`}>
            <p className="eyebrow">{t.n}</p>
            <p className="mt-2 text-lg">{t.t}</p>
            <p className="mt-1 text-sm text-muted">{t.d}</p>
            <p className="mt-4 flex gap-2 text-xs text-muted">
              <span className="rounded-full border border-line px-3 py-1">{t.time}</span>
              <span className="rounded-full border border-line px-3 py-1">{t.prep}</span>
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-xl">Your simulations</h2>
      {rows?.length ? (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-3xl border border-line">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/practice/eo/review/${r.id}`} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-well">
                <span className="text-sm">
                  {new Date(r.created_at).toLocaleDateString("en-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                {r.status === "graded" && r.score != null ? (
                  <span className="text-sm">
                    <b className="text-lg">{r.score}</b>
                    <span className="text-muted">/20 · NCLC {nclcLabel(nclcFor("EO", r.score))}</span>
                  </span>
                ) : (
                  <span className="text-sm text-muted">{STATUS[r.status] ?? r.status}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">No simulation yet. Find a quiet place, put on headphones and start your first one.</p>
      )}
    </>
  );
}
