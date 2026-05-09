import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BusinessesClient } from "./businesses-client";

export default async function BusinessesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: businesses }, { data: metrics }] = await Promise.all([
    supabase.from("businesses").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("business_metric_logs").select("*").order("date", { ascending: false }).limit(100),
  ]);

  return <BusinessesClient userId={user.id} businesses={businesses ?? []} metrics={metrics ?? []} />;
}
