// Writes original Expression écrite sujets (tâches 1, 2 and 3) into ee_sujets, in the format of the
// FEI sample épreuve (format only: the published sujets themselves are never reused).
// Usage: node --env-file=.env.local scripts/ee/generate-sujets.mjs [--task 1|2|3] [--count 20]
import { createClient } from "@supabase/supabase-js";
import { llmJson } from "../bank/azure.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const TASKS = arg("task") ? [Number(arg("task"))] : [1, 2, 3];
const COUNT = Number(arg("count", 20));
const MODEL = process.env.EE_MODEL ?? "fuelix:gpt-6-luna";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

// Published FEI sample sujets: never reuse or paraphrase them.
const KNOWN = {
  1: ["valise perdue à l'aéroport, fiche d'information bagages"],
  2: ["réponse au courriel d'une amie qui a gagné un voyage dans votre pays et demande des conseils"],
  3: ["paniers de fruits et légumes d'un producteur local / apprendre aux enfants à bien manger"],
};

const GUIDE = {
  1: `Tâche 1 de l'expression écrite du TCF Canada (60 à 120 mots). Une situation concrète de la vie courante (arrivée dans un pays, logement, travail, services, voisinage, loisirs, achats, transports) où le candidat doit DÉCRIRE et RACONTER ou EXPLIQUER quelque chose par écrit.
"prompt" : 2 ou 3 phrases, 2e personne du pluriel, qui posent la situation puis disent exactement ce qu'il faut écrire. Exemple de forme : « Vous avez oublié votre sac dans le train. Sur le site de la compagnie, vous remplissez un formulaire de déclaration. Décrivez votre sac et racontez où et comment vous l'avez perdu. »
"sheet" : le support sur lequel le candidat écrit. Varie les supports :
- "form" : un formulaire ou une fiche ; "title" = son intitulé (ex. « Formulaire de réclamation »), "to" et "subject" vides ;
- "email" : un courriel ; "to" = adresse fictive plausible, "subject" = objet, "title" vide ;
- "message" : un message ou un mot (à des voisins, des amis, des collègues) ; "title" = ex. « Message à vos voisins », "to" et "subject" vides.
"documents" : tableau vide.`,
  2: `Tâche 2 de l'expression écrite du TCF Canada (120 à 150 mots). Le candidat raconte, décrit, donne son avis ou des conseils, et JUSTIFIE, pour un destinataire ou des lecteurs. Deux types, à alterner (environ moitié-moitié) :
A) RÉPONSE À UN COURRIEL : "documents" contient exactement 1 courriel reçu : "title" = « Courriel reçu », "from" = adresse fictive (prénom@…), "subject" = objet, "text" = le courriel (60 à 100 mots, ton naturel, qui salue, raconte une nouvelle et pose des questions précises), "source" vide. "sheet" = {"kind":"email","to": même adresse, "subject": "Re : " + objet, "title": ""}. "prompt" = 1 ou 2 phrases, ex. « Vous avez reçu ce courriel de votre collègue Julien. Vous lui répondez. Vous justifiez vos recommandations. »
B) ARTICLE / BILLET DE BLOGUE / COURRIER DES LECTEURS : "documents" vide ; "sheet" = {"kind":"article","title": nom de la publication ou du site (ex. « Blogue de l'association des nouveaux arrivants »), "to":"", "subject":""} ; "prompt" = 2 ou 3 phrases : le contexte, ce qu'il faut raconter ou décrire, et le commentaire ou l'avis attendu.`,
  3: `Tâche 3 de l'expression écrite du TCF Canada (120 à 180 mots). Le candidat lit DEUX DOCUMENTS courts sur un même thème général, qui présentent deux points de vue ou deux approches différentes, puis écrit un article en deux parties (présentation des deux opinions en 40 à 60 mots, puis sa propre position en 80 à 120 mots). Cette consigne en deux parties est ajoutée automatiquement : ne l'écris pas.
"prompt" : 1 ou 2 phrases de contexte qui nomment le thème, ex. « Sur un forum consacré à la vie en ville, vous avez lu les deux opinions suivantes au sujet du vélo. Vous écrivez un court article pour le bulletin de votre association francophone. »
"documents" : exactement 2 documents, "title" = « Document 1 » / « Document 2 », "text" de 70 à 110 mots chacun, écrits comme de vrais extraits (article de presse, témoignage, extrait de site ou de livre), avec des faits ou des chiffres plausibles ; les deux doivent traiter le même thème sous deux angles vraiment différents ; "source" = une source fictive courte (ex. « D'après un article du Journal de Sherbrooke »), sans nom de média réel ; "from" et "subject" vides.
"sheet" = {"kind":"article","title": nom du journal ou bulletin de l'association, "to":"", "subject":""}.
Thèmes de société accessibles à tous : travail, éducation, technologie, environnement, ville, consommation, santé, loisirs, famille, vie au Canada.`,
};

const S = { type: "string" };
const SCHEMA = { type: "object", additionalProperties: false, required: ["sujets"], properties: { sujets: { type: "array", items: {
  type: "object", additionalProperties: false, required: ["prompt", "sheet", "documents"], properties: {
    prompt: S,
    sheet: { type: "object", additionalProperties: false, required: ["kind", "title", "to", "subject"],
      properties: { kind: { type: "string", enum: ["form", "email", "message", "article"] }, title: S, to: S, subject: S } },
    documents: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "from", "subject", "text", "source"],
      properties: { title: S, from: S, subject: S, text: S, source: S } } },
  } } } } };

const valid = (task, s) =>
  s.prompt.trim() && (task === 1 ? s.documents.length === 0 : task === 2 ? s.documents.length <= 1 : s.documents.length === 2);

for (const task of TASKS) {
  const { data: existing } = await supabase.from("ee_sujets").select("prompt").eq("task", task);
  const seen = (existing ?? []).map((r) => r.prompt);
  let made = 0;
  while (made < COUNT) {
    const n = Math.min(10, COUNT - made);
    const { sujets } = await llmJson({
      model: MODEL,
      name: "sujets",
      schema: SCHEMA,
      input: `${GUIDE[task]}

Rédige ${n} sujets ORIGINAUX, variés entre eux (thèmes, destinataires, supports), en français standard, situés au Canada ou dans un pays francophone. N'en reprends aucun de cette liste (sujets publiés ou déjà dans notre banque), ni un sujet trop proche :
${[...KNOWN[task], ...seen].map((s) => `- ${s}`).join("\n")}`,
    });
    const rows = sujets.slice(0, n).filter((s) => valid(task, s))
      .map((s) => ({ task, prompt: s.prompt.trim(), sheet: s.sheet, documents: s.documents }));
    const { error } = await supabase.from("ee_sujets").insert(rows);
    if (error) throw error;
    seen.push(...rows.map((r) => r.prompt));
    made += rows.length;
    console.log(`tâche ${task}: ${made}/${COUNT}`);
  }
}
