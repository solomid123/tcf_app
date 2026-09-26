// Evaluates a recorded Expression orale simulation from its transcript, TCF Canada style (score /20 → NCLC).
import { llmJson } from "../bank/azure.mjs";

const MODEL = process.env.EO_GRADER_MODEL ?? "fuelix:gpt-6-luna";
const NCLC = [[16, 10], [14, 9], [12, 8], [10, 7], [7, 6], [6, 5], [4, 4]];
const nclcFor = (s) => NCLC.find(([m]) => s >= m)?.[1] ?? 0;
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const TASK_SCHEMA = {
  type: "object", additionalProperties: false, required: ["task", "score", "level", "comment", "strengths", "improvements"],
  properties: {
    task: { type: "integer" }, score: { type: "integer" }, level: { type: "string", enum: LEVELS },
    comment: { type: "string" }, strengths: { type: "array", items: { type: "string" } }, improvements: { type: "array", items: { type: "string" } },
  },
};
const CRIT = { type: "object", additionalProperties: false, required: ["score", "comment"], properties: { score: { type: "integer" }, comment: { type: "string" } } };
const SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["overall", "level", "summary", "tasks", "criteria", "corrections"],
  properties: {
    overall: { type: "integer" },
    level: { type: "string", enum: LEVELS },
    summary: { type: "string" },
    tasks: { type: "array", items: TASK_SCHEMA },
    criteria: {
      type: "object", additionalProperties: false, required: ["realisation", "lexique", "grammaire", "coherence", "aisance"],
      properties: { realisation: CRIT, lexique: CRIT, grammaire: CRIT, coherence: CRIT, aisance: CRIT },
    },
    corrections: { type: "array", items: { type: "object", additionalProperties: false, required: ["said", "better", "why"],
      properties: { said: { type: "string" }, better: { type: "string" }, why: { type: "string" } } } },
  },
};

const PHASE_TASK = { intro: 1, t1: 1, t2prep: 2, t2: 2, t3: 3, end: 3 };

export async function gradeAttempt(supabase, attemptId) {
  const { data: a, error: e1 } = await supabase.from("eo_attempts").select("*, t2:task2_id(prompt), t3:task3_id(prompt)").eq("id", attemptId).single();
  if (e1) throw e1;
  const lines = a.transcript ?? [];
  const byTask = [1, 2, 3].map((t) => lines.filter((l) => PHASE_TASK[l.phase] === t));
  const stats = byTask.map((ls) => {
    const cand = ls.filter((l) => l.role === "candidate");
    const words = cand.reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0);
    const secs = cand.reduce((n, l) => n + (l.speech_ms ?? 0), 0) / 1000;
    return { words, secs: Math.round(secs), wpm: secs > 5 ? Math.round((words / secs) * 60) : null };
  });
  const render = (ls) => ls.map((l) => `${l.role === "candidate" ? "CANDIDAT" : "EXAMINATEUR"} : ${l.text}`).join("\n") || "(rien)";

  const ev = await llmJson({
    model: MODEL,
    name: "evaluation",
    schema: SCHEMA,
    instructions: "Tu es correcteur·rice habilité·e du TCF Canada, épreuve d'expression orale. Tu évalues avec la rigueur et la bienveillance d'un correcteur officiel, sans surévaluer.",
    input: `Évalue cette simulation d'épreuve d'expression orale du TCF Canada à partir de sa transcription automatique (reconnaissance vocale : ignore la ponctuation et les petites erreurs de transcription évidentes ; la prononciation ne peut être jugée qu'indirectement).

Barème : note globale sur 20 (entier). Correspondance indicative : 1–3 = A1 faible, 4–5 = A1/A2 (NCLC 4), 6 = A2 (NCLC 5), 7–9 = B1 (NCLC 6), 10–11 = B1+/B2 (NCLC 7), 12–13 = B2 (NCLC 8), 14–15 = C1 (NCLC 9), 16–20 = C1+/C2 (NCLC 10 et plus).
Les tâches sont de difficulté croissante : la tâche 1 permet de montrer au plus un niveau B1, la tâche 2 un niveau B2, et seule une tâche 3 riche, nuancée et bien argumentée permet d'atteindre C1–C2. Un candidat qui parle très peu, reste hors sujet ou ne réalise pas une tâche est fortement pénalisé.
Critères (chacun sur 20) : réalisation des tâches (adéquation, questions pertinentes et interaction en tâche 2, argumentation en tâche 3) ; lexique (étendue et précision) ; grammaire (morphosyntaxe, temps, accords) ; cohérence et cohésion (organisation, connecteurs) ; aisance (fluidité, longueur des interventions, débit).

Tâche 1 — entretien dirigé (2 min). Candidat : ${stats[0].words} mots, ${stats[0].secs} s de parole${stats[0].wpm ? `, ${stats[0].wpm} mots/min` : ""}.
${render(byTask[0])}

Tâche 2 — interaction (3 min 30). Sujet : « ${a.t2.prompt} ». Candidat : ${stats[1].words} mots, ${stats[1].secs} s de parole.
${render(byTask[1])}

Tâche 3 — point de vue (4 min 30). Sujet : « ${a.t3.prompt} ». Candidat : ${stats[2].words} mots, ${stats[2].secs} s de parole${stats[2].wpm ? `, ${stats[2].wpm} mots/min` : ""}.
${render(byTask[2])}

Rédige en français, en t'adressant au candidat (« vous »). "tasks" : les 3 tâches (task 1, 2, 3) avec note /20, niveau, commentaire de 2 ou 3 phrases, 2 ou 3 points forts, 2 ou 3 axes d'amélioration concrets. "corrections" : jusqu'à 8 phrases réellement prononcées par le candidat qui contiennent des erreurs, avec la version correcte et une explication courte (tableau vide s'il n'y en a pas). "summary" : 3 ou 4 phrases de bilan avec la priorité de travail.`,
  });
  const overall = Math.max(0, Math.min(20, Math.round(ev.overall)));
  const evaluation = { ...ev, overall, nclc: nclcFor(overall), stats };
  const duration = a.started_at && a.ended_at ? Math.round((new Date(a.ended_at) - new Date(a.started_at)) / 1000) : null;
  const { data: att, error } = await supabase.from("attempts").insert({
    user_id: a.user_id, mode: "practice", skill: "EO", score: overall, percent: overall * 5, nclc: evaluation.nclc, duration_seconds: duration,
    started_at: a.started_at ?? a.created_at, completed_at: a.ended_at ?? new Date().toISOString(),
  }).select("id").single();
  if (error) throw error;
  await supabase.from("eo_attempts").update({ status: "graded", evaluation, score: overall, attempt_id: att.id }).eq("id", attemptId);
  return evaluation;
}
