"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo, BrandStripe } from "@/components/shared/Brand";

const LINKS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/control", label: "Pilotage" },
  { href: "/classement", label: "Classement" },
];

/** En-tête des écrans d'animation : logo, mention « Animation », navigation. */
export default function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-line">
      <BrandStripe />
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <BrandLogo height={36} />
          <span className="px-2.5 py-0.5 rounded-md bg-ink text-white text-sm font-bold">
            Animation
          </span>
        </div>
        <nav aria-label="Animation" className="flex gap-1 flex-wrap">
          {LINKS.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`px-3.5 py-2.5 rounded-lg no-underline ${
                  active
                    ? "bg-brand-soft text-brand-strong font-bold"
                    : "text-ink-2 font-semibold hover:bg-surface hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
