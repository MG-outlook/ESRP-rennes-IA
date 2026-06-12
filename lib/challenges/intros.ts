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
  /**
   * « Pourquoi ce défi ? » — 2-3 phrases sur le concept IA démontré (ce que
   * l'IA sait/ne sait pas faire) et ce que ça change dans le quotidien
   * professionnel. Affiché avant les étapes, sur l'intro et dans le rappel.
   */
  pourquoi?: string;
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
    pourquoi:
      "L'IA générative sait dessiner, pas seulement écrire. Pour le médico-social, c'est un raccourci vers des supports accessibles (pictogrammes, consignes visuelles) qu'on n'aurait jamais le temps de créer soi-même — et le test à l'aveugle montre si le message passe vraiment sans texte.",
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
    pourquoi:
      "Un chatbot IA n'est pas un chatbot à scénarios qui enchaîne des réponses pré-écrites : il comprend vos arguments et y réagit vraiment. On peut donc s'entraîner aux conversations difficiles (collègue réticent, financeur exigeant) sans enjeu, et autant de fois qu'on veut.",
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
    pourquoi:
      "Une IA peut affirmer des choses fausses avec un aplomb parfait : c'est sa principale limite, et elle ne prévient pas. Ce défi muscle le réflexe professionnel n°1 : relire, vérifier, et ne jamais diffuser une production IA sans contrôle humain.",
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
    pourquoi:
      "Adapter un même message à trois publics prend des heures à la main ; l'IA le fait en quelques secondes — à condition qu'on lui dise précisément pour qui, dans quel registre, et ce qu'elle n'a pas le droit d'inventer. La compétence clé n'est pas technique : c'est savoir formuler la demande.",
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
    pourquoi:
      "L'IA est un excellent partenaire de brainstorming : elle propose vite, beaucoup, sans autocensure. Mais elle ne connaît ni votre service ni vos contraintes réelles : c'est votre expertise métier qui repère l'idée qui tient debout. L'IA élargit le champ, l'humain tranche.",
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
    pourquoi:
      "L'IA lit un dossier complet en quelques secondes et en restitue l'essentiel, métier par métier — un travail qui prend une heure à la main. Mais elle ne voit que ce qu'on lui donne, et chaque métier cherche des choses différentes dans le même dossier : le pari rend visible tout ce qu'on rate quand on lit seul.",
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
    pourquoi:
      "Une IA générative n'invente pas le contenu d'une synthèse : elle assemble ce qu'on lui fournit. Donnez-lui des notes contradictoires, des doublons ou des jugements de valeur, et ils se retrouveront dans le compte-rendu. Le tri humain en amont est LE geste professionnel qui change tout.",
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
    pourquoi:
      "L'IA répond à la question telle qu'elle est posée : un prompt biaisé produit une réponse biaisée, énoncée avec assurance. Savoir repérer un prompt maladroit et le reformuler, c'est protéger les personnes accompagnées des stéréotypes — c'est une compétence de vigilance, pas de technique.",
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
    pourquoi:
      "Trois courriers, trois destinataires, trois registres : une après-midi de travail à la main, une minute pour l'IA — si et seulement si on lui donne les bons documents et une consigne complète du premier coup. C'est exactement le geste qui fait gagner du temps au quotidien, et il s'apprend.",
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
    pourquoi:
      "Découvrir ne suffit pas : l'IA n'aura d'effet sur votre quotidien que si vous repartez avec UN usage concret, choisi par vous, à tester dans les 30 jours. Ce défi transforme l'atelier en engagement d'équipe — c'est lui qui décide de ce qui se passera lundi.",
    duration: "20 min",
    steps: [
      "Choisissez parmi les défis précédents celui qui résonne le plus avec vos préoccupations métier.",
      "Piochez dans la banque d'idées — des usages IA concrets vus aujourd'hui — pour amorcer votre besoin métier.",
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
    pourquoi:
      "Quand l'information circule mal, chacun re-saisit ce que d'autres ont déjà noté — et personne ne s'en aperçoit. Comparer plusieurs documents pour repérer les redondances est fastidieux pour un humain, instantané pour l'IA : un cas d'usage discret mais très rentable.",
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
    pourquoi:
      "Un chatbot IA n'est pas un chatbot à scénarios : il ne déroule pas un arbre de réponses pré-écrites, il comprend votre demande et s'adapte à chaque échange. Et quand on lui donne le dossier réel de Camille, ses conseils cessent d'être génériques : ils deviennent personnalisés.",
    duration: "15 min",
    steps: [
      "L'IA joue le rôle d'un coach d'entretien — et elle connaît le vrai dossier de Camille (lettre, restrictions, stage visé).",
      "Le dossier d'appui reste consultable : appuyez vos échanges sur les faits réels, pas sur la mémoire.",
      "Répondez tour à tour pour préparer Camille (3 échanges) : questions probables, réponses co-rédigées, conseils de posture.",
    ],
    note: "S'entraîner avant un entretien change tout. L'IA est un partenaire d'entraînement patient et disponible.",
  },
  103: {
    title: "Bonus C — La pièce manquante",
    subtitle: "« Le dossier MDPH de Camille a perdu une pièce. La décision est en suspens. »",
    objective:
      "Découvrir que l'IA peut jouer l'assistant administratif spécialisé pour rédiger un courrier technique comme un recours (RAPO).",
    pourquoi:
      "L'IA connaît les codes des écrits administratifs rares — comme un RAPO — que très peu de professionnels maîtrisent. Le partage des rôles est clair : à vous les faits et la vérification, à elle la forme. Et elle produit en bonus la version FALC pour que Camille comprenne sa propre démarche.",
    duration: "15 min",
    steps: [
      "Une décision de la MDPH pose problème : il faut faire un recours (RAPO) sous 2 mois.",
      "Choisissez une des situations réelles proposées (ou écrivez la vôtre) — le dossier de Camille est consultable sur place.",
      "Adaptez la situation avec vos mots et les références du dossier, puis lancez l'IA.",
      "Elle produit le RAPO officiel ET sa version FALC pour Camille : 2 courriers prêts à envoyer.",
    ],
    note: "Très peu d'équipes savent rédiger un RAPO. L'IA peut être un assistant administratif spécialisé.",
  },
  104: {
    title: "Bonus D — Brouillon de subvention",
    subtitle: "« Votre projet IA a besoin de financement. 8 minutes chrono. »",
    objective:
      "Constater que l'IA produit en quelques minutes un premier brouillon structuré là où il faudrait des heures.",
    pourquoi:
      "La première version d'un document long (dossier de subvention, projet de service) coûte des heures — c'est souvent ce qui empêche de se lancer. L'IA fournit un brouillon structuré en minutes : le vrai travail professionnel commence alors à la relecture, plus tôt et moins cher.",
    duration: "10 min",
    steps: [
      "Partez de votre Pacte du Défi 5, ou d'un des trois exemples de projets IA médico-sociaux proposés.",
      "Adaptez les trois champs (nom, objectif, budget) à votre réalité.",
      "L'IA structure le tout (contexte, projet, budget, impact, indicateurs) en une demande crédible et percutante.",
    ],
    note: "Rédiger une demande de subvention prend des heures. Avec l'IA, un premier brouillon solide tient en quelques minutes.",
  },
  105: {
    title: "Bonus E — Vrai ou Faux IA",
    subtitle: "« 10 affirmations sur l'IA. Vrai, Faux, ou Nuancé ? »",
    objective:
      "Démêler le vrai du faux sur l'IA pour cerner ce qu'elle peut et ne peut pas faire, sans idées reçues.",
    pourquoi:
      "Sur l'IA, les idées reçues circulent dans les deux sens : la peur (« elle va nous remplacer ») comme l'emballement (« elle ne se trompe jamais »). Savoir précisément ce qu'elle peut et ne peut pas faire est le socle d'un usage professionnel serein — et la plupart des réponses sont nuancées.",
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
    pourquoi:
      "L'IA peut changer de point de vue et écrire « je » à la place de quelqu'un d'autre. Utilisé avec précaution, c'est un outil d'empathie : il aide l'équipe à se représenter ce que vit la personne — sans jamais prétendre parler à sa place dans la vraie vie. La frontière entre les deux, c'est vous qui la tenez.",
    duration: "12 min",
    steps: [
      "Choisissez un moment du parcours de Camille.",
      "Rédigez votre consigne à l'IA : l'émotion dominante, ce que Camille réalise, le ton à éviter.",
      "Vous avez 3 essais : comparez-les et choisissez le fragment le plus juste et le plus digne.",
      "L'IA donne son regard sur la justesse du texte ; vous notez ce que ce changement de point de vue vous fait comprendre.",
    ],
    note: "Changer de point de vue — écrire « je » à la place de Camille — aide à mieux comprendre son vécu. C'est votre consigne et votre choix qui font la justesse du texte.",
  },
  107: {
    title: "Bonus G — Le pitch en 30 secondes",
    subtitle: "« 3 éléments forts de Camille. L'IA rédige le pitch. Écoutez-le. »",
    objective:
      "Voir que l'IA donne un point de départ solide pour présenter quelqu'un de façon valorisante et juste.",
    pourquoi:
      "L'IA transforme trois faits bruts en un texte fluide et valorisant, puis le navigateur le lit à voix haute. Cette boucle écrire-écouter-ajuster, impossible à faire vite tout seul, devient un exercice de quelques minutes — directement réutilisable avec les personnes que vous accompagnez.",
    duration: "15 min",
    steps: [
      "Piochez 3 éléments forts dans le vrai dossier de Camille (consultable sur place) : une compétence, une motivation, un projet.",
      "Faites générer deux pitchs (ajustez les éléments entre les deux essais).",
      "Écoutez-les à voix haute et comparez-les.",
      "Choisissez le meilleur et dites, en une ligne, pourquoi.",
    ],
    note: "Présenter quelqu'un en 30 secondes, de façon valorisante et juste, est un vrai exercice. L'IA donne un point de départ — c'est votre choix qui tranche.",
  },
  108: {
    title: "Bonus H — Le scénario de crise",
    subtitle: "« Camille manque 3 jours sans prévenir. Que fait l'équipe ? »",
    objective:
      "Comprendre que l'IA peut proposer un protocole structuré à adapter — jamais à appliquer sans le jugement du professionnel.",
    pourquoi:
      "Face à une situation difficile, l'IA propose en quelques secondes un protocole structuré — une base de discussion, jamais une décision. En écrivant d'abord VOTRE SMS puis en le comparant au sien, vous pratiquez le bon usage : l'IA outille la réflexion, l'humain garde la main.",
    duration: "15 min",
    steps: [
      "Choisissez un scénario de crise autour de Camille.",
      "À vous d'abord : rédigez en équipe VOTRE SMS de premier contact.",
      "L'IA propose alors son protocole en 4 étapes et son propre SMS.",
      "Elle donne son regard sur votre SMS : ce qu'il réussit, une amélioration possible. Comparez et discutez.",
    ],
    note: "Exercice de simulation. Les vrais protocoles de votre établissement priment toujours.",
  },
  109: {
    title: "Bonus I — Le glossaire qui sauve",
    subtitle: "« Un courrier plein de sigles. Produisez un mini-glossaire FALC. »",
    objective:
      "Découvrir que l'IA traduit instantanément le jargon administratif en langage simple (FALC) directement réutilisable.",
    pourquoi:
      "Le jargon est invisible pour qui le pratique : à force de manier RQTH, CDAPH et RAPO, on ne voit plus que ces sigles bloquent les personnes accompagnées. L'IA, elle, les relève systématiquement et les traduit en langage simple — la chasse préalable vous le prouvera.",
    duration: "10 min",
    steps: [
      "Lisez le courrier administratif reçu par Camille — plein d'acronymes (RAPO, CDAPH, RQTH…).",
      "À vous d'abord : relevez vous-mêmes tous les termes qui peuvent bloquer la compréhension.",
      "La révélation : combien des 9 termes piégés avez-vous repérés ? (Quand on connaît le jargon, on ne le voit plus.)",
      "L'IA produit alors le glossaire FALC complet : un mini-glossaire utilisable par tout l'établissement.",
    ],
    note: "Sans doute le bonus le plus immédiatement utile dès lundi : un glossaire FALC partagé.",
  },
  110: {
    title: "Bonus J — La carte mentale du parcours",
    subtitle: "« À partir du compte-rendu de Camille, produisez une carte mentale visuelle. »",
    objective:
      "Voir que l'IA peut structurer un compte-rendu en arborescence visuelle pour révéler, d'un coup d'œil, la cohérence d'un parcours.",
    pourquoi:
      "L'IA sait restructurer un texte linéaire en arborescence. Une carte mentale révèle d'un coup d'œil la cohérence — ou les trous — d'un parcours, et devient un support d'échange visuel avec la personne accompagnée, bien plus parlant qu'un compte-rendu de trois pages.",
    duration: "12 min",
    steps: [
      "Rédigez une consigne décrivant la carte voulue : point central, grandes branches, niveau de détail.",
      "Faites générer deux structures et comparez-les.",
      "Choisissez la plus claire.",
      "Simplifiez et réorganisez le plan à votre main — la carte se met à jour.",
    ],
    note: "Une carte mentale rend visible, en un coup d'œil, la cohérence — ou les angles morts — d'un parcours. C'est en la réorganisant que vous vous l'appropriez.",
  },
  301: {
    title: "Cas d'usage 1 — La mission documentaire",
    subtitle:
      "« Une mission réelle, 16 pièces dans le dossier, et une question : que donner à l'IA ? »",
    objective:
      "Apprendre le geste IA n°1 du quotidien : sélectionner le bon contexte documentaire — rien de plus, rien de moins.",
    pourquoi:
      "Au quotidien, le talent le plus utile avec l'IA n'est pas d'écrire des prompts : c'est de choisir quoi lui donner. Trop de pièces : du bruit. Pas assez : des trous. Et certaines pièces — celles qui concernent d'autres personnes — ne doivent JAMAIS lui être confiées.",
    duration: "20 min",
    steps: [
      "Une mission du quotidien est tirée au sort pour votre équipe (point MDPH, stage, entretien, médecin…).",
      "Parcourez le fond documentaire : 16 pièces, des utiles, des superflues, des périmées… et une interdite.",
      "Cochez les pièces pertinentes pour VOTRE mission, rédigez votre consigne, lancez l'IA.",
      "La révélation : votre sélection est comparée à la sélection idéale, et le livrable est évalué. Double score sur 20.",
    ],
    note: "Une des 16 pièces ne doit jamais être transmise à une IA, quelle que soit la mission. Saurez-vous la repérer ?",
  },
  302: {
    title: "Cas d'usage 2 — Le simulateur d'entretien",
    subtitle:
      "« Avant de proposer cet outil à une personne accompagnée… testez-le vous-même. »",
    objective:
      "Éprouver de l'intérieur un simulateur d'entretien IA (examen, stage, embauche) pour décider, en professionnel, de son usage.",
    pourquoi:
      "Avant de confier un outil IA à une personne accompagnée, le professionnel doit l'avoir testé lui-même. En jouant le candidat, vous éprouvez le simulateur de l'intérieur : ses qualités (patience, réalisme, disponibilité), ses limites, et les précautions à prendre.",
    duration: "20 min",
    steps: [
      "Choisissez la situation : oral d'examen, entretien pour un stage, ou entretien d'embauche.",
      "L'IA joue l'interlocuteur (jury, employeur, RH) — vous jouez le candidat, comme le ferait une personne accompagnée. 6 échanges maximum.",
      "À la fin : débrief bienveillant du coach et score sur votre prestation de candidat.",
      "La question pro avant de valider : confieriez-vous cet entraînement à une personne que vous accompagnez ? Quelles précautions ?",
    ],
    note: "L'IA ne joue jamais une personne accompagnée — elle joue l'interlocuteur externe. C'est vous qui vous mettez à la place de la personne.",
  },
  303: {
    title: "Cas d'usage 3 — Le débrief vocal",
    subtitle:
      "« Chacun dicte sa note de la semaine. L'IA compile. L'équipe décide. »",
    objective:
      "Compiler les vécus de chaque métier par la voix, puis trier les actions que l'IA propose : l'IA propose, l'équipe dispose.",
    pourquoi:
      "Parler est plus rapide qu'écrire : la voix abaisse la barrière de la transmission, surtout en fin de semaine chargée. Et quand l'IA propose ensuite un plan d'action daté, la règle d'or s'applique : chaque action se choisit ou se refuse — l'IA propose, l'équipe dispose.",
    duration: "20 min",
    steps: [
      "Lisez le contexte et la fiche de vécu de votre métier (dossier d'appui) : c'est votre matière, rien à inventer.",
      "Chacun dicte sa note de débrief au micro (ou la tape) et l'ajoute à son nom.",
      "L'IA compile : convergences, signaux faibles, résumé — puis propose un plan d'actions formatées (action, responsable, échéance).",
      "À vous de trancher : cochez les actions que vous retenez vraiment. Votre discernement est évalué, pas votre obéissance.",
    ],
    note: "Dictée vocale via le navigateur (Chrome ou Edge conseillé). Sans micro, le clavier fait parfaitement l'affaire.",
  },
  304: {
    title: "Cas d'usage 4 — La synthèse d'accueil du copil",
    subtitle:
      "« Un nouveau membre arrive au copil après 3 réunions. Mettez-le à niveau en un prompt. »",
    objective:
      "Produire une note d'accueil fidèle à 3 comptes-rendus de réunion — en choisissant les bonnes pièces et en rédigeant soi-même le prompt.",
    pourquoi:
      "Intégrer un nouveau membre après plusieurs réunions coûte cher : relectures, explications orales, décisions oubliées. Avec les bons comptes-rendus (les versions VALIDÉES, pas les brouillons !) et un prompt précis, l'IA produit la note d'accueil en minutes — fidèle, ou pas, selon ce que vous lui donnez.",
    duration: "20 min",
    steps: [
      "La situation : un nouveau membre rejoint le copil « IA à l'ESRP » à la 4e réunion.",
      "Lisez le fond documentaire : 8 pièces, dont des pièges (brouillon contradictoire, CR d'un autre groupe, réunion annulée…).",
      "Cochez les bonnes pièces et rédigez VOTRE prompt : destinataire, format, contenu attendu, interdiction d'inventer. 2 essais.",
      "L'évaluation porte sur trois choses : le choix des pièces, la couverture des points clés, la qualité du prompt.",
    ],
    note: "Le piège classique en vrai comme ici : donner à l'IA un brouillon non validé. Elle écrira ses erreurs avec une parfaite assurance.",
  },
};
