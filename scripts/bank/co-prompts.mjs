// Authoring briefs for Compréhension orale items. Everything is original content in the TCF Canada format.

export const SYSTEM = `Tu es concepteur·rice senior d'items pour le TCF Canada (Test de connaissance du français), épreuve de Compréhension orale.
Tu écris des items ORIGINAUX, jamais copiés d'un test existant, mais indiscernables d'un vrai item : même format, même niveau CECRL, même ton, mêmes types de pièges.

Règles générales du TCF (à respecter strictement) :
- Un seul document sonore par question, entendu UNE seule fois par le candidat.
- 4 propositions (A, B, C, D), une seule correcte, sans ambiguïté possible pour un natif attentif.
- Les distracteurs sont plausibles : ils reprennent des mots ou des idées entendus dans le document mais les déforment (mauvais moment, mauvaise personne, négation, cause/conséquence inversée, généralisation abusive, détail secondaire présenté comme principal).
- SUBTILITÉ : un vrai item du TCF ne se devine JAMAIS sans écouter. Chaque distracteur doit être une réponse qu'un candidat qui a mal ou partiellement compris choisirait ; aucune proposition absurde, hors sujet ou éliminable par le bon sens. Si on lit seulement la question et les propositions, les 4 doivent sembler aussi probables.
- Les propositions sont courtes, de longueur et de structure grammaticale comparables. Jamais « toutes les réponses », jamais de réponse évidente par élimination de forme.
- La bonne réponse REFORMULE le document (synonymes, paraphrase) au lieu d'en répéter les mots exacts, surtout à partir du niveau B1.
- Français standard, naturel et oral. Aux niveaux B1 et plus, quelques marques d'oralité (« bon », « ben », « euh ») avec parcimonie.
- Contexte francophone international (France, Québec, Belgique, Suisse, Afrique francophone) ; varier les lieux et les noms. Pas de marques commerciales réelles, pas de personnes célèbres réelles.
- Contenu neutre, adapté à un examen officiel : pas de sujets choquants, politiques partisans ou religieux.
- L'explication (en français, 1 à 3 phrases) cite le passage du document qui justifie la réponse et dit pourquoi le distracteur le plus tentant est faux.`;

const LEVEL_GUIDE = {
  A1: "A1 : vocabulaire très fréquent, phrases simples et courantes de la vie quotidienne (impératifs, questions, exclamations), situations concrètes.",
  A2: "A2 : situations quotidiennes prévisibles, phrases courtes, présent, passé composé, futur proche, informations pratiques (heure, prix, lieu, date).",
  B1: "B1 : documents de 20 à 30 secondes à l'oral (50 à 90 mots au total), dialogues ou messages de la vie courante, professionnelle ou scolaire. La question porte sur l'intention, la raison, la demande ou une information clé reformulée.",
  B2: "B2 : documents de 30 à 45 secondes (90 à 140 mots au total) : interview, reportage, témoignage, débat. Questions sur l'opinion, l'argument principal, la nuance, la cause ou la conséquence. Distracteurs fondés sur des détails réellement mentionnés.",
  C1: "C1 : documents de 40 à 55 secondes (120 à 170 mots au total), discours argumenté, lexique abstrait, connecteurs logiques, concessions. Questions sur la position implicite, la visée du locuteur, la relation entre les idées.",
  C2: "C2 : documents de 45 à 60 secondes (140 à 190 mots au total), denses plutôt que longs, discours dense et nuancé, ironie, sous-entendus, références culturelles générales, registre soutenu. Questions sur l'implicite, le ton, l'intention rhétorique. Tous les distracteurs sont subtils et défendables à première écoute.",
};

const KIND_GUIDE = {
  image_description: `TYPE « Image » (questions 1 à 4) — format réel du TCF.
Sur le livret, le candidat voit un DESSIN en noir et blanc représentant une situation de la vie quotidienne avec plusieurs personnages. Il entend 4 propositions et doit choisir celle qui CORRESPOND À LA SITUATION, c'est-à-dire la phrase qu'un des personnages est en train de dire.
Exemples authentiques du format :
  • Dessin : une mère pose une casserole fumante sur la table mise et se tourne vers ses enfants affalés devant la télévision.
    A. Allez vous coucher rapidement.  B. Finissez vos exercices de français.  C. Regardez la télévision maintenant.  D. Venez manger tout de suite.  → D
  • Dessin : dans une salle de cinéma, écran encore blanc, un couple descend l'allée ; l'homme montre deux places libres.
    A. C'est un acteur formidable.  B. Je déteste la publicité.  C. Viens, on va s'asseoir là.  D. Tu vas payer nos billets.  → C
Règles :
- Les 4 propositions sont des PAROLES AU DISCOURS DIRECT (impératif, question, exclamation, affirmation à la 1re/2e personne, « on »), 3 à 9 mots, jamais une description à la 3e personne (« Elle met du pain dans un sac » est INTERDIT).
- Les 4 propositions sont toutes naturelles et plausibles dans le MÊME lieu général (toutes pourraient se dire au cinéma, ou toutes à la maison) ; elles s'appuient souvent sur des éléments présents dans le dessin (la télévision, l'écran, les billets) pour piéger le candidat.
- Une seule convient au MOMENT précis montré : ce que les personnages font, leurs gestes, leur direction, ce qui est prêt ou pas encore commencé. Le candidat doit INFÉRER la situation (le repas est servi → on appelle à table ; le film n'a pas commencé et l'écran est blanc → pas « c'est un acteur formidable »).
- Les 4 propositions ont des INTENTIONS DIFFÉRENTES (appeler, conseiller, se plaindre, proposer, demander, remercier, s'excuser…) et des structures variées, comme dans les exemples. INTERDIT : la même phrase où l'on change seulement un nom ou un verbe (« Je voudrais ce croissant / ce gâteau / cette baguette », « Ouvrez / Fermez la fenêtre »). Le candidat ne doit pas pouvoir répondre en repérant simplement un objet sur le dessin : il doit comprendre CE QUI SE PASSE.
- Chaque distracteur doit être FAUX grâce à un indice visible : moment de la journée, action déjà faite ou pas encore faite, personnes concernées, objet absent.
- "image_prompt" (en anglais) : décris la scène comme une illustration à dessiner — le lieu avec ses détails, 2 à 6 personnages (âge, position), et UN SEUL personnage qui parle, bien visible, bouche ouverte, avec un geste clair, tourné vers la personne à qui il parle ; les autres personnages écoutent ou continuent leur activité, sans parler ni gesticuler. Ajoute les indices visuels qui éliminent chaque distracteur. Ne décris pas la phrase elle-même, montre la situation.
- Évite ce qu'un filtre d'images pourrait refuser : couteaux, armes, feu, médicaments, alcool, blessures.
- "question" = "".
- "speakers" : un seul locuteur (S1) qui lit les 4 propositions de manière naturelle, comme des paroles.`,
  spoken_response: `TYPE « Question-réponse » (questions 5 à 7).
Le candidat entend une phrase (question ou affirmation) dite par S1, puis 4 réponses possibles lues par S2. Il choisit la réponse qui convient.
- "turns" : exactement 1 réplique de S1 (6 à 16 mots).
- "options" : 4 réponses orales de S2 (3 à 12 mots), toutes naturelles et du même registre. Les distracteurs reprennent un mot ou le thème de la phrase mais ne répondent pas à ce qui est réellement demandé (question sur l'heure, réponse sur le lieu ; « tu es venu comment ? » / « Je suis venu hier » ; offre vs demande ; temps verbal incompatible). Évite les distracteurs manifestement absurdes : on doit avoir besoin d'avoir bien compris la phrase de S1.
- "question" = "".
- "image_prompt" = "".`,
  short_document: `TYPE « Document court » : dialogue de la vie quotidienne, message sur répondeur, annonce publique (gare, magasin, école), courte info radio.
- "turns" : le document complet, 1 à 8 répliques. Pour une annonce ou un message, une seule réplique.
- "question" : une question écrite, courte (« Pourquoi cette personne appelle-t-elle ? », « Que doit faire le client ? », « Qu'est-ce qui change à partir de lundi ? »).
- "options" : 4 réponses écrites courtes (2 à 10 mots). Chaque distracteur correspond à une information RÉELLEMENT entendue dans le document mais qui ne répond pas à la question (autre jour évoqué, option proposée puis refusée, raison mentionnée puis écartée).
- "image_prompt" = "".`,
  long_document: `TYPE « Document long » : extrait d'émission de radio, interview, reportage avec témoignages, débat, chronique, conférence.
- "turns" : le document complet, 1 à 12 répliques (journaliste et invité·e·s, ou un seul locuteur pour une chronique ou une conférence). Commencer directement dans le vif du sujet, comme un extrait.
- "question" : une question écrite (« Selon l'invitée, … ? », « Que reproche le journaliste à … ? », « Quel est le ton du chroniqueur ? », « Que sous-entend le locuteur lorsqu'il dit … ? »).
- "options" : 4 réponses écrites (4 à 14 mots), toutes plausibles et cohérentes avec le thème ; les distracteurs s'appuient sur des idées évoquées dans le document (position rapportée puis critiquée, exemple pris pour la thèse, nuance exagérée).
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

// "Too easy" check: can the key be guessed from the question and options alone, without the recording?
export function guessPrompt(item, kind) {
  const ask = item.question ? `Question : ${item.question}` : kind === "spoken_response" ? "Consigne : choisis la réponse qui convient à la phrase entendue (tu n'as PAS entendu la phrase)." : "";
  return `Tu n'as PAS accès au document sonore. Voici seulement la question et les propositions d'un item d'examen.
${ask}
Propositions :
${item.options.map((o, i) => `${i}. ${o}`).join("\n")}

Essaie quand même de deviner la bonne réponse (index 0 à 3) par le bon sens, la forme ou l'élimination. Mets "confident": true seulement si une proposition te semble nettement plus probable que les autres sans avoir entendu le document.`;
}

export const GUESS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "confident", "reason"],
  properties: { answer: { type: "integer" }, confident: { type: "boolean" }, reason: { type: "string" } },
};

// House style of the real TCF booklet pictures: black-and-white ink drawings of everyday situations.
export const IMAGE_STYLE =
  "Black and white ink line illustration in the style of a French language textbook or exam booklet. Hand-drawn pen linework with grey wash shading and light cross-hatching, white background, semi-realistic slightly cartoonish people with simple expressive faces and clear gestures, a complete everyday scene with room or street details drawn in line. Monochrome greyscale only, no colour, not a photograph. No text, no letters, no speech bubbles, no captions, no numbers, no signs with writing.";

export function imageCheckPrompt(options) {
  return `Voici un dessin d'examen de français (TCF) et quatre paroles. Le candidat doit choisir la phrase qu'un des personnages du dessin est en train de dire, compte tenu de la situation montrée (gestes, moment, ce qui est prêt ou pas).
${options.map((o, i) => `${i}. ${o}`).join("\n")}
Réponds avec l'index de la phrase qui correspond à la situation dans "answer". Mets "ambiguous": true si plusieurs phrases conviennent aussi bien à la situation dessinée, si aucune ne convient clairement, si l'indice décisif (geste, déplacement, objet, moment) n'est pas nettement dessiné, si on ne voit pas clairement qui parle, ou si le dessin contient du texte illisible ou incohérent. Explique dans "issues".`;
}
