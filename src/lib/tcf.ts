export type Skill = "CO" | "CE" | "EE" | "EO";
export const SKILL_CODES: Skill[] = ["CO", "CE", "EE", "EO"];

export const SKILLS = [
  { code: "CO", name: "Compréhension orale", en: "Listening", q: "39 questions", t: "35 min", minutes: 35, color: "#6366f1",
    desc: "Real-speed audio clips — announcements, conversations, interviews — with instant answer review." },
  { code: "CE", name: "Compréhension écrite", en: "Reading", q: "39 questions", t: "60 min", minutes: 60, color: "#a5a6ff",
    desc: "Everyday documents to complex articles, graded from A1 to C2 like the real exam." },
  { code: "EE", name: "Expression écrite", en: "Writing", q: "3 tasks", t: "60 min", minutes: 60, color: "#60a5fa",
    desc: "Timed writing tasks with word counters, model answers and rubric-based feedback." },
  { code: "EO", name: "Expression orale", en: "Speaking", q: "3 tasks", t: "12 min", minutes: 12, color: "#6ee7b7",
    desc: "Record yourself under exam conditions and compare against sample responses." },
] as const satisfies ReadonlyArray<{ code: Skill; [k: string]: unknown }>;

export const skillMeta = (code: Skill) => SKILLS.find((s) => s.code === code)!;

/** Score scale per skill. */
export const SCALE: Record<Skill, { min: number; max: number }> = {
  CO: { min: 100, max: 699 },
  CE: { min: 100, max: 699 },
  EE: { min: 0, max: 20 },
  EO: { min: 0, max: 20 },
};

// IRCC equivalency table for TCF Canada: [minimum score, NCLC], highest first.
const NCLC_TABLE: Record<Skill, [number, number][]> = {
  CO: [[549, 10], [523, 9], [503, 8], [458, 7], [398, 6], [369, 5], [331, 4]],
  CE: [[549, 10], [524, 9], [499, 8], [453, 7], [406, 6], [375, 5], [342, 4]],
  EE: [[16, 10], [14, 9], [12, 8], [10, 7], [7, 6], [6, 5], [4, 4]],
  EO: [[16, 10], [14, 9], [12, 8], [10, 7], [7, 6], [6, 5], [4, 4]],
};

/** NCLC level for a TCF score (0 = below NCLC 4). */
export function nclcFor(skill: Skill, score: number): number {
  return NCLC_TABLE[skill].find(([min]) => score >= min)?.[1] ?? 0;
}

export const nclcLabel = (n: number | null | undefined) =>
  n == null ? "—" : n >= 10 ? "10+" : n < 4 ? "<4" : String(n);

export function formatScore(skill: Skill, score: number | null) {
  if (score == null) return "—";
  return `${Math.round(score)}/${SCALE[skill].max}`;
}
