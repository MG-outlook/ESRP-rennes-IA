type DocumentKind = "mdph_letter" | "motivation_letter" | "medical_sheet" | "convention_stage";

const DOCUMENTS: Record<DocumentKind, { title: string; content: string }> = {
  mdph_letter: {
    title: "Notification MDPH",
    content: "Camille bénéficie d'une orientation vers un dispositif de réadaptation professionnelle.",
  },
  motivation_letter: {
    title: "Lettre de motivation",
    content: "Camille souhaite construire un projet professionnel durable et adapté à sa situation.",
  },
  medical_sheet: {
    title: "Fiche médicale synthétique",
    content: "Des aménagements de rythme et une vigilance sur la fatigue sont recommandés.",
  },
  convention_stage: {
    title: "Convention de stage",
    content: "Le stage vise à valider les compétences et les conditions de compensation nécessaires.",
  },
};

export function getDocumentContent(kind: DocumentKind): string {
  return DOCUMENTS[kind].content;
}

export default function DocumentCamille({ kind }: { kind: DocumentKind }) {
  const document = DOCUMENTS[kind];
  return (
    <article className="border-2 border-black p-4 bg-white">
      <h3 className="mb-2">{document.title}</h3>
      <p className="text-[#4A4A4A]">{document.content}</p>
    </article>
  );
}
