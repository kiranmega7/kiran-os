import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FinanceClient } from "./finance-client";

export default async function FinancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: income }, { data: logs }, { data: goals }] = await Promise.all([
    supabase.from("income_sources").select("*").eq("user_id", user.id).order("expected_date"),
    supabase.from("savings_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30),
    supabase.from("goals").select("*").eq("user_id", user.id).eq("category", "financial").eq("status", "active"),
  ]);

  return <FinanceClient userId={user.id} incomeSources={income ?? []} logs={logs ?? []} financialGoals={goals ?? []} />;
}
