import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/lib/hooks/useToast";
import VersionBadge from "@/components/shared/VersionBadge";

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
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col">
        <VersionBadge />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
