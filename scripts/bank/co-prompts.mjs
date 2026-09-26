// Authoring briefs for Compréhension orale items. Everything is original content in the TCF Canada format.

export const SYSTEM = `Tu es concepteur·rice senior d'items pour le TCF Canada (Test de connaissance du français), épreuve de Compréhension orale.
Tu écris des items ORIGINAUX, jamais copiés d'un test existant, mais indiscernables d'un vrai item : même format, même niveau CECRL, même ton, mêmes types de pièges.

Règles générales du TCF (à respecter strictement) :
- Un seul document sonore par question, entendu UNE seule fois par le candidat.
- 4 propositions (A, B, C, D), une seule correcte, sans ambiguïté possible pour un natif attentif.
- Les distracteurs sont plausibles : ils reprennent des mots ou des idées entendus dans le document mais les déforment (mauvais moment, mauvaise personne, négation, cause/conséquence inversée, généralisation abusive, détail secondaire présenté comme principal).
- Les propositions sont courtes, de longueur et de structure grammaticale comparables. Jamais « toutes les réponses », jamais de réponse évidente par élimination de forme.
- La bonne réponse REFORMULE le document (synonymes, paraphrase) au lieu d'en répéter les mots exacts, surtout à partir du niveau B1.
- Français standard, naturel et oral. Aux niveaux B1 et plus, quelques marques d'oralité (« bon », « ben », « euh ») avec parcimonie.
- Contexte francophone international (France, Québec, Belgique, Suisse, Afrique francophone) ; varier les lieux et les noms. Pas de marques commerciales réelles, pas de personnes célèbres réelles.
- Contenu neutre, adapté à un examen officiel : pas de sujets choquants, politiques partisans ou religieux.
- L'explication (en français, 1 à 3 phrases) cite le passage du document qui justifie la réponse et dit pourquoi le distracteur le plus tentant est faux.`;

const LEVEL_GUIDE = {
  A1: "A1 : vocabulaire très fréquent, phrases simples au présent, objets et actions concrets et VISIBLES.",
  A2: "A2 : situations quotidiennes prévisibles, phrases courtes, présent, passé composé, futur proche, informations pratiques (heure, prix, lieu, date).",
  B1: "B1 : documents de 20 à 30 secondes à l'oral (50 à 90 mots au total), dialogues ou messages de la vie courante, professionnelle ou scolaire. La question porte sur l'intention, la raison, la demande ou une information clé reformulée.",
  B2: "B2 : documents de 30 à 45 secondes (90 à 140 mots au total) : interview, reportage, témoignage, débat. Questions sur l'opinion, l'argument principal, la nuance, la cause ou la conséquence. Distracteurs fondés sur des détails réellement mentionnés.",
  C1: "C1 : documents de 40 à 55 secondes (120 à 170 mots au total), discours argumenté, lexique abstrait, connecteurs logiques, concessions. Questions sur la position implicite, la visée du locuteur, la relation entre les idées.",
  C2: "C2 : documents de 45 à 60 secondes (140 à 190 mots au total), denses plutôt que longs, discours dense et nuancé, ironie, sous-entendus, références culturelles générales, registre soutenu. Questions sur l'implicite, le ton, l'intention rhétorique. Tous les distracteurs sont subtils et défendables à première écoute.",
};

const KIND_GUIDE = {
  image_description: `TYPE « Image » (questions 1 à 4).
Le candidat voit une photographie et entend 4 phrases courtes (A à D). Une seule décrit la photo.
- "turns" doit être un tableau VIDE ; les 4 phrases sont dans "options" (5 à 10 mots chacune, présent de l'indicatif, du type « Elle achète du pain. »).
- Les 4 phrases diffèrent par des éléments NETTEMENT VISIBLES : action principale, lieu, nombre de personnes, objet principal, position. Jamais une couleur fine, une marque, un texte, une émotion subtile ou une quantité difficile à compter.
- Les 3 distracteurs sont clairement FAUX pour la photo, mais proches par le vocabulaire (même champ lexical).
- "image_prompt" (en anglais) décrit précisément la scène de la bonne réponse pour que les 3 autres phrases soient visiblement fausses : qui (âge, nombre), fait quoi, où, avec quels objets bien visibles au premier plan. Les éléments décisifs doivent être grands et évidents.
- Évite dans l'image tout ce qu'un filtre de sécurité d'images pourrait refuser : couteaux, ciseaux, outils tranchants, armes, feu, médicaments, alcool, enfants seuls, blessures. Préfère des actions neutres (lire, porter, acheter, attendre, ranger, arroser, téléphoner, cuisiner à la cuillère…).
- "question" = "".
- "speakers" : un seul locuteur (S1) qui lit les propositions.`,
  spoken_response: `TYPE « Question-réponse » (questions 5 à 7).
Le candidat entend une phrase (question ou affirmation) dite par S1, puis 4 réponses possibles lues par S2. Il choisit la réponse qui convient.
- "turns" : exactement 1 réplique de S1 (6 à 16 mots).
- "options" : 4 réponses orales de S2 (3 à 12 mots). Les distracteurs réagissent à un mot entendu mais pas au sens (question sur l'heure, réponse sur le lieu ; question au passé, réponse au futur ; confusion de mots proches).
- "question" = "".
- "image_prompt" = "".`,
  short_document: `TYPE « Document court » : dialogue de la vie quotidienne, message sur répondeur, annonce publique (gare, magasin, école), courte info radio.
- "turns" : le document complet, 1 à 8 répliques. Pour une annonce ou un message, une seule réplique.
- "question" : une question écrite, courte (« Pourquoi cette personne appelle-t-elle ? », « Que doit faire le client ? », « Qu'est-ce qui change à partir de lundi ? »).
- "options" : 4 réponses écrites courtes (2 à 10 mots).
- "image_prompt" = "".`,
  long_document: `TYPE « Document long » : extrait d'émission de radio, interview, reportage avec témoignages, débat, chronique, conférence.
- "turns" : le document complet, 1 à 12 répliques (journaliste et invité·e·s, ou un seul locuteur pour une chronique ou une conférence). Commencer directement dans le vif du sujet, comme un extrait.
- "question" : une question écrite (« Selon l'invitée, … ? », « Que reproche le journaliste à … ? », « Quel est le ton du chroniqueur ? », « Que sous-entend le locuteur lorsqu'il dit … ? »).
- "options" : 4 réponses écrites (4 à 14 mots), toutes plausibles.
- "image_prompt" = "".`,
};

export function itemPrompt({ slot, topic, avoid }) {
  return `Rédige la question ${slot.position} d'une épreuve de Compréhension orale du TCF Canada.

Niveau visé : ${LEVEL_GUIDE[slot.level]}

${KIND_GUIDE[slot.kind]}

Situation imposée : ${topic}.
${avoid.length ? `Évite de reprendre ces situations déjà utilisées dans l'épreuve : ${avoid.join(" ; ")}.` : ""}

Locuteurs : indique pour chacun le genre (F/M), la tranche d'âge (young/adult/senior) et l'accent (france/quebec/belgique/suisse ; majorité france, parfois quebec, rarement belgique ou suisse). Identifiants S1, S2, S3…
Place la bonne réponse à l'index 0 de "options" (l'ordre sera mélangé ensuite) et mets "answer" à 0.`;
}

export const ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["topic", "context", "speakers", "turns", "question", "options", "answer", "explanation", "image_prompt"],
  properties: {
    topic: { type: "string" },
    context: { type: "string" },
    speakers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "gender", "age", "accent", "role"],
        properties: {
          id: { type: "string" },
          gender: { type: "string", enum: ["F", "M"] },
          age: { type: "string", enum: ["young", "adult", "senior"] },
          accent: { type: "string", enum: ["france", "quebec", "belgique", "suisse"] },
          role: { type: "string" },
        },
      },
    },
    turns: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["speaker", "text"], properties: { speaker: { type: "string" }, text: { type: "string" } } },
    },
    question: { type: "string" },
    options: { type: "array", items: { type: "string" } },
    answer: { type: "integer" },
    explanation: { type: "string" },
    image_prompt: { type: "string" },
  },
};

// Blind check: a second pass answers the item without seeing the key.
export function checkPrompt(item, kind) {
  const doc = kind === "image_description" ? "(document visuel, non fourni)" : item.turns.map((t) => `${t.speaker} : ${t.text}`).join("\n");
  const ask = item.question ? `Question : ${item.question}` : kind === "spoken_response" ? "Consigne : choisis la réponse qui convient à la phrase entendue." : "";
  return `Tu passes le TCF. Voici la transcription d'un document sonore et la question.

Document :
${doc}

${ask}
Propositions :
${item.options.map((o, i) => `${i}. ${o}`).join("\n")}

Réponds avec l'index (0 à 3) de la seule bonne réponse. Mets "ambiguous": true si plus d'une proposition est défendable ou si aucune ne l'est, et décris brièvement les problèmes éventuels dans "issues".`;
}

export const CHECK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "ambiguous", "issues"],
  properties: { answer: { type: "integer" }, ambiguous: { type: "boolean" }, issues: { type: "string" } },
};

export const IMAGE_STYLE =
  "Documentary-style colour photograph for a French language exam, eye level, natural light, plain and realistic everyday scene, ordinary people, uncluttered composition, the key action clearly visible in the foreground. No text, no letters, no signs, no logos, no watermark, not stylised, not cinematic.";

export function imageCheckPrompt(options) {
  return `Voici une photo d'examen et quatre phrases. Laquelle décrit la photo ?
${options.map((o, i) => `${i}. ${o}`).join("\n")}
Réponds avec l'index de la phrase correcte dans "answer". Mets "ambiguous": true si plusieurs phrases pourraient correspondre à la photo ou si aucune ne correspond clairement, et explique dans "issues".`;
}
