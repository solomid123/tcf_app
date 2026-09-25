import Link from "next/link";
import { getSession } from "@/lib/session";
import { buildStats, timeAgo, type Attempt } from "@/lib/stats";
import { formatScore, nclcLabel, skillMeta } from "@/lib/tcf";
import { Delta, ExamDonut, Panel, PracticeDonut, StatCard } from "./widgets";

export const metadata = { title: "Dashboard — TCF Prep" };

function daysUntil(date: string) {
  const ms = new Date(`${date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86_400_000);
}

export default async function DashboardPage() {
  const { supabase, user, profile } = await getSession();
  const { data } = await supabase
    .from("attempts")
    .select("id, mode, skill, score, percent, nclc, sitting_id, completed_at")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(300);

  const stats = buildStats((data ?? []) as Attempt[]);
  const name = profile?.full_name?.split(" ")[0] || user.email?.split("@")[0];
  const days = profile?.exam_date ? daysUntil(profile.exam_date) : null;
  const target = profile?.target_nclc ?? null;
  const est = stats.exams.estimatedNclc;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Tableau de bord</p>
          <h1 className="mt-3 text-4xl md:text-5xl">Bonjour, <span className="text-chrome">{name}</span></h1>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {target ? <span className="glass rounded-full px-4 py-1.5">Target · NCLC {nclcLabel(target)}</span> : null}
          {days !== null && (
            <span className="glass rounded-full px-4 py-1.5">
              {days > 0 ? `Exam in ${days} day${days === 1 ? "" : "s"}` : days === 0 ? "Exam today — bonne chance !" : "Exam date passed"}
            </span>
          )}
          {!target && days === null && (
            <Link href="/settings#goals" className="glass rounded-full px-4 py-1.5 text-muted hover:text-fg">Set your exam goals →</Link>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <StatCard
          title="Estimated NCLC"
          value={est == null ? "—" : nclcLabel(est)}
          badge={est != null ? "Live" : undefined}
          sub={
            est == null ? <span className="text-muted">Sit an exam to get your level</span>
            : target ? <span className={est >= target ? "text-emerald-300" : "text-amber-200"}>{est >= target ? "✓ Target reached" : `${target - est} level${target - est === 1 ? "" : "s"} to target`}</span>
            : <span className="text-muted">Weakest skill from latest exams</span>
          }
          wave={{ values: stats.exams.series, seed: 3, from: "#6366f1", to: "#6ee7b7" }}
        />
        <StatCard
          title="Practice score · 30 days"
          value={stats.practice.avg30 == null ? "—" : `${stats.practice.avg30.toFixed(1)}%`}
          sub={<><Delta value={stats.practice.delta} />{stats.practice.delta != null && <span className="text-muted"> vs previous 30 days</span>}</>}
          wave={{ values: stats.practice.series, seed: 7 }}
        />
        <StatCard
          title="Exam sittings"
          value={String(stats.exams.sittings)}
          sub={<><Delta value={stats.exams.delta} />{stats.exams.delta != null && <span className="text-muted"> last vs previous épreuve</span>}</>}
          wave={{ values: stats.exams.series, seed: 11, from: "#60a5fa", to: "#c4b5fd" }}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <PracticeDonut stats={stats} />
        <ExamDonut stats={stats} />
      </div>

      <div className="mt-5">
        <Panel title="Recent activity">
          {stats.recent.length === 0 ? (
            <div className="py-6 text-center text-muted">
              Nothing here yet. <Link href="/practice" className="text-fg underline-offset-4 hover:underline">Start your first practice session</Link>.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {stats.recent.map((a) => (
                <li key={a.id} className="flex items-center gap-4 py-3 text-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs" style={{ background: `${skillMeta(a.skill).color}22`, color: skillMeta(a.skill).color }}>
                    {a.skill}
                  </span>
                  <div className="flex-1">
                    <p>{skillMeta(a.skill).name} <span className="text-muted">· {a.mode === "exam" ? "Exam" : "Practice"}</span></p>
                    <p className="text-xs text-muted">
                      {Number(a.percent).toFixed(0)}%{a.score != null && ` · ${formatScore(a.skill, a.score)}`}{a.nclc != null && ` · NCLC ${nclcLabel(a.nclc)}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted">{timeAgo(a.completed_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
