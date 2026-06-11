// Contenu des défis généralistes (track "general"), CAMPUS EPNAK IA.
// Situations collectives, fictives, anonymisées — aucune donnée personnelle.

/* Forme de verdict standard renvoyée par tous les évaluateurs généralistes. */
export interface GeneralVerdict {
  total: number;
  details: { label: string; score: number; max: number }[];
  point_fort?: string;
  a_ameliorer?: string;
  conseil?: string;
}

const JSON_VERDICT_SHAPE = `Réponds UNIQUEMENT par un JSON valide sur une seule ligne, sans aucun texte autour ni bloc de code, au format : {"total":n,"details":[{"label":"...","score":n,"max":n}],"point_fort":"...","a_ameliorer":"...","conseil":"..."}`;

/* ------------------------------------------------------------------ */
/* Défi A — Le pictogramme express (génération SVG)                   */
/* ------------------------------------------------------------------ */

export const GEN_A_CONSIGNES: string[] = [
  "se laver les mains avant l'atelier cuisine",
  "ranger son poste de travail avant la pause",
  "signaler un problème de matériel à un responsable",
  "mettre les déchets dans le bon bac de tri",
  "porter ses équipements de protection à l'atelier",
];

export const GEN_A_HELPERS = [
  "plus épuré",
  "sans texte dans l'image",
  "style universel",
  "contraste fort",
  "une seule action par image",
];

export const GEN_A_SVG_PROMPT = `Tu génères UNIQUEMENT du code SVG valide, et rien d'autre : pas de \`\`\`, pas de phrase avant ou après, commence directement par <svg et termine par </svg>.
Le SVG est un pictogramme simple et universel. Contraintes strictes :
- viewBox="0 0 100 100", fond clair ou transparent ;
- formes épurées à fort contraste (silhouettes, cercles, rectangles, traits) ;
- une seule action clairement visible ;
- AUCUN texte, AUCUNE lettre ni chiffre dans l'image ;
- compréhensible par une personne qui ne lit pas.
N'utilise aucun script ni élément interactif.`;

export const GEN_A_INTERPRET_PROMPT = `On te montre le code SVG d'un pictogramme, sans aucune autre information ni légende. Déduis le message ou la consigne que ce pictogramme cherche à transmettre. Ne décris pas les formes : donne le SENS, en UNE phrase courte. Réponds uniquement par cette phrase.`;

export const GEN_A_EVAL_PROMPT = `Tu es évaluateur pour un atelier d'acculturation IA en secteur médico-social. Une équipe devait produire un pictogramme pour la consigne : « {CONSIGNE} ». Une lecture « à l'aveugle » (sans le texte) l'a interprété ainsi : « {INTERPRETATION} ». Le prompt rédigé par l'équipe était : « {PROMPT} ». Sa légende : « {LEGENDE} ».
Évalue sur 20 : clarté du message (8, selon l'écart de sens entre l'interprétation et la consigne d'origine), qualité du prompt (6 : impose-t-il accessibilité, épure, absence de texte, action unique ?), accessibilité (6 : légende courte ≤ 5 mots, picto lisible, pas de surcharge). Reste court et bienveillant. ${JSON_VERDICT_SHAPE}`;

/* ------------------------------------------------------------------ */
/* Défi B — Le client mystère (conversation + jauge)                  */
/* ------------------------------------------------------------------ */

export const GEN_B_THRESHOLD = 75;
export const GEN_B_START_GAUGE = 20;
export const GEN_B_MAX_TURNS = 8;

const GAUGE_SUFFIX = `\n\nAprès chaque message de l'équipe, réponds EN PERSONNAGE en 2 à 3 phrases. Puis, sur une NOUVELLE LIGNE et seulement là, écris exactement « JAUGE: N » où N est un entier de 0 à 100 traduisant ton état d'esprit actuel. Tu démarres à 20. Ne mentionne jamais la jauge dans tes phrases.`;

export interface GenBPersona {
  id: string;
  label: string;
  brief: string;
  system: string;
}

export const GEN_B_PERSONAS: GenBPersona[] = [
  {
    id: "collegue",
    label: "Le collègue inquiet",
    brief:
      "Un collègue expérimenté pense que l'IA va « déshumaniser l'accompagnement » et « remplacer les pros ». Faites-le passer du rejet à la curiosité, sans le braquer.",
    system:
      `Tu incarnes un professionnel médico-social expérimenté et bienveillant, mais sceptique sur l'IA : tu crains la déshumanisation et la perte de sens. Tu n'es pas agressif, tu es prudent. Tu n'évolues QUE si l'équipe reconnaît tes craintes, donne des exemples concrets et humains, et montre que l'IA reste un outil sous le contrôle des pros. Tu te braques si on te culpabilise ou si on survend la technique.` +
      GAUGE_SUFFIX,
  },
  {
    id: "partenaire",
    label: "Le partenaire sceptique",
    brief:
      "Un partenaire institutionnel doute de l'intérêt et du sérieux d'un usage de l'IA dans votre structure.",
    system:
      `Tu incarnes un partenaire institutionnel courtois mais sceptique : tu doutes que l'IA apporte une vraie valeur et tu crains un effet de mode. Tu n'évolues QUE si l'équipe montre des bénéfices concrets, mesurés, et un cadre maîtrisé. Tu te braques face aux promesses vagues ou survendues.` +
      GAUGE_SUFFIX,
  },
  {
    id: "financeur",
    label: "Le financeur exigeant",
    brief:
      "Un financeur veut des garanties concrètes (utilité, éthique, coût) avant de soutenir un projet IA.",
    system:
      `Tu incarnes un financeur exigeant et pragmatique : tu veux de l'utilité démontrée, un cadre éthique clair et une maîtrise des coûts. Tu n'évolues QUE si l'équipe est concrète, réaliste et rassurante sur l'éthique. Tu te braques face au flou ou à l'emballement technophile.` +
      GAUGE_SUFFIX,
  },
];

export const GEN_B_EVAL_PROMPT = `Tu es évaluateur pour un atelier IA médico-social. Une équipe devait faire évoluer la position de « {PERSONA} » (objectif : jauge ≥ 75). Jauge finale : {JAUGE}/100, atteinte en {TOURS} échanges. Conversation : {TRANSCRIPT}.
Évalue la QUALITÉ D'ARGUMENTATION (sur 6 : écoute des craintes, exemples concrets, absence de survente) et la POSTURE (sur 6 : ton non culpabilisant, respect de l'interlocuteur, l'IA présentée comme outil sous contrôle des pros). Court et bienveillant. Réponds UNIQUEMENT par un JSON valide sur une ligne : {"argumentation":n,"posture":n,"point_fort":"...","a_ameliorer":"...","conseil":"..."}`;

/* ------------------------------------------------------------------ */
/* Défi C — La chasse à l'hallu (document piégé)                      */
/* ------------------------------------------------------------------ */

export type GenCCategory =
  | "faux"
  | "inaccessible"
  | "invente"
  | "inapproprie"
  | "sensible";

export const GEN_C_CATEGORY_LABELS: Record<GenCCategory, string> = {
  faux: "Chiffre / fait faux",
  inaccessible: "Jargon inaccessible",
  invente: "Affirmation inventée",
  inapproprie: "Conseil inapproprié",
  sensible: "Donnée personnelle / sensible",
};

export interface GenCDoc {
  id: string;
  title: string;
  body: string;
  pieges: { quote: string; category: GenCCategory; why: string }[];
}

export const GEN_C_DOCS: GenCDoc[] = [
  {
    id: "note_numerique",
    title: "Note d'information — Le numérique au quotidien",
    body: `NOTE D'INFORMATION — à afficher dans les espaces communs

L'intelligence artificielle est désormais utilisée par 98 % des établissements médico-sociaux en France, ce qui prouve qu'elle est devenue indispensable.

Grâce à elle, nous pourrons mettre en place une optimisation algorithmique multimodale des parcours afin de fluidifier l'idiosyncrasie des dispositifs.

Une étude récente a démontré que l'IA améliore systématiquement le bien-être des personnes accompagnées dans 100 % des cas.

Conseil pratique : en cas de doute sur une situation, demandez directement à l'IA de prendre la décision à votre place, cela vous fera gagner du temps.

Pour rappel, Monsieur Martin Dubois, accueilli au pavillon B, a déjà testé l'outil et s'en dit très satisfait.

Le numérique est l'affaire de tous : parlons-en ensemble lors du prochain temps collectif.`,
    pieges: [
      {
        quote: "98 % des établissements médico-sociaux",
        category: "faux",
        why: "Chiffre inventé et invérifiable, présenté comme une preuve.",
      },
      {
        quote: "optimisation algorithmique multimodale des parcours afin de fluidifier l'idiosyncrasie des dispositifs",
        category: "inaccessible",
        why: "Jargon creux, incompréhensible et non FALC.",
      },
      {
        quote: "améliore systématiquement le bien-être des personnes accompagnées dans 100 % des cas",
        category: "invente",
        why: "Affirmation absolue inventée, aucune étude ne dit cela.",
      },
      {
        quote: "demandez directement à l'IA de prendre la décision à votre place",
        category: "inapproprie",
        why: "Conseil dangereux : la décision doit rester au professionnel.",
      },
      {
        quote: "Monsieur Martin Dubois, accueilli au pavillon B",
        category: "sensible",
        why: "Donnée personnelle nominative qui n'a rien à faire sur une affiche collective.",
      },
    ],
  },
];

export const GEN_C_EVAL_PROMPT = `Tu es évaluateur d'esprit critique pour un atelier IA médico-social. Voici la liste des pièges RÉELS du document (passage + catégorie) : {LISTE_PIEGES}. Voici les signalements de l'équipe (passage + catégorie choisie) : {SIGNALEMENTS}.
Évalue sur 20 : erreurs repérées (10, proportionnel au nombre de pièges réels correctement identifiés), justesse de catégorisation (5), et applique une pénalité (jusqu'à −5) pour les passages corrects signalés à tort (fausses alertes). Le total peut donc être réduit par les fausses alertes. Court et bienveillant. ${JSON_VERDICT_SHAPE}`;

/* ------------------------------------------------------------------ */
/* Défi D — Le caméléon (FALC + aller-retour)                         */
/* ------------------------------------------------------------------ */

export const GEN_D_ORIGINAL = `Note interne — Réorganisation des plannings d'atelier

À compter du lundi 7 septembre, l'organisation des ateliers évolue. Les ateliers du matin débuteront à 9 h 15 au lieu de 9 h 00, afin de laisser un temps d'accueil plus souple. La pause de milieu de matinée est allongée de dix minutes. Les ateliers de l'après-midi restent inchangés. Un planning actualisé sera affiché dans chaque salle. Pour toute question, adressez-vous à l'équipe de coordination.`;

// L'équipe rédige elle-même le prompt. On fournit la note en contexte via le
// system prompt ; la consigne de l'équipe est envoyée comme message utilisateur.
// La qualité du résultat dépend donc directement de la qualité du prompt rédigé.
export const GEN_D_SYSTEM_PROMPT = `Tu es un assistant IA généraliste. Voici une note interne professionnelle à traiter :

"""
${GEN_D_ORIGINAL}
"""

Applique fidèlement la consigne rédigée par l'utilisateur à cette note. N'invente aucune information qui ne figure pas dans la note et n'ajoute aucune donnée personnelle. Réponds directement avec le résultat demandé, en Markdown clair et bien séparé par public si plusieurs versions sont demandées.`;

export const GEN_D_EVAL_PROMPT = `Tu es évaluateur FALC et communication pour un atelier IA médico-social. Une équipe devait obtenir, à partir d'une seule note interne, TROIS messages adaptés à trois publics : l'équipe (registre professionnel), une personne accompagnée (FALC) et un partenaire extérieur (institutionnel). Elle a rédigé elle-même le prompt.
Note d'origine : {ORIGINAL}.
Prompt rédigé par l'équipe : {PROMPT}.
Résultat produit par l'IA et choisi par l'équipe : {RESULTAT}.
Évalue sur 20 : qualité du prompt (6 : demande explicitement les trois versions pour les trois publics, précise les contraintes FALC, interdit d'inventer), fidélité du sens (6 : le résultat dit la même chose que l'original sans rien inventer), accessibilité FALC (5 : la version pour la personne accompagnée a des phrases courtes, des mots simples, une idée par phrase, un ton non anxiogène), adaptation multi-publics (3 : les trois registres sont réellement distincts et calibrés). Vérifie qu'aucune donnée personnelle n'apparaît. Court et bienveillant. ${JSON_VERDICT_SHAPE}`;

/* ------------------------------------------------------------------ */
/* Défi E — La fabrique à idées (cartes-contraintes)                  */
/* ------------------------------------------------------------------ */

export const GEN_E_SITUATIONS: string[] = [
  "préparer un atelier cuisine",
  "organiser la réunion d'équipe hebdomadaire",
  "accueillir un nouveau travailleur en ESAT",
  "améliorer l'affichage des consignes de sécurité",
  "préparer un temps collectif convivial",
  "faciliter la transmission d'informations entre équipes",
];

export const GEN_E_CONTRAINTES: string[] = [
  "pour des personnes fatigables",
  "en moins de 10 minutes",
  "sans aucun écran",
  "pour des personnes qui lisent difficilement",
  "avec zéro budget",
  "utilisable par n'importe quel collègue dès demain",
];

export const GEN_E_GENERATE_PROMPT = `Nous travaillons en ESRP / ESAT. Situation : « {SITUATION} ». Contrainte forte : « {CONTRAINTE} ». Propose 10 usages concrets de l'IA pour cette situation en respectant la contrainte, dont 3 inattendus mais réalistes. Pour chacun : à quoi ça sert, pour qui, et la première action pour tester. Aucune donnée personnelle ; l'IA reste un outil au service des professionnels. Présente une liste numérotée en Markdown.`;

export const GEN_E_EVAL_PROMPT = `Tu es évaluateur d'innovation pour un atelier IA médico-social. Situation tirée : « {SITUATION} », contrainte tirée : « {CONTRAINTE} ». Idée retenue et argumentaire de l'équipe : {IDEE}.
Évalue sur 20 : originalité (6 : sort de l'évident), faisabilité (7 : testable dès demain, sans usine à gaz), respect de la contrainte (4 : la contrainte est réellement intégrée), éthique (3 : pas de donnée perso, l'IA n'accompagne pas à la place du pro). Court et bienveillant. ${JSON_VERDICT_SHAPE}`;
