// Documents fictifs du dossier de Camille Renaud.
// Source : docs/03-camille-documents.md (à valider par Réjane Certain).

export type DocumentKind =
  | "mdph_letter"
  | "motivation_letter"
  | "medical_sheet"
  | "convention_stage";

const DOCUMENTS: Record<DocumentKind, { title: string; content: string }> = {
  mdph_letter: {
    title: "Notification MDPH",
    content: `MAISON DÉPARTEMENTALE DES PERSONNES HANDICAPÉES D'ILLE-ET-VILAINE
Référence dossier : MDPH35-RQTH-2025-04217 — Date : 14 mars 2026
Destinataire : RENAUD Camille, 17 rue des Forges, 35000 Rennes

OBJET : Décision relative à votre demande de Reconnaissance de la Qualité de Travailleur Handicapé (RQTH).

Suite à l'instruction de votre demande déposée le 8 novembre 2025 et après examen en Commission des Droits et de l'Autonomie des Personnes Handicapées (CDAPH) du 11 mars 2026 :

→ ATTRIBUTION DE LA RQTH pour une durée de cinq (5) ans, du 1er avril 2026 au 31 mars 2031.
Le taux d'incapacité retenu par la CDAPH est compris entre 50 % et 79 %.

Orientation : vers un Établissement et Service de Réadaptation Professionnelle (ESRP) en vue d'une reconversion compatible avec les restrictions d'aptitude constatées.

Préconisations d'aménagement de poste : éviter le port de charges supérieures à 5 kg, station debout prolongée à proscrire, prévoir des temps de pause réguliers, environnement de travail à dominante sédentaire conseillé.

La présente décision peut faire l'objet d'un recours administratif préalable obligatoire (RAPO) dans un délai de deux mois à compter de sa notification (art. R. 241-1 du Code de l'action sociale et des familles).`,
  },
  motivation_letter: {
    title: "Lettre de motivation manuscrite",
    content: `Rennes, le 19 mars 2026

Madame, Monsieur,

Je m'appelle Camille Renaud, j'ai 38 ans, et j'écris cette lettre pour vous demander si je peux venir dans votre établissement.

J'ai travaillé 16 ans comme magasinier dans la même entreprise. Et puis il y a eu l'accident en 2023. Depuis je ne peux plus faire ce métier-là, ça je l'ai compris. Le médecin a dit, la MDPH aussi.

Ce que je voudrais maintenant c'est essayer un métier de bureau. Je sais que ça change tout. Mes enfants me disent que je suis patiente avec eux, qu'ils m'ont vu remplir les papiers de la maison, du foot du petit, de la scolarité, tout ça. Je crois que j'aime bien organiser.

Je n'ai pas de diplôme dans le tertiaire mais j'ai mon CAP magasinier et je sais me servir d'un ordinateur, enfin pour les choses simples (les mails, taper un texte, chercher sur internet).

J'aimerais aussi garder un lien avec le terrain. Je veux dire, pas juste être enfermé·e dans un bureau toute la journée. Voir des gens, discuter, ça compte pour moi.

J'ai peur de ne pas y arriver. J'ai peur que ce soit trop tard. Mais j'ai envie d'essayer. Vraiment.

Je vous remercie de m'avoir lu·e.
Camille Renaud`,
  },
  medical_sheet: {
    title: "Fiche de liaison médicale (médecin du travail)",
    content: `FICHE DE LIAISON MÉDICALE — Service de santé au travail SIST 35
Médecin du travail : Dr. M. Lefèvre
Patient·e : RENAUD Camille — né·e en 1988 — Date : 5 février 2026
Destinataire : ESRP (via MDPH35, dossier 2025-04217)

CONTEXTE
Suivi depuis 2007 (activité de magasinier). Accident du travail le 14 juin 2023 (chute, traumatisme du rachis lombaire). Arrêt prolongé. Tentative de reprise en poste aménagé en janvier 2024, échec après 3 semaines (douleurs, fatigue). Avis d'inaptitude au poste antérieur en juillet 2024.

ÉLÉMENTS CLINIQUES ACTUELS (consolidation)
- Lombalgie chronique post-traumatique stabilisée sous traitement antalgique
- Fatigabilité résiduelle, surtout en fin de journée
- État psychologique : suivi en psychothérapie de soutien jusqu'en septembre 2025 (épisode dépressif réactionnel, en rémission)
- Pas de contre-indication cognitive

RESTRICTIONS D'APTITUDE
- Port de charges > 5 kg : contre-indiqué
- Station debout prolongée > 30 min : contre-indiquée
- Postures contraignantes (flexion lombaire, torsion) : à éviter
- Travail de nuit : déconseillé

APTITUDES CONSERVÉES
- Travail assis avec pauses régulières : compatible
- Activités cognitives soutenues : compatibles
- Bureautique de base : maîtrisée
- Relationnel : conservé, atout signalé par les collègues`,
  },
  convention_stage: {
    title: "Convention de stage (MISPE)",
    content: `CONVENTION DE STAGE EN MILIEU PROFESSIONNEL
Cadre : Mise en Situation Professionnelle en Entreprise (MISPE)
Référence convention : MISPE-2026-ESRPR-0142

ENTRE : l'ESRP Rennes (11 rue Kerautret-Botmel, 35200 Rennes), représenté par sa Directrice Mme Anne CASTEL ;
ET : l'entreprise BUREAUX & SOLUTIONS SARL (8 boulevard des Trois-Croix, 35200 Rennes), représentée par son gérant M. Pierre DUVAL ;
ET : RENAUD Camille, né·e le 12/08/1988, domicilié·e 17 rue des Forges, 35000 Rennes, stagiaire en réadaptation professionnelle, bénéficiaire d'une RQTH (MDPH35-RQTH-2025-04217).

ARTICLE 1 — OBJET : stage d'observation et de mise en situation au sein du pôle accueil-secrétariat.

ARTICLE 2 — DURÉE ET MODALITÉS : 3 semaines, du lundi 31 août 2026 au vendredi 18 septembre 2026. 28 heures hebdomadaires (4 jours de 7 heures), avec aménagement des temps de pause conformément aux préconisations médicales (annexe 1).

ARTICLE 3 — ENCADREMENT : Tutrice en entreprise Mme Sophie CARRÉ (assistante de direction) ; Référent ESRP M. David MORIN (chargé d'insertion professionnelle). Un point intermédiaire est prévu en fin de semaine 2.

ARTICLE 4 — STATUT ET COUVERTURE : le·la stagiaire conserve son statut de stagiaire de la formation professionnelle et sa rémunération versée par l'ESRP. La couverture accident du travail et trajet est assurée par l'ESRP (art. L. 412-8 du Code de la Sécurité sociale).

Fait à Rennes, en quatre exemplaires originaux, le 18 juin 2026.`,
  },
};

export function getDocumentContent(kind: DocumentKind): string {
  return DOCUMENTS[kind].content;
}

export function getDocumentTitle(kind: DocumentKind): string {
  return DOCUMENTS[kind].title;
}

export default function DocumentCamille({ kind }: { kind: DocumentKind }) {
  const document = DOCUMENTS[kind];
  return (
    <article className="border-2 border-black p-4 bg-white">
      <h3 className="mb-2 font-bold">{document.title}</h3>
      <p className="text-[#4A4A4A] whitespace-pre-line text-sm">
        {document.content}
      </p>
    </article>
  );
}
