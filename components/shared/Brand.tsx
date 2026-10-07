import Image from "next/image";

/** Logo Campus EPNAK (public/logo-campus-epnak.png, 2047×755). */
export function BrandLogo({
  height = 44,
  priority = false,
  className,
}: {
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/logo-campus-epnak.png"
      alt="Campus EPNAK — Hackathons adaptés"
      width={2047}
      height={755}
      priority={priority}
      className={className}
      // Largeur explicite : évite l'étirement dans un conteneur flex en colonne.
      style={{ width: Math.round((height * 2047) / 755), height: "auto", maxWidth: "100%" }}
    />
  );
}

/** Fine bande bleu / cyan / vert reprise du logo, en haut des écrans. */
export function BrandStripe() {
  return (
    <div className="brand-stripe" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

/** En-tête des écrans équipe : logo + code de l'équipe connectée. */
export function TeamHeader({ teamCode }: { teamCode?: string | null }) {
  return (
    <header className="bg-white border-b border-line">
      <BrandStripe />
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <BrandLogo height={40} priority />
        {teamCode && (
          <span className="inline-flex items-center gap-2 px-4 py-1.5 border border-line rounded-full text-base text-ink-2">
            Équipe
            <strong className="font-mono text-ink">{teamCode}</strong>
          </span>
        )}
      </div>
    </header>
  );
}
