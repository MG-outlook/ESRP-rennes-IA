import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PauseOverlay from "@/components/PauseOverlay";
import DegradedBanner from "@/components/shared/DegradedBanner";
import ChallengeNavigator from "@/components/ChallengeNavigator";
import { TeamHeader } from "@/components/shared/Brand";

export const metadata: Metadata = {
  title: "Défis",
};

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

  // Code affiché dans l'en-tête. Si la lecture est refusée (RLS), on s'en passe.
  const { data: team } = await supabase
    .from("teams")
    .select("code")
    .eq("id", session.team_id)
    .maybeSingle();

  return (
    <>
      <ChallengeNavigator />
      <TeamHeader teamCode={team?.code ?? null} />
      <DegradedBanner />
      <PauseOverlay />
      <div className="flex-1 flex flex-col">{children}</div>
    </>
  );
}
