"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo, BrandStripe } from "@/components/shared/Brand";
import Icon from "@/components/shared/Icon";
import Spinner from "@/components/shared/Spinner";

export default function HomePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = code.trim();
    if (trimmed.length !== 4 || !/^\d{4}$/.test(trimmed)) {
      setError("Entrez un code à 4 chiffres.");
      return;
    }

    setLoading(true);
    router.push(`/join?code=${trimmed}`);
  }

  return (
    <div className="flex-1 flex flex-col bg-surface">
      <header className="bg-white border-b border-line">
        <BrandStripe />
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <BrandLogo height={52} priority />
          <span className="text-ink-2">EPNAK — ESRP Rennes</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 sm:py-16 grid grid-cols-[minmax(0,1fr)] gap-12 lg:gap-16 lg:grid-cols-2 items-center">
        <section className="flex flex-col gap-6">
          <p className="font-bold text-success">Atelier pratique</p>
          <h1 className="text-4xl sm:text-5xl leading-[1.08]">
            Découvrir l&apos;IA en équipe, un défi après l&apos;autre.
          </h1>
          <p className="text-xl text-ink-2 max-w-[34em]">
            Votre équipe relève des défis tirés du quotidien de
            l&apos;accompagnement, avec l&apos;IA comme outil. Vous testez, vous
            comparez, vous gardez le dernier mot.
          </p>
          <ol className="flex flex-col gap-3.5 mt-2">
            {[
              "Entrez le code de votre équipe.",
              "Présentez votre équipe au Gardien pour obtenir votre mot de passe.",
              "Relevez les défis ouverts par l'animation.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3.5 items-baseline">
                <span className="shrink-0 w-8 h-8 rounded-full bg-brand-soft text-brand font-extrabold text-base inline-flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white border border-line rounded-xl p-8 sm:p-10 flex flex-col gap-6 shadow-sm"
        >
          <div className="flex flex-col gap-2">
            <h2 className="text-[1.556rem]">Rejoindre votre équipe</h2>
            <p className="text-ink-2">
              Le code vous est donné par la personne qui anime votre table.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <label htmlFor="team-code" className="font-bold">
              Code d&apos;équipe
            </label>
            <input
              id="team-code"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="0000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-describedby="team-code-help"
              aria-invalid={error ? true : undefined}
              className="field w-full min-w-0 h-[76px] px-5 text-center font-mono text-[2.2rem] font-bold tracking-[0.35em]"
              autoFocus
            />
            {error ? (
              <p id="team-code-help" role="alert" className="flex items-center gap-2 font-bold text-danger">
                <Icon name="info" size={18} />
                {error}
              </p>
            ) : (
              <p id="team-code-help" className="text-muted">
                4 chiffres, par exemple 4821.
              </p>
            )}
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary h-14 text-lg">
            {loading ? <Spinner size="sm" /> : null}
            Rejoindre l&apos;équipe
            {!loading && <Icon name="arrow-right" />}
          </button>
        </form>
      </main>

      <footer className="bg-white border-t border-line">
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between gap-3 flex-wrap text-[0.85rem] text-muted">
          <span>EPNAK — ESRP Rennes</span>
          <span>Établissement public national Antoine Koenigswarter</span>
        </div>
      </footer>
    </div>
  );
}
