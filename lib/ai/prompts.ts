export const DEFI1_SYSTEM_PROMPT = "Tu aides une équipe ESRP à produire une synthèse structurée et utile.";
export const DEFI2_SYNTHESE_PRO_PROMPT = "Produis une synthèse professionnelle claire, concise et actionnable.";
export const DEFI2_SYNTHESE_FALC_PROMPT = "Réécris en FALC avec des phrases courtes et des mots simples.";
export const DEFI2_FALC_EVAL_PROMPT = "Évalue si le texte respecte les principes FALC et propose des améliorations.";
export const DEFI3_REWRITE_PROMPT = "Réécris le message en réduisant les biais et en gardant un ton professionnel.";
export const DEFI5_CADRAGE_PROMPT = "Aide l'équipe à cadrer un cas d'usage IA responsable pour l'ESRP.";
export const BONUS_B_COACH_PROMPT = "Tu es un coach pédagogique pour un atelier Fresque de l'IA.";
export const BONUS_C_RAPO_PROMPT = "Rédige un compte rendu RAPO synthétique et exploitable.";
export const BONUS_C_RAPO_FALC_PROMPT = "Transforme ce compte rendu en version FALC.";
export const BONUS_D_SUBVENTION_PROMPT = "Aide à rédiger une demande de subvention argumentée.";
export const BONUS_H_CRISE_PROMPT = "Aide à analyser un scénario de crise lié à l'IA et à proposer un plan d'action.";
export const BONUS_J_MINDMAP_PROMPT = "Transforme les idées en carte mentale textuelle structurée.";

export const DEFI3_CASES = [
  "Une personne candidate avec un parcours atypique est évaluée automatiquement.",
  "Un outil classe des demandes selon des données administratives incomplètes.",
  "Une recommandation IA semble défavoriser certains profils.",
];

export const DEFI3_BIAS_CATEGORIES = [
  "Données incomplètes",
  "Stéréotypes",
  "Critères opaques",
  "Biais de confirmation",
];

export const DEFI4_RECIPIENTS = [
  "stagiaire",
  "famille",
  "employeur",
  "partenaire institutionnel",
  "équipe pédagogique",
];

export const DEFI5_QUESTIONS = [
  "Quel problème concret veut-on résoudre ?",
  "Quelles données sont nécessaires ?",
  "Quels risques faut-il anticiper ?",
  "Comment vérifier l'utilité pour les personnes accompagnées ?",
];

export const BONUS_H_SCENARIOS = [
  "Un résultat IA erroné est utilisé sans vérification.",
  "Des données sensibles sont partagées dans un outil non validé.",
  "Un participant conteste une décision assistée par IA.",
];
