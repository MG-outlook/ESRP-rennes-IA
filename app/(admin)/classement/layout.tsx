import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Classement",
};

export default function ClassementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
