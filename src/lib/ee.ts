// Expression écrite: task definitions and word counting shared by the writer, the grader and the review page.

export type Sheet = { kind: "form" | "email" | "message" | "article"; title: string; to: string; subject: string };
export type EEDocument = { title: string; from: string; subject: string; text: string; source: string };
export type EESujet = { id: string; task: 1 | 2 | 3; prompt: string; sheet: Sheet; documents: EEDocument[] };

export const EE_MINUTES = 60;
/** Grace period after the hour for the last autosave / submit to reach the server. */
export const EE_GRACE_MS = 2 * 60_000;

/** Word ranges of the real épreuve. Tâche 3 is one article in two parts, written in two boxes here. */
export const EE_PARTS = [
  { task: 1, label: "Tâche 1", min: 60, max: 120 },
  { task: 2, label: "Tâche 2", min: 120, max: 150 },
  { task: 3, label: "Tâche 3 · Partie 1", min: 40, max: 60 },
  { task: 3, label: "Tâche 3 · Partie 2", min: 80, max: 120 },
] as const;
export const EE_TASK_RANGE = { 1: [60, 120], 2: [120, 150], 3: [120, 180] } as const;

export const EE_TASK3_CONSIGNE =
  "Votre article comprend deux parties : dans la première partie, vous présentez les deux opinions avec vos propres mots (entre 40 et 60 mots) ; dans la deuxième partie, vous donnez votre position sur le thème général, commun à ces deux opinions (entre 80 et 120 mots).";

/**
 * TCF rule: a word is anything between two spaces ("C'est-à-dire" = 1 word). Lone punctuation marks
 * (the space before « ! » in French) are not counted, so the count never flatters the candidate.
 */
export function countWords(text: string) {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function normalizeAnswers(raw: unknown): string[] {
  const a = Array.isArray(raw) ? raw : [];
  return EE_PARTS.map((_, i) => (typeof a[i] === "string" ? a[i].slice(0, 5000) : ""));
}

/** The texts per task (tâche 3 = its two parts). */
export function taskTexts(answers: string[]) {
  return [answers[0], answers[1], [answers[2], answers[3]].filter((s) => s.trim()).join("\n\n")];
}

/** Milliseconds elapsed since a timestamp (server pages run once per request, so the clock is fine there). */
export const msSince = (at: string | number | null | undefined) => Date.now() - new Date(at ?? 0).getTime();
