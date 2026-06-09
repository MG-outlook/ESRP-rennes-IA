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
