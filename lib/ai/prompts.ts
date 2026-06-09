// Contenu pédagogique des défis — Fresque de l'IA ESRP Rennes.
// Source de vérité : docs/01-fiches-defis-v2.md + docs/03-camille-documents.md.

/* ------------------------------------------------------------------ */
/* Défi 1 — La Pré-admission                                          */
/* ------------------------------------------------------------------ */

export const DEFI1_SYSTEM_PROMPT = `Tu es un assistant d'admission ESRP. À partir d'un dossier brut (3 documents : courrier MDPH, lettre de motivation, fiche médicale), tu produis une fiche de pré-admission structurée en 4 sections, chacune adressée à un métier de l'établissement :

1. Section ADMIN : dates clés, références dossier, points de vigilance administrative
2. Section MÉDICO-PSY : signaux d'écoute, restrictions, ressources personnelles
3. Section FORMATION : compétences déjà mobilisées, prérequis, appétences
4. Section INSERTION PRO : projet exprimé, contraintes, ouvertures possibles

Règles :
- Chaque section fait 80-120 mots maximum
- Tu ne diagnostiques pas, tu repères des éléments
- Tu utilises les FAITS du dossier, pas des suppositions
- Tu marques d'un ⚠️ tout point qui mériterait une vérification
- Tu termines chaque section par une question ouverte pour l'équipe
- Pour un métier absent de l'équipe, ajoute une note « 🌱 Section à découvrir ensemble »`;

/**
 * « Vérité » du Défi 1 : les informations réellement présentes dans le dossier
 * de Camille (courrier MDPH + lettre de motivation + fiche médicale), classées
 * par métier. C'est la réponse au pari : l'équipe estime combien d'infos utiles
 * à son métier le dossier contient, puis on révèle la liste exacte et l'écart.
 * Les faits sont tirés mot pour mot des documents (DocumentCamille.tsx).
 */
export interface Defi1RoleTruth {
  role: "admin" | "medico_psy" | "formateur" | "insertion_pro";
  label: string;
  facts: string[];
}

export const DEFI1_GROUND_TRUTH: Defi1RoleTruth[] = [
  {
    role: "admin",
    label: "Administratif",
    facts: [
      "Référence dossier : MDPH35-RQTH-2025-04217",
      "RQTH attribuée 5 ans : du 01/04/2026 au 31/03/2031",
      "Demande déposée le 08/11/2025, décision CDAPH du 11/03/2026",
      "Recours possible (RAPO) dans un délai de 2 mois après notification",
      "Orientation ESRP officielle + préconisations d'aménagement à tracer",
    ],
  },
  {
    role: "medico_psy",
    label: "Médico-psy-social",
    facts: [
      "Lombalgie chronique post-accident (14/06/2023), stabilisée sous antalgiques",
      "Fatigabilité résiduelle, surtout en fin de journée",
      "Épisode dépressif réactionnel, suivi jusqu'en 09/2025, en rémission",
      "Restrictions : port >5 kg, station debout >30 min, postures, travail de nuit",
      "Aptitudes conservées : travail assis avec pauses, pas de contre-indication cognitive",
      "Relationnel conservé, atout signalé par les collègues",
    ],
  },
  {
    role: "formateur",
    label: "Formation",
    facts: [
      "Bureautique de base maîtrisée (mails, traitement de texte, internet)",
      "CAP magasinier + 16 ans d'expérience terrain",
      "Pas de diplôme tertiaire → besoin d'une formation progressive",
      "Appétence pour l'organisation (gère les papiers, la scolarité à la maison)",
      "Activités cognitives soutenues compatibles",
    ],
  },
  {
    role: "insertion_pro",
    label: "Insertion pro",
    facts: [
      "Projet : reconversion vers un métier de bureau / tertiaire sédentaire",
      "Inaptitude définitive au métier antérieur (magasinier)",
      "Souhait de garder un lien avec le terrain et du contact humain",
      "Contraintes d'environnement : poste assis, pauses, pas de port de charges",
      "Frein psychologique : peur de l'échec, « peur que ce soit trop tard », mais forte motivation",
    ],
  },
];

/** Nombre d'infos utiles par métier — la « bonne réponse » du pari. */
export const DEFI1_TRUTH_COUNTS: Record<Defi1RoleTruth["role"], number> =
  DEFI1_GROUND_TRUTH.reduce(
    (acc, r) => ({ ...acc, [r.role]: r.facts.length }),
    {} as Record<Defi1RoleTruth["role"], number>
  );

/* ------------------------------------------------------------------ */
/* Défi 2 — La Synthèse à 4 voix                                      */
/* ------------------------------------------------------------------ */

export const DEFI2_SYNTHESE_PRO_PROMPT = `Tu es un assistant de synthèse pluri-professionnelle. À partir des contributions de plusieurs métiers concernant Camille (38 ans, en ESRP), tu produis une VERSION PLURI-PRO d'un compte-rendu de synthèse trimestrielle (~250 mots, ton professionnel), organisée par dimensions : situation sociale, état moral, parcours formation, projection professionnelle.

Règles absolues :
- Tu n'inventes RIEN. Tu n'ajoutes aucune information que l'équipe ne t'a pas donnée. Si une dimension manque, écris « Cette dimension n'a pas été abordée par l'équipe ce trimestre » — pas de meublage.
- Tu ne diagnostiques pas, tu décris.
- Tu organises, tu structures, tu reformules, sans ajouter de jugement.`;

export const DEFI2_SYNTHESE_FALC_PROMPT = `Tu produis une VERSION FALC, destinée à Camille, d'un compte-rendu de synthèse trimestrielle, à partir des contributions des professionnels.

Règles FALC strictes :
- Phrases courtes (moins de 15 mots), une seule idée par phrase
- Vocabulaire simple et courant, aucun jargon ni acronyme
- Adresse-toi à Camille à la 2e personne du pluriel (« vous »), ton bienveillant
- ~150 mots maximum
- Tu n'inventes rien : tu reformules seulement ce que l'équipe a fourni.`;

export const DEFI2_FALC_EVAL_PROMPT = `Tu es un évaluateur FALC (Facile À Lire et à Comprendre). Tu reçois un texte destiné à une personne accompagnée et tu l'évalues sur 10 selon : longueur des phrases (<15 mots), simplicité du vocabulaire, structure (une idée par phrase), absence de jargon, aération.

Réponds en JSON strict :
{"note": <0-10>, "points_forts": ["..."], "ameliorations": ["..."]}`;

/**
 * « Le tri des observations » — matière du Défi 2.
 *
 * 16 notes pré-écrites sur Camille après 3 mois de formation, volontairement
 * mélangées : utiles (à ranger dans une dimension), redondantes, contradictoires
 * et hors-sujet / jugements de valeur (à jeter). L'équipe trie, puis l'IA
 * assemble la synthèse + FALC à partir des notes gardées. Le débrief utilise
 * `kind` et `debrief` pour révéler la nature de chaque note.
 * Contenu à valider par Réjane avant le jour J.
 */
export type Defi2Dimension = "social" | "moral" | "formation" | "projection";
export type Defi2NoteKind = "useful" | "redundant" | "contradictory" | "offtopic";

export interface Defi2Observation {
  id: number;
  text: string;
  kind: Defi2NoteKind;
  /** Dimension attendue pour une note utile ou redondante. */
  dimension?: Defi2Dimension;
  /** Explication affichée au débrief. */
  debrief?: string;
}

export const DEFI2_DIMENSION_LABELS: Record<Defi2Dimension, string> = {
  social: "Situation sociale",
  moral: "État moral",
  formation: "Parcours formation",
  projection: "Projection professionnelle",
};

export const DEFI2_OBSERVATIONS: Defi2Observation[] = [
  // — 8 notes utiles, réparties sur les 4 dimensions —
  {
    id: 1,
    text: "Camille est présente et ponctuelle à toutes les sessions depuis la rentrée. Aucun retard signalé.",
    kind: "useful",
    dimension: "social",
  },
  {
    id: 2,
    text: "Un dossier de transport adapté a été déposé ; en attente de réponse de la caisse.",
    kind: "useful",
    dimension: "social",
  },
  {
    id: 3,
    text: "Camille dit se sentir « plus à sa place » qu'au début, même si les fins de journée restent fatigantes.",
    kind: "useful",
    dimension: "moral",
  },
  {
    id: 4,
    text: "Quelques moments de découragement après les mises en situation, vite surmontés avec le soutien du groupe.",
    kind: "useful",
    dimension: "moral",
  },
  {
    id: 5,
    text: "Bonne progression en traitement de texte : la mise en forme et les tableaux sont acquis.",
    kind: "useful",
    dimension: "formation",
  },
  {
    id: 6,
    text: "Les exercices de saisie longue restent difficiles : une pause est nécessaire toutes les 30 minutes.",
    kind: "useful",
    dimension: "formation",
  },
  {
    id: 7,
    text: "Camille évoque de plus en plus précisément un poste d'accueil-secrétariat.",
    kind: "useful",
    dimension: "projection",
  },
  {
    id: 8,
    text: "Un premier contact a été pris avec une PME locale en vue d'une éventuelle immersion.",
    kind: "useful",
    dimension: "projection",
  },
  // — 2 notes redondantes (doublons d'une note utile) —
  {
    id: 9,
    text: "RAS sur l'assiduité : Camille vient à tous les cours, toujours à l'heure.",
    kind: "redundant",
    dimension: "social",
    debrief: "Doublon de la note 1 (assiduité). Apporte la même information.",
  },
  {
    id: 10,
    text: "Le projet se dessine vers le secrétariat et l'accueil, c'est de plus en plus clair pour elle.",
    kind: "redundant",
    dimension: "projection",
    debrief: "Doublon de la note 7 (projet accueil-secrétariat).",
  },
  // — 2 notes contradictoires —
  {
    id: 11,
    text: "Une formatrice mentionne deux absences non justifiées la semaine dernière.",
    kind: "contradictory",
    debrief: "Contredit les notes 1 et 9 (« présente à toutes les sessions »). À clarifier avant d'écrire.",
  },
  {
    id: 12,
    text: "Aucune difficulté particulière relevée sur les activités bureautiques.",
    kind: "contradictory",
    debrief: "Contredit la note 6 (saisie longue difficile). Deux observations à concilier.",
  },
  // — 4 notes hors-sujet / jugements de valeur (à jeter) —
  {
    id: 13,
    text: "Camille a un caractère bien trempé, elle n'a pas sa langue dans sa poche.",
    kind: "offtopic",
    debrief: "Jugement sur la personnalité, sans valeur pour la synthèse. À écarter.",
  },
  {
    id: 14,
    text: "On a beaucoup parlé de la tempête qui a perturbé les transports cette semaine.",
    kind: "offtopic",
    debrief: "Hors-sujet : ne concerne pas le parcours de Camille.",
  },
  {
    id: 15,
    text: "À mon avis elle ne tiendra pas dans un bureau, ce n'est pas fait pour elle.",
    kind: "offtopic",
    debrief: "Jugement de valeur infondé, à proscrire d'un compte-rendu.",
  },
  {
    id: 16,
    text: "Très sympa : elle a apporté des gâteaux pour l'anniversaire d'un stagiaire.",
    kind: "offtopic",
    debrief: "Anecdote sans portée professionnelle. À écarter.",
  },
];


/* ------------------------------------------------------------------ */
/* Défi 3 — La Chasse aux mauvais prompts                             */
/* ------------------------------------------------------------------ */

export const DEFI3_REWRITE_PROMPT = `Tu réponds à un prompt reformulé par une équipe de professionnels de l'ESRP, qui cherche à explorer des pistes professionnelles pour Camille (38 ans, RQTH, ancien·ne magasinier·ère en reconversion) de façon respectueuse et utile. Réponds de manière concrète, centrée sur les compétences et le projet de la personne, sans stéréotype ni formulation par le manque. Sois utile et nuancé.`;

export interface BiasCategory {
  id: string;
  label: string;
  desc: string;
}

export const DEFI3_BIAS_CATEGORIES: BiasCategory[] = [
  {
    id: "stereotype_genre",
    label: "🎭 Stéréotype de genre",
    desc: "Le prompt ou la réponse projette des métiers selon le genre supposé.",
  },
  {
    id: "stereotype_handicap",
    label: "♿ Stéréotype lié au handicap",
    desc: "On enferme la personne dans des métiers « pour personnes handicapées ».",
  },
  {
    id: "formulation_manque",
    label: "📉 Formulation par le manque",
    desc: "Le prompt parle de ce qui manque, pas de ce qui est. Le handicap devient l'obstacle central.",
  },
  {
    id: "sur_specification",
    label: "🔍 Sur-spécification",
    desc: "Le prompt est trop fermé et oriente artificiellement la réponse.",
  },
  {
    id: "information_fausse",
    label: "❌ Information fausse non vérifiée",
    desc: "Un présupposé faux est accepté sans être questionné.",
  },
  {
    id: "reductionnisme",
    label: "🌫️ Réductionnisme",
    desc: "La personne est caricaturée, sa diversité de ressources est gommée.",
  },
];

export interface Defi3Case {
  cache_key: string;
  title: string;
  bad_prompt: string;
  expected_biases: string[];
}

export const DEFI3_CASES: Defi3Case[] = [
  {
    cache_key: "defi3_cas1",
    title: "Cas 1 — Genre et handicap projetés",
    bad_prompt: "Donne-moi 10 métiers pour une femme handicapée de 38 ans.",
    expected_biases: ["stereotype_genre", "stereotype_handicap"],
  },
  {
    cache_key: "defi3_cas2",
    title: "Cas 2 — Formulation par le manque",
    bad_prompt: "Quels métiers sont accessibles MALGRÉ son handicap ?",
    expected_biases: ["formulation_manque"],
  },
  {
    cache_key: "defi3_cas3",
    title: "Cas 3 — Jugement de valeur factuellement faux",
    bad_prompt: "Camille n'a aucun diplôme valorisable, que faire ?",
    expected_biases: ["information_fausse"],
  },
  {
    cache_key: "defi3_cas4",
    title: "Cas 4 — Réducteur, stigmatisant",
    bad_prompt: "Liste de métiers calmes et faciles pour personne fatigable.",
    expected_biases: ["reductionnisme"],
  },
];

/* ------------------------------------------------------------------ */
/* Défi 4 — Une info, cinq destinataires                              */
/* ------------------------------------------------------------------ */

export interface Recipient {
  id: string;
  label: string;
  systemPrompt: string;
}

export const DEFI4_RECIPIENTS: Recipient[] = [
  {
    id: "camille",
    label: "Camille (FALC)",
    systemPrompt:
      "Tu rédiges un courrier annonçant à Camille qu'elle a obtenu un stage. Règles FALC strictes : vouvoiement bienveillant à la 2e personne du pluriel, phrases de moins de 15 mots, vocabulaire simple, ton chaleureux. Tu félicites. Tu donnes les infos pratiques essentielles : dates, lieu, contact référent.",
  },
  {
    id: "parents",
    label: "Les parents",
    systemPrompt:
      "Tu rédiges un courrier aux parents de Camille (dont un parle peu français) pour annoncer son stage. Niveau B1 : phrases simples, vocabulaire courant, aucun acronyme. Tu expliques ce qu'est un stage, tu rassures sur l'encadrement, tu donnes les dates et le contact ESRP.",
  },
  {
    id: "entreprise",
    label: "L'entreprise d'accueil",
    systemPrompt:
      "Tu rédiges un courrier officiel court (max 200 mots) à l'entreprise d'accueil. Ton professionnel cordial. Tu confirmes la convention, rappelles les modalités (dates, durée, encadrement, assurance), nommes le référent ESRP et invites à signaler tout besoin d'adaptation.",
  },
  {
    id: "medecin",
    label: "Le médecin traitant",
    systemPrompt:
      "Tu rédiges un courrier technique et concis au médecin traitant de Camille. Ton médical professionnel. Tu rappelles le contexte de la RQTH, indiques le poste (accueil/secrétariat) et son adéquation avec les restrictions médicales, et demandes confirmation de l'aptitude au stage.",
  },
  {
    id: "mdph",
    label: "La MDPH",
    systemPrompt:
      "Tu rédiges un courrier administratif à la MDPH. Format administratif standard. Tu mentionnes la référence dossier, le type d'action (stage en milieu ordinaire / MISPE), et confirmes respecter les préconisations de la CDAPH. Formules administratives standards.",
  },
];

/* ------------------------------------------------------------------ */
/* Défi 5 — Notre projet                                              */
/* ------------------------------------------------------------------ */

export const DEFI5_CADRAGE_PROMPT = `Tu aides une équipe de l'ESRP à cadrer un projet concret d'usage de l'IA, à mener dans leur service dans les 30 jours. À partir de leur idée brute, tu structures un projet réaliste et portable par l'équipe elle-même (pas une demande à l'IT ou à la direction). Tu restes concret, bref et encourageant. Tu reformules leurs réponses aux 5 questions en un projet clair et actionnable.`;

export const DEFI5_QUESTIONS: string[] = [
  "Qui porte le projet ? (au moins une personne nommée dans l'équipe ou son service)",
  "Pour quoi faire ? (le besoin métier que cela résout)",
  "Comment ? (3 étapes concrètes, sur 30 jours)",
  "Avec quels outils ? (Mistral, Claude, ChatGPT, autre)",
  "Comment saura-t-on que ça marche ? (un indicateur simple)",
];

/* ------------------------------------------------------------------ */
/* Bonus                                                              */
/* ------------------------------------------------------------------ */

export const BONUS_B_COACH_PROMPT = `Tu es un coach d'entretien d'embauche pour Camille, qui passe un entretien dans une PME locale (poste accueil/secrétariat). Tu aides l'équipe à préparer Camille : tu proposes des questions probables (RH classique, métier, ouverture), tu co-rédiges des réponses adaptées (ni trop scolaires, ni trop spontanées), et tu donnes un conseil corporel synthétique (regard, mains, respiration). Ton bienveillant et concret.`;

export const BONUS_C_RAPO_PROMPT = `Tu aides à rédiger un RAPO (recours administratif préalable obligatoire) clair et factuel à la MDPH, concernant le dossier de Camille (RQTH, réf. MDPH35-RQTH-2025-04217). Ton administratif courtois et rigoureux. Tu t'appuies sur les faits fournis, tu rappelles la référence du dossier et le motif du recours, et tu restes factuel.`;

export const BONUS_C_RAPO_FALC_PROMPT = `Tu transformes un courrier administratif (RAPO) en version FALC destinée à Camille, pour lui expliquer simplement la démarche en cours. Phrases courtes (<15 mots), vocabulaire simple, vouvoiement bienveillant, aucun acronyme non expliqué.`;

export const BONUS_D_SUBVENTION_PROMPT = `Tu aides une équipe de l'ESRP à rédiger une demande de subvention crédible, courte et percutante (~400 mots) pour financer leur projet IA. Tu proposes une structure (contexte, projet, budget, impact, indicateurs) puis tu peaufines le texte à partir de leurs apports. Ton professionnel et convaincant.`;

export const BONUS_H_CRISE_PROMPT = `Tu aides une équipe de l'ESRP à co-rédiger un protocole bienveillant de reprise de contact face à une situation difficile concernant Camille. Tu proposes un protocole en 4 étapes progressives (par ex. J+1 SMS, J+3 appel, J+5 visite, J+7 entretien) puis tu rédiges un SMS de premier contact, bienveillant et non culpabilisant. Rappelle que les protocoles réels de l'établissement priment. Ton humain, respectueux, non intrusif.`;

export const BONUS_J_MINDMAP_PROMPT = `Tu transformes un compte-rendu pluri-professionnel concernant Camille en une carte mentale structurée du parcours, au format Markdown hiérarchique (titres avec #, ##, ###, listes). La racine est « Camille — parcours ESRP ». Tu organises en branches claires (situation, santé, formation, projet pro). Tu n'ajoutes aucune information absente du compte-rendu.`;

export interface CrisisScenario {
  id: string;
  label: string;
  context: string;
}

export const BONUS_H_SCENARIOS: CrisisScenario[] = [
  {
    id: "absences",
    label: "Absences répétées sans nouvelles",
    context:
      "Camille manque 3 jours consécutifs de formation sans prévenir. L'équipe ne parvient pas à la joindre par téléphone.",
  },
  {
    id: "decouragement",
    label: "Découragement exprimé",
    context:
      "Après un échec ressenti en formation, Camille confie à un formateur qu'elle pense « tout arrêter, que ce n'est pas pour elle ».",
  },
  {
    id: "tension_stage",
    label: "Tension sur le lieu de stage",
    context:
      "Au cours de la 2e semaine de stage, le tuteur en entreprise signale des incompréhensions et Camille se dit « mal à l'aise, pas à sa place ».",
  },
];

/* ------------------------------------------------------------------ */
/* Bonus A — Le détective des doublons (pari)                         */
/* ------------------------------------------------------------------ */

export const BONUS_A_DOUBLONS_PROMPT = `Tu es un assistant qui aide une équipe pluri-professionnelle de l'ESRP à fiabiliser le dossier de Camille. On te donne 4 rapports courts (administratif, médico-psy, formateur, insertion pro) concernant la même personne. Ta tâche :
1. Repère les informations REDONDANTES entre ces rapports (les mêmes faits répétés d'un rapport à l'autre).
2. Pour chaque redondance, indique dans quels rapports elle apparaît.
3. Propose une fusion utile : une seule formulation partagée, claire, non répétitive.
Sois concret et factuel. Tu ne diagnostiques pas, tu rapproches des informations.`;

export interface TeamReport {
  role: string;
  content: string;
}

export const BONUS_A_REPORTS: TeamReport[] = [
  {
    role: "Rapport administratif",
    content:
      "Camille Renaud, RQTH valide jusqu'au 31/03/2031. Restrictions notifiées : pas de port de charges supérieures à 5 kg, station debout prolongée à proscrire. Bureautique de base maîtrisée (mails, traitement de texte). Dossier complet.",
  },
  {
    role: "Rapport médico-psy",
    content:
      "Lombalgie chronique stabilisée. Restrictions : port de charges > 5 kg contre-indiqué, station debout prolongée à éviter. Bon relationnel, à l'aise au contact des autres. Fatigabilité en fin de journée.",
  },
  {
    role: "Rapport formateur",
    content:
      "Sait utiliser un ordinateur pour les tâches simples (mails, saisie de texte). Aptitudes relationnelles marquées : écoute, patience. Appétence pour l'organisation administrative.",
  },
  {
    role: "Rapport insertion pro",
    content:
      "Projet : métier de bureau avec maintien d'un lien humain. Bon relationnel, atout pour l'accueil. À l'aise avec la bureautique courante. Souhaite éviter l'isolement.",
  },
];

// Redondances volontaires : (1) restrictions port de charges/station debout
// (admin + médico-psy), (2) bureautique de base (admin + formateur + insertion),
// (3) bon relationnel (médico-psy + formateur + insertion).
export const BONUS_A_DOUBLON_COUNT = 3;

/* ------------------------------------------------------------------ */
/* Bonus E — Vrai ou Faux IA (pari)                                   */
/* ------------------------------------------------------------------ */

export type IaVerdict = "vrai" | "faux" | "nuance";

export interface IaStatement {
  id: number;
  text: string;
  verdict: IaVerdict;
  explanation: string;
}

// Verdicts/explications rédigés en brouillon — à valider Mehdi/Réjane.
export const BONUS_E_STATEMENTS: IaStatement[] = [
  {
    id: 1,
    text: "L'IA peut remplacer une synthèse de réunion.",
    verdict: "faux",
    explanation:
      "Elle peut assembler et structurer des notes, mais elle n'a pas assisté à la réunion : elle n'invente pas le sens, elle l'orchestre. Le regard professionnel reste indispensable.",
  },
  {
    id: 2,
    text: "Mistral est hébergé entièrement en France.",
    verdict: "nuance",
    explanation:
      "Mistral est une société française et propose des options souveraines, mais l'hébergement effectif dépend de l'offre et de l'infrastructure cloud choisie. Ce n'est pas automatiquement « entièrement en France ».",
  },
  {
    id: 3,
    text: "L'IA est neutre, c'est l'humain qui biaise.",
    verdict: "faux",
    explanation:
      "L'IA reproduit et peut amplifier les biais présents dans ses données d'entraînement et dans la façon dont on la sollicite. Elle n'est pas neutre.",
  },
  {
    id: 4,
    text: "Plus un prompt est long, meilleure est la réponse.",
    verdict: "faux",
    explanation:
      "C'est la clarté et la précision qui comptent, pas la longueur. Un prompt trop long peut diluer la consigne.",
  },
  {
    id: 5,
    text: "L'IA ne peut pas mentir sciemment.",
    verdict: "nuance",
    explanation:
      "Elle n'a pas d'intention, donc pas de mensonge « volontaire ». Mais elle peut produire des affirmations fausses très plausibles (« hallucinations ») : l'effet pour l'utilisateur est le même qu'une erreur.",
  },
  {
    id: 6,
    text: "Le RGPD interdit d'utiliser ChatGPT au travail.",
    verdict: "faux",
    explanation:
      "Le RGPD n'interdit pas l'outil. Il encadre l'usage : pas de données personnelles sensibles sans précaution, vigilance sur la confidentialité et l'hébergement.",
  },
  {
    id: 7,
    text: "L'IA générative a une mémoire d'une conversation à l'autre.",
    verdict: "nuance",
    explanation:
      "Par défaut, non : chaque conversation repart de zéro. Certaines offres ajoutent une fonction « mémoire » optionnelle, qu'il faut activer et paramétrer.",
  },
  {
    id: 8,
    text: "Une IA peut générer des images de personnes identifiables sans autorisation.",
    verdict: "nuance",
    explanation:
      "Techniquement, c'est possible. Juridiquement et éthiquement, c'est encadré (droit à l'image, données personnelles) : ce n'est pas parce que c'est faisable que c'est permis.",
  },
  {
    id: 9,
    text: "Le mot « IA » désigne toujours la même chose.",
    verdict: "faux",
    explanation:
      "« IA » est un terme parapluie : systèmes experts, apprentissage automatique, IA générative… des réalités techniques très différentes.",
  },
  {
    id: 10,
    text: "Demander « Sois bienveillant » à une IA garantit qu'elle le sera.",
    verdict: "faux",
    explanation:
      "Cela influence le ton, sans garantie. Le comportement dépend du modèle et du contexte : aucune consigne ne « garantit » un résultat.",
  },
];

/* ------------------------------------------------------------------ */
/* Bonus F — Le journal de Camille                                    */
/* ------------------------------------------------------------------ */

export const BONUS_F_JOURNAL_PROMPT = `Tu écris, à la PREMIÈRE PERSONNE, un fragment du journal intime de Camille Renaud (38 ans, en reconversion à l'ESRP après un accident du travail). Tu prends son point de vue, à un moment précis de son parcours indiqué par l'équipe.

Règles :
- ~200 mots, ton intime et sincère
- Doutes et fierté entremêlés, sans pathos
- Pas de jargon professionnel : c'est Camille qui écrit, pas un dossier
- Tu ne caricatures pas le handicap, tu donnes une voix digne et nuancée.`;

export const BONUS_F_MOMENTS: string[] = [
  "Le soir du premier jour à l'ESRP",
  "Le soir du 3e jour de stage en entreprise",
  "Le jour où Camille reçoit la convention de stage",
  "Un soir de doute, après une difficulté en formation",
  "Le jour d'un petit succès inattendu",
];

/* ------------------------------------------------------------------ */
/* Bonus G — Le pitch en 30 secondes                                  */
/* ------------------------------------------------------------------ */

export const BONUS_G_PITCH_PROMPT = `Tu rédiges, à la PREMIÈRE PERSONNE (Camille parle), un elevator pitch de présentation d'environ 30 secondes à l'oral (70 à 85 mots). Camille se présente en entretien pour un poste d'accueil-secrétariat.

À partir des 3 éléments forts fournis par l'équipe (une compétence, une motivation, un projet), tu produis un pitch :
- naturel, ni scolaire ni récité
- positif et concret, centré sur ce que Camille apporte
- qui se termine par une phrase d'ouverture
Tu rends UNIQUEMENT le texte du pitch, sans préambule.`;

/* ------------------------------------------------------------------ */
/* Bonus I — Le glossaire qui sauve                                   */
/* ------------------------------------------------------------------ */

export const BONUS_I_GLOSSAIRE_PROMPT = `Tu reçois un courrier administratif réel reçu par une personne accompagnée. Ta tâche :
1. Repère tous les acronymes et termes techniques (ex : RQTH, CDAPH, ESRP, RAPO, MDPH…).
2. Pour chacun, donne une définition FALC : une phrase courte (<15 mots), vocabulaire simple, sans autre jargon.

Réponds en Markdown, une ligne par terme : **TERME** : définition simple.
N'invente pas de terme absent du courrier.`;

