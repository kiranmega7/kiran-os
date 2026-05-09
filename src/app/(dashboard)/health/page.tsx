import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HealthClient } from "./health-client";

export default async function HealthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: checkins }, { data: workouts }] = await Promise.all([
    supabase.from("daily_checkins").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30),
    supabase.from("workout_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30),
  ]);

  return <HealthClient userId={user.id} checkins={checkins ?? []} workouts={workouts ?? []} />;
}
