export default function LobbyPage() {
  return (
    <main
      className="flex flex-col items-center justify-center min-h-screen p-8 bg-white"
      aria-label="Salle d'attente"
    >
      <h1 className="font-bold text-black mb-4">Bienvenue</h1>
      <p className="text-[#4A4A4A]" aria-live="polite">
        En attente du lancement des defis par l'animateur...
      </p>
    </main>
  );
}
