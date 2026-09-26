import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { countWords, EE_PARTS, EE_TASK3_CONSIGNE, EE_TASK_RANGE, normalizeAnswers, taskTexts, type EESujet } from "@/lib/ee";
import { llmJson } from "@/lib/llm";
import { nclcFor } from "@/lib/tcf";

const MODEL = process.env.EE_GRADER_MODEL ?? "fuelix:gpt-6-luna";
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const S = { type: "string" };
const LIST = { type: "array", items: S };
const CRIT = { type: "object", additionalProperties: false, required: ["score", "comment"], properties: { score: { type: "integer" }, comment: S } };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["overall", "level", "summary", "tasks", "criteria", "corrections"],
  properties: {
    overall: { type: "integer" },
    level: { type: "string", enum: LEVELS },
    summary: S,
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["task", "score", "level", "comment", "strengths", "improvements", "corrected", "model"],
        properties: {
          task: { type: "integer" }, score: { type: "integer" }, level: { type: "string", enum: LEVELS },
          comment: S, strengths: LIST, improvements: LIST, corrected: S, model: S,
        },
      },
    },
    criteria: {
      type: "object",
      additionalProperties: false,
      required: ["realisation", "lexique", "grammaire", "orthographe", "coherence"],
      properties: { realisation: CRIT, lexique: CRIT, grammaire: CRIT, orthographe: CRIT, coherence: CRIT },
    },
    corrections: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["said", "better", "why"], properties: { said: S, better: S, why: S } },
    },
  },
};

export type EEEvaluation = {
  overall: number;
  nclc: number;
  level: string;
  summary: string;
  tasks: { task: number; score: number; level: string; comment: string; strengths: string[]; improvements: string[]; corrected: string; model: string }[];
  criteria: Record<"realisation" | "lexique" | "grammaire" | "orthographe" | "coherence", { score: number; comment: string }>;
  corrections: { said: string; better: string; why: string }[];
  words: number[];
};

function describe(s: EESujet) {
  const sheet =
    s.sheet.kind === "email" ? `Support : courriel à ${s.sheet.to}, objet « ${s.sheet.subject} ».`
    : s.sheet.kind === "article" ? `Support : article pour « ${s.sheet.title} ».`
    : `Support : ${s.sheet.kind === "form" ? "formulaire" : "message"} « ${s.sheet.title} ».`;
  const docs = s.documents.map((d) => `${d.title}${d.from ? ` (de ${d.from}, objet « ${d.subject} »)` : ""} :\n${d.text}${d.source ? `\n${d.source}` : ""}`).join("\n\n");
  return `Consigne : ${s.prompt}${s.task === 3 ? ` ${EE_TASK3_CONSIGNE}` : ""}\n${sheet}${docs ? `\n\n${docs}` : ""}`;
}

/** Grades a submitted épreuve, stores the evaluation and records the attempt. Marks it failed on error. */
export async function gradeEE(attemptId: string) {
  const admin = createAdminClient();
  try {
    const { data: a, error } = await admin
      .from("ee_attempts")
      .select("id, user_id, status, answers, created_at, submitted_at, t1:task1_id(*), t2:task2_id(*), t3:task3_id(*)")
      .eq("id", attemptId)
      .single();
    if (error) throw error;
    if (a.status !== "submitted") return;
    const one = <T,>(x: T | T[]) => (Array.isArray(x) ? x[0] : x);
    const sujets = [one(a.t1), one(a.t2), one(a.t3)] as unknown as EESujet[];
    const answers = normalizeAnswers(a.answers);
    const texts = taskTexts(answers);
    const words = texts.map(countWords);
    const partWords = answers.map(countWords);

    const ev = await llmJson<Omit<EEEvaluation, "nclc" | "words">>({
      model: MODEL,
      name: "evaluation",
      schema: SCHEMA,
      instructions:
        "Tu es correcteur certifié de l'épreuve d'expression écrite du TCF Canada. Tu évalues avec rigueur et bienveillance, selon la grille officielle (réalisation de la tâche, lexique, morphosyntaxe, orthographe, cohérence et cohésion), en notant sur 20 comme le TCF. Tu ne surnotes jamais.",
      input: `Copie d'un candidat. Règles de l'épreuve : 60 minutes, 3 tâches ; 1 mot = tout ensemble de signes entre deux espaces.
Une tâche non réalisée, hors sujet, ou très en dessous du nombre de mots minimum (ou très au-dessus du maximum) doit être notée très bas (niveau « A1 non atteint » si c'est le cas de toute la copie) ; un léger écart (quelques mots) est pénalisé modérément.

${sujets
  .map((s, i) => {
    const [min, max] = EE_TASK_RANGE[(i + 1) as 1 | 2 | 3];
    const parts = i === 2 ? ` (partie 1 : ${partWords[2]} mots, attendu ${EE_PARTS[2].min}-${EE_PARTS[2].max} ; partie 2 : ${partWords[3]} mots, attendu ${EE_PARTS[3].min}-${EE_PARTS[3].max})` : "";
    return `===== TÂCHE ${i + 1} (${min} à ${max} mots) =====
${describe(s)}

Texte du candidat — ${words[i]} mots${parts} :
${texts[i].trim() || "(aucun texte)"}`;
  })
  .join("\n\n")}

Rédige en français, en t'adressant au candidat (« vous »).
- "tasks" : les 3 tâches (task 1, 2, 3) avec note /20, niveau, commentaire de 2 ou 3 phrases (dont le respect de la consigne et du nombre de mots), 2 ou 3 points forts, 2 ou 3 axes d'amélioration concrets ; "corrected" : le texte du candidat corrigé (orthographe, grammaire, ponctuation) en changeant le moins possible, sans l'améliorer au-delà (chaîne vide si aucun texte) ; "model" : une production modèle de niveau B2-C1 qui respecte la consigne, le support et le nombre de mots (pour la tâche 3, les deux parties séparées par une ligne vide).
- "criteria" : note /20 et commentaire d'une phrase pour chaque critère, sur l'ensemble de la copie.
- "corrections" : jusqu'à 10 erreurs réelles du candidat (phrase ou groupe de mots exact), la version correcte et une explication courte (tableau vide s'il n'y en a pas).
- "overall" : note globale /20 cohérente avec les notes des tâches ; "summary" : 3 ou 4 phrases de bilan avec la priorité de travail.`,
    });

    const overall = Math.max(0, Math.min(20, Math.round(ev.overall)));
    const nclc = nclcFor("EE", overall);
    const evaluation: EEEvaluation = { ...ev, overall, nclc, words };
    const submitted = a.submitted_at ? new Date(a.submitted_at).getTime() : Date.now();
    const { data: att, error: e2 } = await admin
      .from("attempts")
      .insert({
        user_id: a.user_id, mode: "practice", skill: "EE", score: overall, percent: overall * 5, nclc,
        duration_seconds: Math.round((submitted - new Date(a.created_at).getTime()) / 1000),
      })
      .select("id")
      .single();
    if (e2) throw e2;
    await admin.from("ee_attempts").update({ status: "graded", evaluation, score: overall, attempt_id: att.id }).eq("id", attemptId);
  } catch (e) {
    console.error("gradeEE", attemptId, e);
    await admin.from("ee_attempts").update({ status: "failed" }).eq("id", attemptId).eq("status", "submitted");
  }
}
