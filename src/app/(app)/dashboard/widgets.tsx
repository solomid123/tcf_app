import Link from "next/link";
import { Donut } from "@/components/charts/Donut";
import { ParticleWave } from "@/components/charts/ParticleWave";
import type { buildStats } from "@/lib/stats";
import { formatScore, nclcLabel, skillMeta } from "@/lib/tcf";

type Stats = ReturnType<typeof buildStats>;

function Delta({ value, suffix = " pts" }: { value: number | null; suffix?: string }) {
  if (value == null) return <span className="text-muted">No comparison yet</span>;
  const up = value >= 0;
  return (
    <span className={up ? "text-success" : "text-danger"}>
      {up ? "↑" : "↓"} {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

export function StatCard({ title, value, sub, badge, wave }: {
  title: string; value: string; sub: React.ReactNode; badge?: string;
  wave: { values: number[]; seed: number; from?: string; to?: string };
}) {
  return (
    <div className="glass grain relative flex h-56 flex-col overflow-hidden rounded-3xl p-6">
      <div className="flex items-start justify-between">
        <h3 className="text-sm text-fg/80">{title}</h3>
        {badge && (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-4xl tracking-tight">{value}</p>
      <p className="mt-1 text-xs">{sub}</p>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24">
        <ParticleWave {...wave} />
      </div>
    </div>
  );
}

function Legend({ rows }: { rows: { code: string; color: string; title: string; left: string; right: string }[] }) {
  return (
    <ul className="w-full space-y-4">
      {rows.map((r) => (
        <li key={r.code} className="flex items-start gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
          <div className="flex-1">
            <p className="text-sm">{r.title}</p>
            <p className="text-xs text-muted">{r.left}</p>
          </div>
          <span className="text-sm tabular-nums text-fg/80">{r.right}</span>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass grain rounded-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const pill = "rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:text-fg";

export function PracticeDonut({ stats }: { stats: Stats }) {
  const { total, bySkill } = stats.practice;
  return (
    <Panel title="Practice by skill" action={<Link href="/practice" className={pill}>Practise →</Link>}>
      <div className="flex flex-col items-center gap-8 sm:flex-row">
        <Donut
          segments={bySkill.map((b) => ({ label: b.skill, value: b.count, color: skillMeta(b.skill).color }))}
          center={String(total)}
          caption={total === 1 ? "session" : "sessions"}
        />
        <Legend
          rows={bySkill.map((b) => ({
            code: b.skill,
            color: skillMeta(b.skill).color,
            title: skillMeta(b.skill).name,
            left: b.avg == null ? "Not practised yet" : `Avg ${b.avg.toFixed(0)}% · ${b.count} session${b.count === 1 ? "" : "s"}`,
            right: total ? `${((b.count / total) * 100).toFixed(0)}%` : "—",
          }))}
        />
      </div>
    </Panel>
  );
}

export function ExamDonut({ stats }: { stats: Stats }) {
  const { latestExam, estimatedNclc, skillsCovered } = stats.exams;
  return (
    <Panel title="Latest exam results" action={<Link href="/exams" className={pill}>Sit an exam →</Link>}>
      <div className="flex flex-col items-center gap-8 sm:flex-row">
        <Donut
          segments={latestExam.map((l) => ({ label: l.skill, value: l.attempt?.nclc ?? 0, color: skillMeta(l.skill).color }))}
          center={estimatedNclc == null ? "—" : `NCLC ${nclcLabel(estimatedNclc)}`}
          caption={skillsCovered === 4 ? "Estimated level" : `${skillsCovered}/4 skills tested`}
        />
        <Legend
          rows={latestExam.map((l) => ({
            code: l.skill,
            color: skillMeta(l.skill).color,
            title: skillMeta(l.skill).name,
            left: l.attempt ? `Score ${formatScore(l.skill, l.attempt.score)}` : "No exam yet",
            right: l.attempt ? `NCLC ${nclcLabel(l.attempt.nclc)}` : "—",
          }))}
        />
      </div>
    </Panel>
  );
}

export { Delta, Panel };
