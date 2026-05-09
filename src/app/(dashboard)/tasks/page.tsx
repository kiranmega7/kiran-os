import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tasks }, { data: businesses }, { data: goals }] = await Promise.all([
    supabase.from("tasks").select("*").eq("user_id", user.id).order("priority").order("created_at", { ascending: false }),
    supabase.from("businesses").select("id, name").eq("user_id", user.id),
    supabase.from("goals").select("id, title").eq("user_id", user.id).eq("status", "active"),
  ]);

  return <TasksClient userId={user.id} tasks={tasks ?? []} businesses={businesses ?? []} goals={goals ?? []} />;
}
