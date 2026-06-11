// "Comment ça marche" intro content for each challenge, shown before it begins.
// Source: docs/01-fiches-defis-v2.md. Keep wording participant-friendly.

export interface ChallengeIntroContent {
  title: string;
  subtitle?: string;
  /**
   * One-line learning objective: what this challenge helps participants
   * understand about what AI can (and cannot) do. Shown prominently under the
   * subtitle so every challenge makes sense to the people doing it.
   */
  objective?: string;
  steps: string[];
  note?: string;
  duration?: string;
  startLabel?: string;
}

export const CHALLENGE_INTROS: Record<number, ChallengeIntroContent> = {
  201: {
    title: "Défi A — Le pictogramme express",
    subtitle: "« Faire comprendre une consigne sans une seule ligne de texte. »",
    objective:
      "Découvrir que l'IA ne produit pas que du texte : elle génère aussi du visuel, un vrai atout pour l'accessibilité et le FALC.",
    duration: "13 min",
    steps: [
      "Une consigne simple vous est tirée au sort.",
      "Rédigez un prompt pour que l'IA dessine un pictogramme clair (boutons d'aide à disposition) + une légende de 5 mots max.",
      "Test à l'aveugle : une IA « tierce » voit le visuel sans le texte et devine le message.",
      "Score automatique selon la clarté réelle, la qualité du prompt et l'accessibilité.",
    ],
    note: "L'IA produit aussi du visuel : un atout direct pour le FALC et l'accessibilité.",
  },
  202: {
    title: "Défi B — Le client mystère",
    subtitle: "« S'entraîner à convaincre, sans enjeu réel. »",
    objective:
      "Comprendre que l'IA peut servir de partenaire d'entraînement pour argumenter et convaincre, sans aucun enjeu réel.",
    duration: "14 min",
    steps: [
      "Choisissez un interlocuteur (collègue inquiet, partenaire sceptique, financeur).",
      "Dialoguez avec lui via l'IA pour faire évoluer sa position. Une jauge monte selon vos arguments.",
      "Objectif : dépasser 75/100 avant la fin des échanges.",
      "Bilan : score sur l'atteinte de l'objectif, l'argumentation et la posture.",
    ],
    note: "L'IA ne joue jamais une personne accompagnée : seulement un acteur externe ou collectif.",
  },
  203: {
    title: "Défi C — La chasse à l'hallu",
    subtitle: "« L'IA se trompe avec aplomb. Le pro garde le dernier mot. »",
    objective:
      "Intégrer une limite essentielle : l'IA peut se tromper avec assurance — le réflexe clé est de ne jamais la croire sur parole.",
    duration: "12 min",
    steps: [
      "Lisez une note rédigée par l'IA : elle a l'air sérieuse… mais contient des pièges.",
      "Repérez les passages problématiques et indiquez pourquoi (faux, jargon, inventé, inapproprié, donnée sensible).",
      "Attention aux fausses alertes : signaler un passage correct fait perdre des points.",
      "Correction automatique : les pièges réels sont révélés, avec votre score.",
    ],
    note: "Le réflexe à muscler : ne jamais croire l'IA sur parole.",
  },
  204: {
    title: "Défi D — Le caméléon",
    subtitle: "« Un même message, plusieurs publics, sans trahir le sens. »",
    objective:
      "Voir que l'IA sait adapter un même message à plusieurs publics (pro, FALC, partenaire) sans en trahir le sens — à condition de bien le lui demander.",
    duration: "14 min",
    steps: [
      "Lisez la note d'origine à transmettre à trois publics : l'équipe (pro), une personne accompagnée (FALC) et un partenaire extérieur.",
      "Rédigez vous-même un prompt pour que l'IA produise les trois versions d'un coup, sans rien trahir.",
      "Vous avez 3 essais : ajustez votre prompt d'un essai à l'autre pour obtenir le meilleur résultat.",
      "Comparez vos 3 essais, choisissez le meilleur : l'IA l'évalue alors et attribue les points.",
    ],
    note: "C'est votre prompt qui fait la qualité du résultat : un bon prompt dit quoi produire, pour qui, et ce qu'il ne faut pas inventer.",
  },
  205: {
    title: "Défi E — La fabrique à idées",
    subtitle: "« L'IA comme partenaire de créativité, pas d'exécution. »",
    objective:
      "Expérimenter l'IA comme partenaire de créativité : faire émerger des usages concrets et inattendus, à vous de trancher.",
    duration: "13 min",
    steps: [
      "Deux cartes sont tirées au sort : une situation et une contrainte forte.",
      "Faites générer 10 usages concrets de l'IA, dont 3 audacieux.",
      "Sélectionnez UNE idée et défendez-la en 3 lignes.",
      "Score selon l'originalité, la faisabilité, le respect de la contrainte et l'éthique.",
    ],
    note: "La contrainte casse les idées convenues — et fait surgir l'inattendu.",
  },
  1: {
    title: "Défi 1 — La Pré-admission",
    subtitle:
      "« Le dossier de Camille vient d'arriver. Que voit chaque métier dans le même dossier ? »",
    objective:
      "Comprendre que l'IA sait synthétiser un dossier dense en une fiche pluri-métiers — mais qu'elle ne voit que ce que vous lui donnez.",
    duration: "20 min",
    steps: [
      "Lisez le dossier de Camille : trois documents (courrier MDPH, lettre de motivation, fiche médicale).",
      "Pariez avant l'IA : pour chaque métier de votre équipe, estimez combien d'informations utiles à votre métier se cachent dans le dossier (de 0 à 10).",
      "L'IA produit la fiche de synthèse pluri-pro en 4 sections, une par métier.",
      "La Vérité : on révèle les informations réellement présentes pour chaque métier, et on compare à votre pari.",
    ],
    note: "Chaque métier voit des choses différentes dans le même dossier — et l'on découvre ce qu'on rate seul·e.",
  },
  2: {
    title: "Défi 2 — Le tri des observations",
    subtitle:
      "« Trois mois plus tard, on fait le point sur Camille. Mais toutes les notes ne se valent pas. »",
    objective:
      "Saisir que l'IA assemble ce qu'on lui donne sans rien inventer : la qualité du tri en entrée fait la qualité de la synthèse en sortie.",
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
    objective:
      "Comprendre que la qualité d'une réponse IA dépend d'abord de la qualité — et de la neutralité — de la question qu'on lui pose.",
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
    title: "Défi 4 — Trois courriers, un seul prompt",
    subtitle:
      "« La direction vous demande d'officialiser le stage de Camille auprès de 3 destinataires. En un seul prompt. »",
    objective:
      "Découvrir qu'avec le bon contexte et une consigne précise, l'IA produit plusieurs livrables d'un coup — et fait gagner un temps réel.",
    duration: "20 min",
    steps: [
      "Lisez la demande de la direction : 3 courriers à produire (à Camille en FALC, à la MDPH, à l'entreprise).",
      "Choisissez quels documents l'IA doit avoir en mémoire — elle ne verra QUE ceux que vous cochez.",
      "Écrivez UN seul prompt pour obtenir les 3 courriers d'un coup. Vous avez 3 essais maximum.",
      "L'IA évalue à la fin : qualité de votre prompt, qualité des courriers, avec un malus si vous avez multiplié les essais.",
    ],
    note: "Le bon réflexe IA : donner le bon contexte (les bons documents) et une consigne précise — du premier coup. C'est ce qui fait gagner du temps.",
  },
  5: {
    title: "Défi 5 — Notre projet",
    subtitle:
      "« Vous avez vu ce que l'IA peut faire pour Camille. Maintenant, qu'en faites-vous chez vous, lundi matin ? »",
    objective:
      "Transformer ce que vous avez appris sur l'IA en un projet concret et réaliste à mener dans votre propre service.",
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
    objective:
      "Voir que l'IA repère vite les redondances entre plusieurs documents — précieux quand l'information circule mal.",
    duration: "10 min",
    steps: [
      "Lisez les 4 rapports rédigés par différents professionnels sur Camille.",
      "Pariez : combien d'informations se répètent d'un rapport à l'autre ?",
      "L'IA analyse les redondances et révèle les doublons.",
      "Comparez avec votre pari.",
    ],
    note: "Quand l'info circule mal, chacun re-saisit ce que d'autres ont déjà noté. L'IA aide à repérer ces redondances.",
  },
  102: {
    title: "Bonus B — Le coach d'entretien",
    subtitle: "« Camille passe un entretien dans une PME. Préparez-la avec l'IA. »",
    objective:
      "Comprendre que l'IA est un partenaire d'entraînement patient et disponible pour préparer un entretien.",
    duration: "15 min",
    steps: [
      "L'IA joue le rôle d'un coach d'entretien et vous pose des questions.",
      "Répondez tour à tour pour préparer Camille (3 échanges).",
      "Le coach propose des questions probables, co-rédige des réponses et donne des conseils concrets.",
    ],
    note: "S'entraîner avant un entretien change tout. L'IA est un partenaire d'entraînement patient et disponible.",
  },
  103: {
    title: "Bonus C — La pièce manquante",
    subtitle: "« Le dossier MDPH de Camille a perdu une pièce. La décision est en suspens. »",
    objective:
      "Découvrir que l'IA peut jouer l'assistant administratif spécialisé pour rédiger un courrier technique comme un recours (RAPO).",
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
    objective:
      "Constater que l'IA produit en quelques minutes un premier brouillon structuré là où il faudrait des heures.",
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
    objective:
      "Démêler le vrai du faux sur l'IA pour cerner ce qu'elle peut et ne peut pas faire, sans idées reçues.",
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
    objective:
      "Explorer l'IA comme outil d'empathie : changer de point de vue et écrire « je » pour mieux comprendre le vécu de Camille.",
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
    objective:
      "Voir que l'IA donne un point de départ solide pour présenter quelqu'un de façon valorisante et juste.",
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
    objective:
      "Comprendre que l'IA peut proposer un protocole structuré à adapter — jamais à appliquer sans le jugement du professionnel.",
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
    objective:
      "Découvrir que l'IA traduit instantanément le jargon administratif en langage simple (FALC) directement réutilisable.",
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
    objective:
      "Voir que l'IA peut structurer un compte-rendu en arborescence visuelle pour révéler, d'un coup d'œil, la cohérence d'un parcours.",
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
