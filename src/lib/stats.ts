import { SKILL_CODES, type Skill } from "./tcf";

export type Attempt = {
  id: string;
  mode: "practice" | "exam";
  skill: Skill;
  score: number | null;
  percent: number;
  nclc: number | null;
  sitting_id: string | null;
  completed_at: string;
};

const DAY = 86_400_000;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** attempts must be sorted newest first */
export function buildStats(attempts: Attempt[], now = Date.now()) {
  const practice = attempts.filter((a) => a.mode === "practice");
  const exams = attempts.filter((a) => a.mode === "exam");
  const age = (a: Attempt) => now - new Date(a.completed_at).getTime();

  // Practice: last 30 days vs previous 30 days
  const p30 = avg(practice.filter((a) => age(a) <= 30 * DAY).map((a) => Number(a.percent)));
  const pPrev = avg(practice.filter((a) => age(a) > 30 * DAY && age(a) <= 60 * DAY).map((a) => Number(a.percent)));

  const bySkill = SKILL_CODES.map((skill) => {
    const rows = practice.filter((a) => a.skill === skill);
    return { skill, count: rows.length, avg: avg(rows.map((a) => Number(a.percent))) };
  });

  // Exams: latest result per skill → estimated NCLC is the weakest skill
  const latestExam = SKILL_CODES.map((skill) => ({ skill, attempt: exams.find((a) => a.skill === skill) ?? null }));
  const levels = latestExam.map((l) => l.attempt?.nclc).filter((n): n is number => n != null);
  const estimatedNclc = levels.length ? Math.min(...levels) : null;
  const sittingIds = new Set(exams.map((a) => a.sitting_id).filter(Boolean));

  const examPercents = exams.map((a) => Number(a.percent));

  return {
    practice: {
      total: practice.length,
      avg30: p30,
      delta: p30 != null && pPrev != null ? p30 - pPrev : null,
      series: practice.slice(0, 24).map((a) => Number(a.percent)).reverse(),
      bySkill,
    },
    exams: {
      sittings: sittingIds.size,
      latestExam,
      estimatedNclc,
      skillsCovered: levels.length,
      delta: examPercents.length >= 2 ? examPercents[0] - examPercents[1] : null,
      series: examPercents.slice(0, 24).reverse(),
    },
    recent: attempts.slice(0, 6),
  };
}

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(1, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} d ago` : new Date(iso).toLocaleDateString("en-CA");
}
