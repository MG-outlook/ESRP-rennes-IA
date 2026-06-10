export default function LobbyPage() {
  return (
    <main
      className="flex flex-col items-center justify-center min-h-screen p-8 bg-white text-center"
      aria-label="Salle d'attente"
    >
      <h1 className="font-bold text-black mb-4 text-3xl">En attente du prochain défi</h1>
      <p className="text-[#4A4A4A] text-lg max-w-md" aria-live="polite">
        Demandez aux animateurs d&apos;ouvrir le prochain défi si besoin.
      </p>
      <div className="mt-8 flex gap-2" aria-hidden>
        <span className="w-3 h-3 bg-[#2D5A3D] animate-pulse" />
        <span className="w-3 h-3 bg-[#2D5A3D] animate-pulse [animation-delay:150ms]" />
        <span className="w-3 h-3 bg-[#2D5A3D] animate-pulse [animation-delay:300ms]" />
      </div>
    </main>
  );
}
