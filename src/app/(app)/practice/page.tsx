import Link from "next/link";
import { getSession } from "@/lib/session";
import { SKILLS, type Skill } from "@/lib/tcf";

export const metadata = { title: "Practice — TCF Prep" };

const steps = [
  { n: "01", t: "Pick a skill", d: "Listening, reading, writing or speaking." },
  { n: "02", t: "Choose a level", d: "Drill A1 → C2, or let us adapt to you." },
  { n: "03", t: "Learn from mistakes", d: "Instant corrections with explanations." },
];

export default async function PracticePage() {
  const { supabase, user } = await getSession();
  const { data } = await supabase
    .from("attempts")
    .select("skill, percent")
    .eq("user_id", user.id)
    .eq("mode", "practice");

  const stat = (skill: Skill) => {
    const rows = (data ?? []).filter((r) => r.skill === skill).map((r) => Number(r.percent));
    return {
      count: rows.length,
      avg: rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : null,
      best: rows.length ? Math.max(...rows) : null,
    };
  };

  return (
    <>
      <p className="eyebrow">Entraînement</p>
      <h1 className="mt-3 text-4xl md:text-5xl"><span className="text-chrome">Practice</span></h1>
      <p className="mt-3 max-w-xl text-muted">No timer pressure. Drill one skill at a time and get instant feedback on every answer.</p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {SKILLS.map((s) => {
          const st = stat(s.code);
          return (
            <article key={s.code} className="glass grain relative overflow-hidden rounded-3xl p-7">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-25 blur-3xl" style={{ background: s.color }} />
              <div className="flex items-start justify-between">
                <span className="text-chrome text-5xl font-bold">{s.code}</span>
                <div className="flex gap-2 text-xs text-muted">
                  <span className="rounded-full border border-line px-3 py-1">{s.q}</span>
                  <span className="rounded-full border border-line px-3 py-1">{s.t}</span>
                </div>
              </div>
              <h2 className="mt-6 text-xl">{s.name}</h2>
              <p className="text-sm text-muted">{s.en}</p>
              <p className="mt-4 leading-relaxed text-fg/75">{s.desc}</p>

              <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 text-center">
                {[
                  ["Sessions", String(st.count)],
                  ["Average", st.avg == null ? "—" : `${st.avg.toFixed(0)}%`],
                  ["Best", st.best == null ? "—" : `${st.best.toFixed(0)}%`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] uppercase tracking-[0.18em] text-muted">{k}</dt>
                    <dd className="mt-1 text-lg">{v}</dd>
                  </div>
                ))}
              </dl>

              {s.code !== "CE" ? (
                <Link href={`/practice/${s.code.toLowerCase()}`} className="btn btn-primary mt-6 w-full">
                  {s.code === "EO" ? "Start a simulation" : s.code === "EE" ? "Start an épreuve" : "Start practising"}
                </Link>
              ) : (
                <button disabled className="btn btn-glass mt-6 w-full cursor-not-allowed opacity-60">Coming soon</button>
              )}
            </article>
          );
        })}
      </div>

      <div className="glass grain mt-5 grid rounded-3xl md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.n} className={`p-7 ${i < 2 ? "border-b border-line md:border-b-0 md:border-r" : ""}`}>
            <p className="eyebrow">{s.n}</p>
            <p className="mt-2 text-lg">{s.t}</p>
            <p className="mt-1 text-sm text-muted">{s.d}</p>
          </div>
        ))}
      </div>
    </>
  );
}
