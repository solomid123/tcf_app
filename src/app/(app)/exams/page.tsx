import { TrafficLights } from "@/components/TrafficLights";
import { getSession } from "@/lib/session";
import { formatScore, nclcLabel, SKILL_CODES, SKILLS, type Skill } from "@/lib/tcf";

export const metadata = { title: "Exams — TCF Prep" };

const TOTAL_MIN = SKILLS.reduce((s, x) => s + x.minutes, 0);
const rules = [
  "Strict timer per épreuve — answers lock when time runs out",
  "No going back to previous questions in CO and CE",
  "Official question counts and A1 → C2 difficulty curve",
  "Score on the TCF scale + NCLC level for each skill",
];

type SittingRow = {
  id: string;
  status: "in_progress" | "completed" | "abandoned";
  overall_nclc: number | null;
  started_at: string;
  attempts: { skill: Skill; score: number | null; nclc: number | null }[];
};

export default async function ExamsPage() {
  const { supabase, user } = await getSession();
  const { data } = await supabase
    .from("exam_sittings")
    .select("id, status, overall_nclc, started_at, attempts(skill, score, nclc)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(20);
  const sittings = (data ?? []) as SittingRow[];

  return (
    <>
      <p className="eyebrow">Examens blancs</p>
      <h1 className="mt-3 text-4xl md:text-5xl"><span className="text-chrome">Mock exams</span></h1>
      <p className="mt-3 max-w-xl text-muted">Sit the TCF Canada under real conditions and get an estimated NCLC for every skill.</p>

      {/* Full exam */}
      <section className="glass grain mt-10 overflow-hidden rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <TrafficLights />
          <span className="text-sm text-muted">Full sitting · {Math.floor(TOTAL_MIN / 60)} h {TOTAL_MIN % 60} min</span>
          <span className="w-[52px]" />
        </div>
        <div className="grid gap-10 p-8 md:grid-cols-[1.1fr_1fr] md:p-12">
          <div>
            <h2 className="text-3xl">Complete TCF Canada</h2>
            <p className="mt-3 text-muted">All four épreuves back to back, in official order.</p>
            <ul className="mt-6 space-y-2.5 text-sm text-fg/80">
              {rules.map((r) => <li key={r}>— {r}</li>)}
            </ul>
            <button disabled className="btn btn-primary mt-8 cursor-not-allowed opacity-60">Start full exam · coming soon</button>
          </div>
          <ol className="space-y-3">
            {SKILLS.map((s, i) => (
              <li key={s.code} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <span className="text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                <span className="flex-1">{s.name}</span>
                <span className="text-sm text-muted">{s.q} · {s.t}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Single épreuves */}
      <h2 className="mt-14 text-2xl">Single épreuve</h2>
      <p className="mt-1 text-sm text-muted">Short on time? Sit one skill under exam conditions.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {SKILLS.map((s) => (
          <div key={s.code} className="glass grain rounded-3xl p-6">
            <span className="text-chrome text-4xl font-bold">{s.code}</span>
            <h3 className="mt-4">{s.name}</h3>
            <p className="text-sm text-muted">{s.q} · {s.t}</p>
            <button disabled className="btn btn-glass mt-5 w-full cursor-not-allowed !py-2 text-sm opacity-60">Coming soon</button>
          </div>
        ))}
      </div>

      {/* History */}
      <h2 className="mt-14 text-2xl">Past sittings</h2>
      <div className="glass grain mt-6 overflow-x-auto rounded-3xl">
        {sittings.length === 0 ? (
          <p className="p-10 text-center text-muted">No exam sittings yet — your results will appear here.</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.18em] text-muted">
                <th className="px-6 py-4 font-normal">Date</th>
                {SKILL_CODES.map((c) => <th key={c} className="px-4 py-4 font-normal">{c}</th>)}
                <th className="px-6 py-4 text-right font-normal">NCLC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sittings.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-4">
                    {new Date(s.started_at).toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" })}
                    {s.status !== "completed" && <span className="ml-2 text-xs text-muted">({s.status.replace("_", " ")})</span>}
                  </td>
                  {SKILL_CODES.map((c) => {
                    const a = s.attempts.find((x) => x.skill === c);
                    return (
                      <td key={c} className="px-4 py-4">
                        {a ? <><span>{formatScore(c, a.score)}</span><span className="block text-xs text-muted">NCLC {nclcLabel(a.nclc)}</span></> : <span className="text-muted">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-right text-lg">{nclcLabel(s.overall_nclc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
