import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PauseOverlay from "@/components/PauseOverlay";
import DegradedBanner from "@/components/shared/DegradedBanner";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Verify user has a team session
  const { data: session } = await supabase
    .from("team_sessions")
    .select("team_id")
    .eq("auth_uid", user.id)
    .single();

  if (!session) {
    redirect("/");
  }

  return (
    <>
      <DegradedBanner />
      <PauseOverlay />
      {children}
    </>
  );
}
