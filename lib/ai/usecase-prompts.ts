// Contenu pédagogique des « Cas d'usage métier » (défis 301-304).
// Mises en situation réelles du quotidien professionnel : l'intérêt de l'IA
// pour le métier de chacun, pour le collectif et pour la personne accompagnée.

const JSON_ONE_LINE = `Réponds UNIQUEMENT par un JSON valide sur une seule ligne, sans aucun texte autour ni bloc de code`;

/* ------------------------------------------------------------------ */
/* 301 — La mission documentaire                                      */
/* ------------------------------------------------------------------ */

export interface Uc1Mission {
  id: string;
  label: string;
  /** La demande telle qu'elle arrive dans le quotidien. */
  brief: string;
  /** Pièces réellement nécessaires (vérité terrain de la sélection). */
  expectedIds: string[];
  /** Ce que le juge doit vérifier dans la synthèse. */
  judgeFocus: string;
}

export const UC1_MISSIONS: Uc1Mission[] = [
  {
    id: "mdph",
    label: "Le point d'étape pour la MDPH",
    brief:
      "La MDPH demande un point d'étape sur l'orientation de Camille : où en est la reconversion, quels progrès, quelles difficultés ? Format attendu : une note d'une page, factuelle, citant la référence du dossier.",
    expectedIds: [
      "notif_mdph",
      "rapport_admin",
      "rapport_formateur",
      "rapport_insertion",
      "cr_equipe",
    ],
    judgeFocus:
      "La note cite la référence MDPH, couvre les progrès en formation, le projet professionnel à date et les difficultés (transport en attente), sans donnée médicale superflue.",
  },
  {
    id: "entreprise",
    label: "Le point intermédiaire de stage",
    brief:
      "Le point intermédiaire avec Bureaux & Solutions a lieu après-demain (fin de semaine 2 du stage). Préparez la trame du point : ce qui va bien, les points d'attention, les ajustements à proposer (pauses, aide sur le logiciel).",
    expectedIds: [
      "convention_stage",
      "mail_tutrice",
      "fiche_medicale",
      "rapport_insertion",
    ],
    judgeFocus:
      "La trame s'appuie sur le retour réel de la tutrice (fatigue en fin de journée, n'ose pas demander d'aide), rappelle le cadre de la convention et propose des ajustements compatibles avec les restrictions médicales.",
  },
  {
    id: "camille",
    label: "L'entretien de mi-parcours avec Camille",
    brief:
      "Vous recevez Camille en entretien de mi-parcours la semaine prochaine. Préparez la trame : les progrès à valoriser, les difficultés à aborder sans la décourager, et 3 questions ouvertes à lui poser.",
    expectedIds: [
      "lettre_motivation",
      "rapport_formateur",
      "rapport_medico",
      "cr_equipe",
      "mail_tutrice",
    ],
    judgeFocus:
      "La trame relie les progrès observés aux motivations exprimées par Camille dans sa lettre, aborde la fatigue et la peur de l'échec avec tact, et propose des questions ouvertes non culpabilisantes.",
  },
  {
    id: "medecin",
    label: "La réponse au médecin du travail",
    brief:
      "Le Dr Lefèvre (médecin du travail) demande un point sur la tolérance réelle du poste : les restrictions sont-elles respectées, comment Camille vit-elle le rythme ? Préparez une réponse factuelle et concise.",
    expectedIds: [
      "fiche_medicale",
      "mail_tutrice",
      "note_incident",
      "rapport_medico",
    ],
    judgeFocus:
      "La réponse rapporte les faits utiles au médecin : l'épisode du carton (restriction dépassée puis recadrée), la fatigue de fin de journée signalée en stage, la tendance de Camille à minimiser — sans jugement ni diagnostic.",
  },
];

export const UC1_GENERATION_PROMPT = `Tu es un assistant de rédaction pour une équipe pluri-professionnelle d'ESRP. Tu réponds à la mission décrite par l'équipe en t'appuyant UNIQUEMENT sur les documents fournis ci-dessous. Si une information nécessaire n'y figure pas, écris [à vérifier] — tu n'inventes rien. Ton professionnel, factuel, bienveillant. Réponds en Markdown clair (~250 mots).`;

export const UC1_JUDGE_PROMPT = `Tu es évaluateur d'un atelier IA médico-social. Une équipe devait produire ce livrable : « {MISSION} ». Critères spécifiques : {FOCUS}. Voici le livrable produit : {RESULTAT}.
Évalue la qualité du livrable sur 10 (pertinence par rapport à la mission, fidélité aux faits, ton adapté). Sois court et bienveillant. ${JSON_ONE_LINE} : {"qualite":n,"point_fort":"...","a_ameliorer":"...","conseil":"..."}`;

/* ------------------------------------------------------------------ */
/* 302 — Le simulateur d'entretien                                    */
/* ------------------------------------------------------------------ */

export const UC2_MAX_TURNS = 6;

export interface Uc2Scenario {
  id: string;
  label: string;
  brief: string;
  system: string;
}

const UC2_COMMON_RULES = `Règles communes :
- Tu poses UNE question à la fois, puis tu attends la réponse.
- Tes questions sont réalistes mais bienveillantes : tu mets en confiance, tu reformules si la réponse est confuse, tu ne pièges jamais.
- Tu t'adaptes au niveau des réponses : si le candidat est en difficulté, tu simplifies et tu encourages ; s'il est à l'aise, tu approfondis.
- Tu vouvoies. Tu ne demandes JAMAIS de données personnelles réelles (nom complet, adresse, détails médicaux) : si on t'en donne, tu invites gentiment à rester sur des éléments généraux.
- Tu ne sors jamais de ton rôle.`;

export const UC2_SCENARIOS: Uc2Scenario[] = [
  {
    id: "examen",
    label: "L'oral d'examen (titre professionnel)",
    brief:
      "Le jury de l'oral du titre professionnel « Employé administratif et d'accueil ». Il interroge sur le dossier professionnel, les compétences acquises et les situations vécues en stage.",
    system:
      `Tu joues un membre de jury de l'oral du titre professionnel « Employé administratif et d'accueil » (niveau 3). Le candidat est un adulte en reconversion, en fin de parcours en ESRP. Tu évalues la capacité à présenter son parcours, à décrire des situations professionnelles concrètes et à parler de ses compétences.\n\n` +
      UC2_COMMON_RULES,
  },
  {
    id: "stage",
    label: "L'entretien pour un stage",
    brief:
      "Le responsable d'une PME locale qui reçoit un candidat pour un stage de 3 semaines au pôle accueil-secrétariat. Il veut cerner la motivation et les besoins d'adaptation.",
    system:
      `Tu joues le gérant d'une PME rennaise (40 salariés) qui reçoit un candidat pour un stage de 3 semaines au pôle accueil-secrétariat. Tu veux cerner sa motivation, ce qu'il sait déjà faire, et comment bien l'accueillir (tu es ouvert aux aménagements, il suffit de t'expliquer lesquels). Tu poses aussi une question pratique (horaires, logiciels connus).\n\n` +
      UC2_COMMON_RULES,
  },
  {
    id: "embauche",
    label: "L'entretien d'embauche",
    brief:
      "Une responsable RH qui recrute un agent d'accueil en CDD. Questions RH classiques : parcours, motivation, qualités, questions du candidat.",
    system:
      `Tu joues une responsable RH qui recrute un agent d'accueil en CDD de 6 mois (poste assis, accueil physique et téléphonique, courrier). Tu mènes un entretien RH classique et structuré : présentation, parcours, motivation pour le poste, une mise en situation simple (« un visiteur mécontent se présente à l'accueil… »), et tu termines en demandant si le candidat a des questions.\n\n` +
      UC2_COMMON_RULES,
  },
];

export const UC2_DEBRIEF_PROMPT = `Tu es un coach bienveillant d'un atelier IA médico-social. Une équipe de professionnels vient de tester un simulateur d'entretien en jouant le rôle du candidat (scénario : {SCENARIO}). Voici la transcription : {TRANSCRIPT}.

Fais d'abord un retour au candidat en 4 à 6 phrases : ce qui était convaincant, ce qui mérite d'être travaillé, un conseil concret pour le jour J. Vouvoie, reste encourageant et précis (cite des moments de l'échange).

Puis, sur une NOUVELLE LIGNE, termine par exactement : VERDICT: {"preparation":n,"clarte":n,"posture":n,"point_fort":"...","a_ameliorer":"...","conseil":"..."} où preparation est sur 8 (réponses étayées par des exemples concrets), clarte sur 6 (réponses structurées et compréhensibles), posture sur 6 (ton positif, ni survendu ni dévalorisé). JSON valide sur une seule ligne.`;

/* ------------------------------------------------------------------ */
/* 303 — Le débrief vocal                                             */
/* ------------------------------------------------------------------ */

export const UC3_CONTEXTE = `Nous sommes vendredi, fin de la semaine 2 du stage de Camille chez Bureaux & Solutions. Le point intermédiaire avec la tutrice a eu lieu hier. Chaque membre de l'équipe a vécu cette semaine depuis son métier — et chacun enregistre sa note de débrief avant la réunion de lundi.`;

/** Fiches de vécu par métier : la matière réelle dont chacun s'inspire pour dicter sa note. */
export const UC3_VECUS: { role: string; vecu: string }[] = [
  {
    role: "Administratif",
    vecu: `Votre semaine : la réponse au transport adapté est ENFIN arrivée — accordé, mise en place sous 3 semaines. En revanche, l'attestation de présence en stage demandée par la caisse n'a pas encore été signée par l'entreprise, malgré deux relances. Le dossier de renouvellement des aménagements d'examen doit partir avant la fin du mois.`,
  },
  {
    role: "Médico-psy-social",
    vecu: `Votre semaine : Camille est venue vous voir mardi, fatiguée mais souriante. Elle dort mal le mercredi soir (appréhension des jeudis chargés). Elle a évoqué, pour la première fois sans angoisse, « l'après-stage ». Point de vigilance : elle a encore minimisé un épisode de douleur lombaire dimanche dernier, « pour ne pas inquiéter ».`,
  },
  {
    role: "Formation",
    vecu: `Votre semaine : au retour d'atelier du lundi, Camille a montré au groupe une astuce de publipostage apprise en stage — beau moment. Elle demande à travailler le logiciel de courrier utilisé chez Bureaux & Solutions (elle n'ose pas demander d'aide là-bas). Vous pourriez monter un mini-module la semaine prochaine.`,
  },
  {
    role: "Insertion pro",
    vecu: `Votre semaine : la tutrice (point d'hier) est très positive : ponctualité, standard maîtrisé, bonne intégration. Elle évoque même, à demi-mot, « un besoin récurrent au pôle accueil » à partir de janvier. Les ajustements (pause de 15 h 30) sont en place depuis lundi et fonctionnent. Reste à caler la visite de mi-stage avec le référent.`,
  },
];

export const UC3_COMPILE_PROMPT = `Tu es un assistant de débrief d'équipe pluri-professionnelle en ESRP. On te donne les notes de débrief (dictées) de plusieurs membres de l'équipe à propos de la semaine 2 du stage de Camille.

Produis en Markdown :
1. « ## Ce qui converge » — les constats partagés entre plusieurs notes (2-4 puces).
2. « ## Ce qui mérite attention » — divergences, signaux faibles, informations qu'une seule personne détient (2-4 puces).
3. « ## Résumé en 3 phrases » — le débrief que l'équipe pourrait lire lundi matin.

Tu n'inventes RIEN : tout vient des notes. Tu ne diagnostiques pas.

Puis, sur une NOUVELLE LIGNE, termine par exactement : ACTIONS: [...] — un tableau JSON valide sur une seule ligne de 5 à 7 actions au format {"action":"...","responsable":"...","echeance":"..."}. Les responsables sont les métiers cités dans les notes (pas de noms propres), les échéances sont relatives et réalistes (« lundi », « semaine prochaine », « avant la fin du mois »). Chaque action découle directement d'une note.`;

export const UC3_JUDGE_PROMPT = `Tu es évaluateur d'un atelier IA médico-social. Une équipe a dicté des notes de débrief, l'IA a proposé des actions, et l'équipe a retenu son plan d'action final.
Notes de l'équipe : {NOTES}
Actions proposées par l'IA : {PROPOSEES}
Plan retenu par l'équipe : {RETENUES}
Évalue le plan RETENU : cohérence avec les notes (sur 8 : les actions retenues répondent-elles aux vrais signaux, notamment ceux qu'une seule personne avait vus ?), réalisme (sur 6 : charge et échéances tenables), discernement (sur 6 : l'équipe a-t-elle écarté à raison des actions superflues ou gardé l'essentiel ? Retenir tout sans trier ou presque tout écarter sont des signes de non-discernement). Court et bienveillant. ${JSON_ONE_LINE} : {"coherence":n,"realisme":n,"discernement":n,"point_fort":"...","a_ameliorer":"...","conseil":"..."}`;

/* ------------------------------------------------------------------ */
/* 304 — Le copil : la synthèse d'accueil                             */
/* ------------------------------------------------------------------ */

export const UC4_MAX_ATTEMPTS = 2;

export const UC4_GENERATION_PROMPT = `Tu es un assistant de rédaction pour un comité de pilotage en établissement médico-social. Tu réponds à la consigne rédigée par l'équipe en t'appuyant UNIQUEMENT sur les documents fournis ci-dessous. Si les documents se contredisent, signale-le explicitement plutôt que de trancher. Si une information demandée n'y figure pas, écris [non documenté]. Réponds en Markdown clair.`;

export const UC4_JUDGE_PROMPT = `Tu es évaluateur d'un atelier IA médico-social. Une équipe devait produire, pour un nouveau membre rejoignant un copil après 3 réunions, une note d'accueil générée par IA à partir des comptes-rendus, avec un prompt rédigé par l'équipe elle-même.
Les points clés que la note devait couvrir : {POINTS_CLES}
Prompt rédigé par l'équipe : {PROMPT}
Note produite : {NOTE}
Évalue : couverture des points clés (sur 8, proportionnelle au nombre de points réellement couverts et exacts — attention aux décisions devenues obsolètes présentées comme actuelles), qualité du prompt (sur 4 : précise-t-il le destinataire, le format, ce qu'il faut couvrir — décisions, actions, points en suspens — et l'interdiction d'inventer ?). Court et bienveillant. ${JSON_ONE_LINE} : {"couverture":n,"qualite_prompt":n,"point_fort":"...","a_ameliorer":"...","conseil":"..."}`;
