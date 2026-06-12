// Fond documentaire élargi pour les « Cas d'usage métier » (défis 301-304).
// Pièces fictives, cohérentes avec le dossier de Camille (DocumentCamille.tsx
// et BONUS_A_REPORTS). Le volume est volontaire : choisir les bonnes pièces
// pour une mission donnée EST l'exercice.

import { getDocumentContent } from "@/components/challenges/DocumentCamille";
import { BONUS_A_REPORTS } from "@/lib/ai/prompts";

export interface FondsDoc {
  id: string;
  title: string;
  /** Catégorie affichée (badge). */
  kind: "dossier" | "rapport" | "stage" | "vie_etablissement" | "externe";
  content: string;
  /** Révélé au débrief : quand cette pièce est utile, ou pourquoi c'est un piège. */
  debrief: string;
  /** Piège RGPD : concerne une autre personne, à ne JAMAIS transmettre à l'IA. */
  rgpd?: boolean;
}

/* ------------------------------------------------------------------ */
/* Cas d'usage 301 — fond documentaire « dossier de Camille » élargi  */
/* ------------------------------------------------------------------ */

export const UC1_FONDS: FondsDoc[] = [
  {
    id: "notif_mdph",
    title: "Notification MDPH (RQTH + orientation)",
    kind: "dossier",
    content: getDocumentContent("mdph_letter"),
    debrief:
      "La pièce de référence administrative : références du dossier, durée RQTH, préconisations. Utile dès qu'on s'adresse à la MDPH ou qu'on cite le cadre.",
  },
  {
    id: "lettre_motivation",
    title: "Lettre de motivation de Camille",
    kind: "dossier",
    content: getDocumentContent("motivation_letter"),
    debrief:
      "La voix de Camille : motivations, craintes, appétences. Précieuse pour préparer un entretien avec elle, peu utile pour un point administratif.",
  },
  {
    id: "fiche_medicale",
    title: "Fiche de liaison médicale",
    kind: "dossier",
    content: getDocumentContent("medical_sheet"),
    debrief:
      "Restrictions et aptitudes. Indispensable pour le médecin du travail et les aménagements de poste ; à ne pas diffuser au-delà du nécessaire.",
  },
  {
    id: "convention_stage",
    title: "Convention de stage (MISPE)",
    kind: "dossier",
    content: getDocumentContent("convention_stage"),
    debrief:
      "Dates, encadrement, modalités du stage. La base de tout échange avec l'entreprise d'accueil.",
  },
  {
    id: "rapport_admin",
    title: BONUS_A_REPORTS[0].role,
    kind: "rapport",
    content: BONUS_A_REPORTS[0].content,
    debrief: "Le point administratif à date : utile pour les bilans MDPH.",
  },
  {
    id: "rapport_medico",
    title: BONUS_A_REPORTS[1].role,
    kind: "rapport",
    content: BONUS_A_REPORTS[1].content,
    debrief:
      "L'évolution médico-psy observée : utile pour le médecin et l'entretien de mi-parcours.",
  },
  {
    id: "rapport_formateur",
    title: BONUS_A_REPORTS[2].role,
    kind: "rapport",
    content: BONUS_A_REPORTS[2].content,
    debrief:
      "Les progrès en formation : utile pour la MDPH (suivi d'orientation) et pour valoriser Camille en entretien.",
  },
  {
    id: "rapport_insertion",
    title: BONUS_A_REPORTS[3].role,
    kind: "rapport",
    content: BONUS_A_REPORTS[3].content,
    debrief:
      "Le projet professionnel à date : utile pour la MDPH et pour le point de stage avec l'entreprise.",
  },
  {
    id: "mail_tutrice",
    title: "Mail de la tutrice de stage (fin de semaine 1)",
    kind: "stage",
    content: `De : Sophie Carré <s.carre@bureaux-solutions.fr>
À : David Morin (ESRP Rennes)
Objet : Camille — première semaine

Bonjour David,

Premier retour après une semaine : Camille s'intègre très bien à l'équipe du pôle accueil. Elle est ponctuelle, pose les bonnes questions et a déjà pris en main le standard téléphonique sur les créneaux calmes.

Deux points d'attention : elle se fatigue nettement en fin de journée (les jeudis après-midi sont durs), et elle n'ose pas toujours demander de l'aide quand elle bloque sur le logiciel de courrier. Je propose qu'on ajoute une vraie pause de 10 minutes vers 15 h 30 et qu'on en reparle au point de la semaine 2.

Bien cordialement,
Sophie Carré, assistante de direction`,
    debrief:
      "Le seul retour direct du terrain de stage : indispensable pour le point intermédiaire avec l'entreprise et pour le médecin (tolérance réelle du poste).",
  },
  {
    id: "note_incident",
    title: "Note d'incident bénin (atelier bureautique)",
    kind: "vie_etablissement",
    content: `NOTE D'INCIDENT — ESRP Rennes, atelier bureautique
Date : mardi dernier, 14 h 40. Rédacteur : formateur référent.

En voulant aider à ranger le matériel, Camille a soulevé un carton de ramettes de papier (~10 kg) avant d'être arrêtée par le formateur. Pas de douleur signalée sur le moment, mais Camille a confié le lendemain avoir « senti son dos » dans la soirée.

Rappel fait des restrictions de port de charges (< 5 kg) à toute l'équipe de l'atelier. Camille a minimisé l'épisode (« je ne voulais pas qu'on fasse à ma place »). À surveiller : tendance à dépasser ses limites pour bien faire.`,
    debrief:
      "Signal faible important pour le médecin du travail (respect réel des restrictions) ; inutile pour un courrier administratif MDPH.",
  },
  {
    id: "planning_formation",
    title: "Planning de formation du trimestre",
    kind: "vie_etablissement",
    content: `PLANNING — Trimestre en cours, groupe Tertiaire 2
Semaines 1-4 : bureautique avancée (tableur, publipostage), 3 demi-journées/sem.
Semaines 5-6 : communication professionnelle écrite et orale.
Semaines 7-9 : stage en entreprise (MISPE) — voir conventions individuelles.
Semaine 10 : retour de stage, bilans individuels et point projet.
Semaines 11-12 : techniques de recherche d'emploi (CV, entretiens), avec France Travail.
Rappel : les aménagements individuels (pauses, postes assis) restent applicables sur tous les modules.`,
    debrief:
      "Contexte général du groupe : peut situer le parcours, mais n'apprend rien de spécifique sur Camille. Rarement indispensable.",
  },
  {
    id: "cr_equipe",
    title: "Compte-rendu d'équipe hebdomadaire (extrait Camille)",
    kind: "rapport",
    content: `CR ÉQUIPE PLURIDISCIPLINAIRE — extrait concernant Camille R.

Formation : très bonne dynamique, aide spontanément les autres stagiaires en traitement de texte. La saisie longue reste limitée à ~30 min.
Social : la réponse au dossier de transport adapté est TOUJOURS en attente (3e relance faite). Les trajets du matin restent une source de fatigue.
Moral : confiance en nette progression depuis l'annonce du stage. Reste sensible aux échecs ponctuels.
Stage : démarrage confirmé chez Bureaux & Solutions ; point intermédiaire à préparer pour la fin de semaine 2.
Action : préparer l'entretien de mi-parcours avec Camille (référente : Nadia).`,
    debrief:
      "La photographie pluri-pro la plus récente : utile pour presque toutes les missions internes (MDPH, mi-parcours), c'est la pièce de liaison par excellence.",
  },
  {
    id: "msg_france_travail",
    title: "Message du conseiller France Travail",
    kind: "externe",
    content: `De : Karim B., conseiller France Travail (suivi conjoint ESRP)
Objet : Camille Renaud — point projet

Bonjour, dans le cadre du suivi conjoint, pourriez-vous me confirmer que le projet accueil-secrétariat est consolidé ? Je peux positionner Camille sur l'atelier « CV et candidatures » d'octobre et je commence à repérer des offres adaptées (poste assis, temps partiel possible) sur le bassin rennais. Merci de me faire un retour avant la fin du mois.`,
    debrief:
      "Utile le jour où l'on travaille la sortie vers l'emploi ; pour les missions du jour (MDPH, stage, mi-parcours, médecin), c'est du bruit.",
  },
  {
    id: "attestation_transport",
    title: "Attestation de demande de transport (ancienne version)",
    kind: "vie_etablissement",
    content: `ATTESTATION — version du début de parcours (remplacée depuis)
Nous attestons qu'une demande de transport adapté a été déposée pour Mme Renaud Camille auprès de l'organisme compétent. Dans l'attente de la décision, l'intéressée utilise les transports en commun.
NB manuscrit : « document remplacé par la demande complète envoyée le mois dernier — ne plus utiliser cette version. »`,
    debrief:
      "Pièce périmée, explicitement remplacée : l'utiliser introduirait une information fausse. Le réflexe : vérifier la fraîcheur des documents qu'on donne à l'IA.",
  },
  {
    id: "notif_autre_personne",
    title: "Notification MDPH — Bastien L. (autre personne accompagnée)",
    kind: "dossier",
    rgpd: true,
    content: `MDPH d'Ille-et-Vilaine — Référence : MDPH35-RQTH-2025-03988
Destinataire : L., Bastien — stagiaire ESRP Rennes, groupe Tertiaire 2
OBJET : attribution RQTH (3 ans) et orientation ESRP.
Préconisations : limitation du travail sur écran à 4 h/jour, éclairage adapté…
[Document complet — concerne un AUTRE stagiaire du même groupe que Camille.]`,
    debrief:
      "⚠️ PIÈGE RGPD : ce document concerne une autre personne. Il ne doit JAMAIS être transmis à une IA (ni à quiconque) pour une mission concernant Camille. Donnée de santé = protection maximale.",
  },
  {
    id: "article_presse",
    title: "Article de presse — « L'ESRP de Rennes fête ses 30 ans »",
    kind: "externe",
    content: `OUEST-FRANCE (édition Rennes) — L'ESRP a soufflé ses 30 bougies vendredi dernier en présence d'anciens stagiaires et de partenaires. « Trois décennies au service de la reconversion des personnes en situation de handicap », a salué la directrice, Anne Castel. Au programme : témoignages, visite des ateliers et buffet préparé par le groupe restauration. L'établissement accompagne chaque année près de 200 personnes vers un nouveau métier.`,
    debrief:
      "Hors sujet : aucune information sur Camille. À écarter de toutes les missions.",
  },
];

/* ------------------------------------------------------------------ */
/* Cas d'usage 304 — fond documentaire du copil « Projet IA ESRP »    */
/* ------------------------------------------------------------------ */

export interface CopilDoc {
  id: string;
  title: string;
  /** Pièce réellement utile pour la note d'accueil. */
  relevant: boolean;
  content: string;
  debrief: string;
}

export const UC4_DOCS: CopilDoc[] = [
  {
    id: "cr1",
    title: "CR copil n°1 — Lancement (12 mars)",
    relevant: true,
    content: `COPIL « IA À L'ESRP » — Compte-rendu n°1 (12 mars), validé
Présents : direction (A. Castel), 2 formateurs, 1 chargée d'insertion, 1 représentante des personnes accompagnées, 1 référent qualité.

DÉCISIONS
1. Périmètre : explorer les usages IA pour (a) l'accessibilité des écrits (FALC), (b) l'aide à la rédaction des synthèses. Tout autre usage attendra.
2. Charte non négociable : AUCUNE donnée nominative ou de santé dans des IA grand public. Toute expérimentation utilise des cas fictifs ou anonymisés.
3. Outils : tester en priorité une solution souveraine (Mistral) avant tout autre choix.

ACTIONS
- Constituer deux binômes pilotes (FALC / synthèses) — resp. : formateurs, échéance copil 2.
- Rédiger une page d'information pour les équipes — resp. : référent qualité.

Prochain copil : 23 avril.`,
    debrief: "Le cadre fondateur : périmètre, charte, choix d'outil. Indispensable.",
  },
  {
    id: "cr2",
    title: "CR copil n°2 — Premiers retours (23 avril)",
    relevant: true,
    content: `COPIL « IA À L'ESRP » — Compte-rendu n°2 (23 avril), validé
Présents : idem copil 1, sauf référent qualité (excusé).

BILAN DES PILOTES
- FALC : très concluant. 12 courriers traduits, retours enthousiastes des personnes accompagnées du groupe test. La représentante demande d'étendre à tous les courriers types.
- Synthèses : mitigé. Gain de temps réel (~40 %) mais deux synthèses contenaient des formulations inexactes non repérées avant relecture.

DÉCISIONS
1. FALC : extension progressive à tous les courriers types, avec relecture systématique par un professionnel.
2. Synthèses : volet SUSPENDU le temps de définir un cadre de relecture obligatoire.
3. Budget : demande de 2 jours de formation par professionnel transmise à la direction — réponse attendue au copil 3.

Prochain copil : 4 juin.`,
    debrief:
      "L'étape clé : succès FALC, suspension des synthèses, demande de budget. Indispensable.",
  },
  {
    id: "cr3",
    title: "CR copil n°3 — Relance encadrée (4 juin)",
    relevant: true,
    content: `COPIL « IA À L'ESRP » — Compte-rendu n°3 (4 juin), validé
Présents : tous les membres.

DÉCISIONS
1. Synthèses : volet RELANCÉ avec le nouveau cadre : trame validée par le copil, relecture obligatoire par le rédacteur ET un pair, mention « document assisté par IA » en pied de page.
2. Budget formation : ACCORDÉ par la direction — 2 jours par professionnel volontaire, à planifier avant la fin de l'année.
3. Communication : présentation du projet au CSE prévue à la rentrée — préparation confiée au copil élargi.

POINTS EN SUSPENS
- Le choix de l'outil définitif (la solution souveraine testée donne satisfaction mais le coût annuel doit être confirmé).
- L'association plus large des personnes accompagnées au-delà du groupe test.

Prochain copil : 17 septembre (avec le nouveau membre, bienvenue à lui !).`,
    debrief:
      "Le dernier état des décisions : relance encadrée des synthèses, budget accordé, suspens restants. Indispensable.",
  },
  {
    id: "cr2_brouillon",
    title: "Brouillon CR copil n°2 (version NON validée)",
    relevant: false,
    content: `[BROUILLON — ne pas diffuser]
Copil 2, notes rapides : FALC ok. Synthèses : trop risqué, on propose l'ARRÊT DÉFINITIF du volet synthèses. Budget formation : peu probable selon la direction. (à relire / à confirmer avant validation)`,
    debrief:
      "⚠️ Piège : ce brouillon contredit le CR validé (« arrêt définitif » au lieu de « suspension », budget « peu probable » alors qu'il a été accordé). Donner un brouillon à l'IA, c'est lui faire écrire des erreurs avec assurance.",
  },
  {
    id: "odj_annule",
    title: "Ordre du jour — réunion du 15 mai (ANNULÉE)",
    relevant: false,
    content: `Ordre du jour — réunion intermédiaire du 15 mai : 1. point pilotes, 2. budget, 3. divers.
Mention manuscrite : « Réunion annulée (grève des transports), points reportés au copil du 4 juin. »`,
    debrief:
      "Réunion jamais tenue : aucun contenu décisionnel. Du bruit pour la synthèse.",
  },
  {
    id: "mail_logistique",
    title: "Mail — logistique du copil (salle et plateaux)",
    relevant: false,
    content: `Objet : copil du 4 juin — logistique
Bonjour, la salle polyvalente est réservée de 14 h à 16 h 30. Merci de me confirmer le nombre de plateaux repas pour ceux qui enchaînent avec la réunion qualité. Pensez à rapporter les badges visiteurs. Cordialement, l'accueil.`,
    debrief: "Pure logistique : rien à en tirer pour un nouveau membre.",
  },
  {
    id: "cr_autre_groupe",
    title: "CR groupe de travail « réaménagement du self »",
    relevant: false,
    content: `GT SELF — CR du 28 mai. Décisions : nouveau sens de circulation à la rentrée, test de deux menus végétariens par semaine, devis demandé pour l'éclairage. Prochaine réunion en septembre.`,
    debrief:
      "Autre groupe de travail, aucun lien avec le projet IA : hors sujet évident — mais son intitulé « CR » piège les sélections trop rapides.",
  },
  {
    id: "invitation_r4",
    title: "Invitation — copil n°4 du 17 septembre",
    relevant: false,
    content: `Vous êtes invité·e au copil « IA à l'ESRP » n°4, le mercredi 17 septembre à 14 h, salle polyvalente. Ordre du jour à venir. Merci de confirmer votre présence.`,
    debrief:
      "Une date utile à l'agenda, mais aucun contenu : ne nourrit pas la note d'accueil.",
  },
];

/** Points clés que la note d'accueil du copil doit couvrir (vérité terrain du juge). */
export const UC4_KEY_POINTS: string[] = [
  "Le périmètre du projet : accessibilité FALC et aide aux synthèses, rien d'autre pour l'instant",
  "La charte : aucune donnée nominative ou de santé dans des IA grand public, cas fictifs ou anonymisés",
  "Le choix d'une solution souveraine (Mistral) testée en priorité",
  "Le succès du pilote FALC et son extension avec relecture systématique",
  "Le parcours du volet synthèses : suspendu au copil 2, relancé au copil 3 avec cadre strict (double relecture, mention IA)",
  "Le budget formation : demandé au copil 2, accordé au copil 3 (2 jours par professionnel)",
  "Les points en suspens : coût annuel de l'outil, association des personnes accompagnées, présentation au CSE",
];
