import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/lib/hooks/useToast";

export const metadata: Metadata = {
  title: "Fresque de l'IA — ESRP Rennes",
  description: "Atelier Fresque de l'IA — EPNAK ESRP Rennes — 16 juillet 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
