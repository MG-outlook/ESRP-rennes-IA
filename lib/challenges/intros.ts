// "Comment ça marche" intro content for each challenge, shown before it begins.
// Source: docs/01-fiches-defis-v2.md. Keep wording participant-friendly.

export interface ChallengeIntroContent {
  title: string;
  subtitle?: string;
  steps: string[];
  note?: string;
  duration?: string;
  startLabel?: string;
}

export const CHALLENGE_INTROS: Record<number, ChallengeIntroContent> = {
  2: {
    title: "Défi 2 — Le tri des observations",
    subtitle:
      "« Trois mois plus tard, on fait le point sur Camille. Mais toutes les notes ne se valent pas. »",
    duration: "15 min",
    steps: [
      "On vous donne 16 notes prises sur Camille après 3 mois de formation.",
      "Triez chaque note : à jeter, ou à ranger dans la bonne dimension (sociale, moral, formation, projection). Attention aux doublons, contradictions et hors-sujet !",
      "L'IA assemble une synthèse pluri-pro à partir des seules notes que vous gardez.",
      "Elle en produit aussi une version FALC, lisible par Camille elle-même, puis on débriefe le tri.",
    ],
    note: "L'IA n'invente rien — elle assemble ce que vous lui donnez. Si vous gardez du bruit, le compte-rendu en gardera la trace.",
  },
  3: {
    title: "Défi 3 — La Chasse aux mauvais prompts",
    subtitle:
      "« Quatre prompts maladroits à propos de Camille. Devinez le biais avant qu'il sorte. Puis corrigez. »",
    duration: "20 min",
    steps: [
      "On vous montre un prompt maladroit et la réponse de l'IA à propos de Camille.",
      "Devinez : quels types de biais se cachent dans ce prompt ?",
      "On révèle alors les biais réels et leur explication.",
      "Réécrivez le prompt pour obtenir quelque chose de vraiment utile. Et à la fin, une question bonus vous attend.",
    ],
    note: "Le but : comprendre que la qualité d'une réponse IA dépend d'abord de la qualité — et de la neutralité — de la question.",
  },
  4: {
    title: "Défi 4 — Une info, cinq destinataires",
    subtitle:
      "« Camille a un stage. La même info à dire à 5 personnes très différentes. L'IA décline, vous ajustez. »",
    duration: "20 min",
    steps: [
      "Lisez la convention de stage de Camille (langage administratif).",
      "Pariez : sur les 5 versions que l'IA va produire, combien seront utilisables sans aucune retouche ?",
      "L'IA génère 5 versions du message : pour Camille (FALC), ses parents, l'entreprise, le médecin, la MDPH.",
      "Relisez chaque version et ajustez : OK telle quelle, modifier, ou régénérer.",
    ],
    note: "Une même information n'a pas la même forme selon à qui on l'adresse. L'IA décline, mais c'est vous qui jugez la justesse.",
  },
  5: {
    title: "Défi 5 — Notre projet",
    subtitle:
      "« Vous avez vu ce que l'IA peut faire pour Camille. Maintenant, qu'en faites-vous chez vous, lundi matin ? »",
    duration: "20 min",
    steps: [
      "Choisissez parmi les défis précédents celui qui résonne le plus avec vos préoccupations métier.",
      "Brainstorm guidé : l'IA vous propose des amorces adaptées à votre équipe.",
      "L'IA vous aide à structurer : qui porte ? pour quoi faire ? comment, en 3 étapes sur 30 jours ?",
      "Vous repartez avec un projet concret et réaliste à mener dans votre service.",
    ],
    note: "Un seul projet par équipe. Concret. Réaliste. C'est votre engagement de sortie d'atelier.",
  },
  101: {
    title: "Bonus A — Le détective des doublons",
    subtitle: "« 4 rapports sur Camille. Combien d'informations sont répétées ? »",
    duration: "10 min",
    steps: [
      "Lisez les 4 rapports rédigés par différents professionnels sur Camille.",
      "Pariez : combien d'informations se répètent d'un rapport à l'autre ?",
      "L'IA analyse les redondances et révèle les doublons.",
      "Comparez avec votre pari.",
    ],
    note: "Quand l'info circule mal, chacun re-saisit ce que d'autres ont déjà noté. L'IA aide à repérer ces redondances.",
  },
  103: {
    title: "Bonus C — La pièce manquante",
    subtitle: "« Le dossier MDPH de Camille a perdu une pièce. La décision est en suspens. »",
    duration: "15 min",
    steps: [
      "Une pièce justificative manque au dossier de Camille : il faut faire un recours (RAPO).",
      "L'IA vous aide à rédiger un RAPO clair et factuel à la MDPH, en mode dialogue.",
      "Elle génère une version FALC pour expliquer à Camille ce qu'on fait.",
      "Vous repartez avec 2 courriers prêts à envoyer.",
    ],
    note: "Très peu d'équipes savent rédiger un RAPO. L'IA peut être un assistant administratif spécialisé.",
  },
  104: {
    title: "Bonus D — Brouillon de subvention",
    subtitle: "« Votre projet IA a besoin de financement. 8 minutes chrono. »",
    duration: "10 min",
    steps: [
      "L'IA propose une structure type : contexte, projet, budget, impact, indicateurs.",
      "Remplissez avec votre projet (le Pacte du Défi 5) et vos idées.",
      "L'IA peaufine le tout en une demande crédible et percutante.",
    ],
    note: "Rédiger une demande de subvention prend des heures. Avec l'IA, un premier brouillon solide tient en quelques minutes.",
  },
  105: {
    title: "Bonus E — Vrai ou Faux IA",
    subtitle: "« 10 affirmations sur l'IA. Vrai, Faux, ou Nuancé ? »",
    duration: "10 min",
    steps: [
      "Lisez chaque affirmation sur l'intelligence artificielle.",
      "En équipe, votez : Vrai, Faux, ou Nuancé.",
      "Révélez les réponses et découvrez les explications.",
      "Comptez votre score.",
    ],
    note: "Beaucoup d'idées reçues circulent sur l'IA. L'objectif : démêler le vrai du faux, ensemble.",
  },
  106: {
    title: "Bonus F — Le journal de Camille",
    subtitle: "« Et si on écrivait, à la première personne, un fragment du journal de Camille ? »",
    duration: "12 min",
    steps: [
      "Choisissez un moment du parcours de Camille.",
      "L'IA écrit avec vous, à la première personne, un fragment de son journal intime.",
      "Lisez ce que ça fait de se mettre à sa place.",
    ],
    note: "Changer de point de vue — écrire « je » à la place de Camille — aide à mieux comprendre son vécu.",
  },
  107: {
    title: "Bonus G — Le pitch en 30 secondes",
    subtitle: "« 3 éléments forts de Camille. L'IA rédige le pitch. Écoutez-le. »",
    duration: "15 min",
    steps: [
      "Donnez 3 éléments forts de Camille : une compétence, une motivation, un projet.",
      "L'IA rédige un pitch de présentation de 30 secondes.",
      "Écoutez-le lu à voix haute.",
    ],
    note: "Présenter quelqu'un en 30 secondes, de façon valorisante et juste, est un vrai exercice. L'IA donne un point de départ.",
  },
  108: {
    title: "Bonus H — Le scénario de crise",
    subtitle: "« Camille manque 3 jours sans prévenir. Que fait l'équipe ? »",
    duration: "15 min",
    steps: [
      "Choisissez un scénario de crise autour de l'absence de Camille.",
      "L'IA propose un protocole bienveillant de reprise de contact en 4 étapes.",
      "Ajustez chaque étape selon le profil de Camille.",
      "Rédigez le premier message de reprise de contact.",
    ],
    note: "Exercice de simulation. Les vrais protocoles de votre établissement priment toujours.",
  },
  109: {
    title: "Bonus I — Le glossaire qui sauve",
    subtitle: "« Un courrier plein de sigles. Produisez un mini-glossaire FALC. »",
    duration: "10 min",
    steps: [
      "Lisez le courrier administratif reçu par Camille — plein d'acronymes (RAPO, CDAPH, RQTH…).",
      "L'IA extrait les termes techniques et en produit une définition en langage simple (FALC).",
      "Vous repartez avec un mini-glossaire utilisable par tout l'établissement.",
    ],
    note: "Sans doute le bonus le plus immédiatement utile dès lundi : un glossaire FALC partagé.",
  },
  110: {
    title: "Bonus J — La carte mentale du parcours",
    subtitle: "« À partir du compte-rendu de Camille, produisez une carte mentale visuelle. »",
    duration: "12 min",
    steps: [
      "L'IA reçoit le compte-rendu pluri-pro de Camille.",
      "Elle en produit une structure en arborescence.",
      "La plateforme l'affiche en carte mentale visuelle.",
      "Simplifiez, réorganisez, exportez.",
    ],
    note: "Une carte mentale rend visible, en un coup d'œil, la cohérence — ou les angles morts — d'un parcours.",
  },
};
