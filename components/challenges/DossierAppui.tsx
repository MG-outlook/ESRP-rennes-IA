"use client";

// « Dossier d'appui » : le contexte et les documents sources consultables
// directement dans un défi, pour que les équipes répondent à partir de faits
// réels plutôt que d'imagination. Réutilisable sur tous les défis.

import { useState } from "react";
import {
  DocumentKind,
  getDocumentContent,
  getDocumentTitle,
} from "./DocumentCamille";

interface ExtraDoc {
  title: string;
  content: string;
}

interface DossierAppuiProps {
  /** Phrase de situation : où en est Camille à ce moment du parcours. */
  intro?: string;
  /** Documents du dossier de Camille à proposer en onglets. */
  docs?: DocumentKind[];
  /** Documents libres supplémentaires (titre + contenu brut). */
  extras?: ExtraDoc[];
  /** Ouvre le panneau par défaut (sinon replié). */
  defaultOpen?: boolean;
}

export default function DossierAppui({
  intro,
  docs = [],
  extras = [],
  defaultOpen = false,
}: DossierAppuiProps) {
  const tabs: ExtraDoc[] = [
    ...docs.map((kind) => ({
      title: getDocumentTitle(kind),
      content: getDocumentContent(kind),
    })),
    ...extras,
  ];
  const [active, setActive] = useState(0);

  if (!intro && tabs.length === 0) return null;

  return (
    <details className="mb-8 border-2 border-black" open={defaultOpen}>
      <summary className="cursor-pointer font-bold text-black px-4 py-3 bg-[#F5F5F5]">
        📁 Dossier d&apos;appui — les faits sont là, inutile d&apos;inventer
      </summary>
      <div className="border-t-2 border-black p-4">
        {intro && (
          <p className="text-[#4A4A4A] mb-4 leading-relaxed">{intro}</p>
        )}
        {tabs.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {tabs.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`px-3 py-1.5 border-2 text-sm font-semibold ${
                    active === i
                      ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                      : "bg-white border-black text-black hover:border-[#2D5A3D]"
                  }`}
                >
                  {t.title}
                </button>
              ))}
            </div>
            <article className="border-2 border-black p-4 bg-white max-h-[320px] overflow-y-auto">
              <h3 className="mb-2 font-bold">{tabs[active].title}</h3>
              <p className="text-[#4A4A4A] whitespace-pre-line text-sm">
                {tabs[active].content}
              </p>
            </article>
          </>
        )}
      </div>
    </details>
  );
}
