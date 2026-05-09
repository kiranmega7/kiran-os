import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GoalsClient } from "./goals-client";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: goals } = await supabase.from("goals").select("*").eq("user_id", user.id).order("created_at");
  const { data: businesses } = await supabase.from("businesses").select("id, name").eq("user_id", user.id);

  return <GoalsClient userId={user.id} goals={goals ?? []} businesses={businesses ?? []} />;
}
