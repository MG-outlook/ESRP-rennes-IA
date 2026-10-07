import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Atkinson_Hyperlegible_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/lib/hooks/useToast";
import VersionBadge from "@/components/shared/VersionBadge";

// Atkinson Hyperlegible : dessinée par le Braille Institute pour la basse
// vision (formes de lettres bien distinctes : I, l, 1 ; O, 0).
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-atkinson",
  display: "swap",
});

const atkinsonMono = Atkinson_Hyperlegible_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-atkinson-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CAMPUS EPNAK IA",
    template: "%s · CAMPUS EPNAK IA",
  },
  description: "CAMPUS EPNAK IA — EPNAK ESRP Rennes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`h-full ${atkinson.variable} ${atkinsonMono.variable}`}>
      <body className="min-h-full flex flex-col">
        <VersionBadge />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
