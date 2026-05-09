import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TodayClient } from "./today-client";
import { formatDate } from "@/lib/utils";

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const [
    { data: goals },
    { data: tasks },
    { data: checkin },
    { data: businesses },
    { data: workouts },
    { data: insight },
  ] = await Promise.all([
    supabase.from("goals").select("*").eq("user_id", user.id).eq("status", "active"),
    supabase.from("tasks").select("*").eq("user_id", user.id).neq("status", "done").order("priority").limit(10),
    supabase.from("daily_checkins").select("*").eq("user_id", user.id).eq("date", today).maybeSingle(),
    supabase.from("businesses").select("*").eq("user_id", user.id).eq("status", "active"),
    supabase.from("workout_logs").select("*").eq("user_id", user.id).gte("date", getWeekStart()),
    supabase.from("ai_insights").select("*").eq("user_id", user.id).eq("date", today).maybeSingle(),
  ]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <TodayClient
      userId={user.id}
      greeting={greeting}
      today={formatDate(today)}
      goals={goals ?? []}
      tasks={tasks ?? []}
      checkin={checkin}
      businesses={businesses ?? []}
      workoutsThisWeek={workouts ?? []}
      insight={insight}
    />
  );
}

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}
