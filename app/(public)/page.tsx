"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      setError("Entrez un code à 4 chiffres");
      return;
    }

    setLoading(true);
    router.push(`/join?code=${trimmed}`);
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-white">
      <h1 className="font-bold text-black mb-4">
        Fresque de l'IA
      </h1>
      <p className="text-[#4A4A4A] mb-8">
        EPNAK — ESRP Rennes — 16 juillet 2026
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="Code équipe"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="Code equipe a 4 chiffres"
          className="w-48 px-6 py-3 min-h-[44px] text-center text-xl font-bold border-2 border-black focus:border-[#2D5A3D] outline-none bg-white text-black placeholder:text-[#B8B8B8]"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 min-h-[44px] bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] disabled:opacity-50"
        >
          {loading ? "..." : "Entrer"}
        </button>
        {error && <p className="text-[#8B3A3A]">{error}</p>}
      </form>
    </main>
  );
}
