import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contrôle",
};

export default function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
