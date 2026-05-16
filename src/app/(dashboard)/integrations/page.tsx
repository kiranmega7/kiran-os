import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { IntegrationsClient } from "./integrations-client";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: strava } = await (supabase as any)
    .from("strava_connections")
    .select("athlete_id, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return <IntegrationsClient stravaConnected={!!strava} stravaAthleteId={strava?.athlete_id ?? null} />;
}
