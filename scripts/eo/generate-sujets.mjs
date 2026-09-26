// Writes original Expression orale sujets (tâches 2 and 3) into eo_sujets.
// Usage: node --env-file=.env.local scripts/eo/generate-sujets.mjs [--task 2|3] [--count 30]
import { createClient } from "@supabase/supabase-js";
import { llmJson } from "../bank/azure.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const TASKS = arg("task") ? [Number(arg("task"))] : [2, 3];
const COUNT = Number(arg("count", 30));
const MODEL = process.env.EO_MODEL ?? "fuelix:gpt-6-luna";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

// Published FEI examples: the format to imitate, never to reuse.
const KNOWN = {
  2: ["association qui aide les personnes en difficulté", "bénévoles pour l'aide aux devoirs", "garder votre chat pendant les vacances", "conseils pour une sortie culturelle", "organisation des transports en commun"],
  3: ["qu'est-ce qu'un pays agréable à vivre", "valeurs de votre pays d'origine à conserver", "activité humanitaire qui vous plairait", "voyager nous rend meilleurs", "peut-on vivre sans pétrole"],
};

const GUIDE = {
  2: `Tâche 2 du TCF Canada (exercice en interaction avec préparation, 3 min 30 de dialogue). Le candidat doit POSER DES QUESTIONS à l'examinateur pour obtenir des informations ; l'examinateur joue un rôle.
Format exact du sujet (2e personne pour le candidat, 1re personne pour l'examinateur), par exemple :
« Je suis le responsable d'un club de randonnée de votre quartier. Posez-moi des questions pour savoir si ce club vous convient (sorties, niveau, prix, etc.). »
« Vous voulez louer un appartement que je propose. Posez-moi des questions pour décider s'il vous convient (loyer, quartier, charges, disponibilité). »
Termine toujours par une parenthèse de 3 ou 4 pistes. Situations de la vie courante au Canada ou dans un pays francophone : logement, travail, études, loisirs, services, voisinage, voyage, santé (non médicale), achats, associations, immigration et installation.
"brief" : la fiche secrète de l'examinateur (6 à 10 faits concrets et cohérents : noms, horaires, prix en dollars, conditions, un ou deux inconvénients) qu'il utilise pour répondre de façon réaliste, sans tout dire d'un coup.`,
  3: `Tâche 3 du TCF Canada (expression d'un point de vue sans préparation, 4 min 30). Une question ou une affirmation sur laquelle le candidat doit argumenter (exemples, justification, convaincre).
Exemples de forme : « Selon vous, le télétravail est-il un progrès pour tous ? », « Faut-il interdire les voitures dans le centre des villes ? Pourquoi ? », « "Apprendre une langue, c'est changer de regard sur le monde." Êtes-vous d'accord ? »
Sujets de société accessibles à tous, sans connaissance spécialisée : travail, éducation, technologie, environnement, ville et campagne, consommation, santé et mode de vie, culture, famille, immigration et intégration, médias. Une à deux phrases maximum.
"brief" : 3 relances courtes que l'examinateur peut utiliser si le candidat s'arrête (questions qui poussent à nuancer ou à donner un exemple).`,
};

const SCHEMA = { type: "object", additionalProperties: false, required: ["sujets"], properties: { sujets: { type: "array", items: {
  type: "object", additionalProperties: false, required: ["prompt", "brief"], properties: { prompt: { type: "string" }, brief: { type: "string" } } } } } };

for (const task of TASKS) {
  const { data: existing } = await supabase.from("eo_sujets").select("prompt").eq("task", task);
  const seen = (existing ?? []).map((r) => r.prompt);
  let made = 0;
  while (made < COUNT) {
    const n = Math.min(10, COUNT - made);
    const { sujets } = await llmJson({
      model: MODEL,
      name: "sujets",
      schema: SCHEMA,
      input: `${GUIDE[task]}

Rédige ${n} sujets ORIGINAUX, variés entre eux (thèmes, lieux, rôles), en français standard. N'en reprends aucun de cette liste (sujets déjà publiés ou déjà dans notre banque), ni un sujet trop proche :
${[...KNOWN[task], ...seen].map((s) => `- ${s}`).join("\n")}`,
    });
    const rows = sujets.slice(0, n).filter((s) => s.prompt.trim()).map((s) => ({ task, prompt: s.prompt.trim(), brief: s.brief.trim() }));
    const { error } = await supabase.from("eo_sujets").insert(rows);
    if (error) throw error;
    seen.push(...rows.map((r) => r.prompt));
    made += rows.length;
    console.log(`tâche ${task}: ${made}/${COUNT}`);
  }
}
