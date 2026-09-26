// Structure of one Compréhension orale épreuve, mirroring the TCF Canada:
// 39 questions, difficulty rising A1 -> C2, points weighted by level (total 699).
export const LEVEL_POINTS = { A1: 3, A2: 9, B1: 15, B2: 21, C1: 26, C2: 33 };

export const INSTRUCTIONS = {
  image_description: "Regardez l'image. Écoutez les quatre propositions et choisissez celle qui correspond à l'image.",
  spoken_response: "Écoutez la phrase, puis les quatre réponses. Choisissez la réponse qui convient.",
  short_document: "Écoutez le document, puis répondez à la question.",
  long_document: "Écoutez le document, puis répondez à la question.",
};

// [first, last, level, kind]
const RANGES = [
  [1, 4, "A1", "image_description"],
  [5, 7, "A2", "spoken_response"],
  [8, 10, "A2", "short_document"],
  [11, 19, "B1", "short_document"],
  [20, 29, "B2", "long_document"],
  [30, 35, "C1", "long_document"],
  [36, 39, "C2", "long_document"],
];

// Situation pools per level; each série draws different ones.
export const TOPICS = {
  A1: [
    "à la boulangerie", "au marché, fruits et légumes", "à l'arrêt de bus", "dans une salle de classe", "au restaurant, le serveur apporte les plats",
    "à la pharmacie", "dans un parc, des enfants jouent", "à la gare, quai de train", "dans une cuisine familiale", "au supermarché, à la caisse",
    "à la bibliothèque", "chez le médecin", "à la plage", "dans un bureau, réunion", "à la poste", "au café en terrasse", "à vélo en ville",
    "à la piscine", "dans un magasin de vêtements", "à l'aéroport, enregistrement", "dans la rue sous la pluie", "à la patinoire", "dans un jardin",
    "au cinéma", "à un anniversaire", "au garage", "à la laverie", "dans un taxi", "chez le coiffeur", "dans un hôtel, réception",
  ],
  A2: [
    "réserver une table", "demander son chemin", "acheter un billet de train", "prendre rendez-vous chez le dentiste", "inviter un ami",
    "annonce dans un supermarché", "message sur un répondeur", "annonce en gare ou à l'aéroport", "au guichet de la banque", "location d'appartement",
    "cours de sport, inscription", "objet perdu", "la météo du week-end", "horaires d'ouverture d'un musée", "commander au téléphone", "retard au travail",
    "échange entre voisins", "achat d'un cadeau", "problème à l'hôtel", "premier jour dans un nouveau travail",
  ],
  B1: [
    "message d'une école aux parents", "annonce d'un événement culturel local", "conversation sur un projet de vacances", "témoignage sur le télétravail",
    "flash info régional", "conseil de santé à la radio", "entretien d'embauche court", "discussion entre collègues sur un changement d'horaire",
    "réclamation auprès d'un service client", "présentation d'une association de quartier", "reportage sur un marché local", "conversation sur le logement étudiant",
    "annonce de travaux dans un immeuble", "message d'un propriétaire", "chronique sur les transports en commun", "témoignage d'un immigrant récemment arrivé",
    "programme d'un festival", "recommandation d'un livre à la radio", "discussion sur le recyclage au travail", "renseignements pour un permis de conduire",
  ],
  B2: [
    "interview d'une cheffe d'entreprise", "reportage sur la pénurie de main-d'œuvre", "débat sur la semaine de quatre jours", "témoignage sur la reconversion professionnelle",
    "chronique scientifique sur le sommeil", "reportage sur l'agriculture urbaine", "interview d'un urbaniste sur les pistes cyclables", "émission sur le bénévolat",
    "reportage sur le bilinguisme des enfants", "débat sur les écrans à l'école", "interview d'un médecin sur la sédentarité", "chronique économie sur le logement",
    "reportage sur le tourisme durable", "témoignage d'une infirmière en région", "émission sur les nouvelles habitudes alimentaires", "interview d'un architecte",
    "reportage sur l'intelligence artificielle au travail", "débat sur le prix des transports", "chronique culture sur un festival de cinéma", "interview d'un sportif amateur",
  ],
  C1: [
    "analyse d'un sociologue sur la solitude urbaine", "débat sur la place de la voiture en ville", "chronique d'un économiste sur l'inflation", "conférence sur la mémoire",
    "entretien avec une historienne sur les migrations", "analyse sur la désinformation en ligne", "débat sur la gratuité des musées", "chronique sur le travail des jeunes",
    "entretien avec un philosophe sur le bonheur au travail", "analyse sur la transition énergétique", "débat sur la publicité ciblée", "conférence sur la biodiversité",
  ],
  C2: [
    "chronique ironique sur la mode du développement personnel", "débat nuancé sur la liberté d'expression", "conférence d'un linguiste sur l'évolution de la langue",
    "entretien critique sur la culture de la performance", "analyse d'un essai sur la ville de demain", "chronique littéraire au ton ironique",
    "débat sur l'éthique des données de santé", "conférence sur le rapport au temps dans les sociétés modernes", "analyse politique de la participation citoyenne",
    "entretien sur le rôle de l'art dans l'espace public",
  ],
};

export function blueprint() {
  const slots = [];
  for (const [a, b, level, kind] of RANGES)
    for (let p = a; p <= b; p++) slots.push({ position: p, level, kind, points: LEVEL_POINTS[level] });
  return slots;
}
