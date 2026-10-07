import type { Metadata } from "next";
import AdminHeader from "@/components/shared/AdminHeader";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminHeader />
      <div className="flex-1 flex flex-col">{children}</div>
    </>
  );
}
