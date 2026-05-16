import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReviewClient } from "./review-client";

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const ws = weekStart.toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: weekly }, { data: monthly }] = await Promise.all([
    (supabase as any).from("weekly_reviews").select("*").eq("user_id", user.id).eq("week_start", ws).maybeSingle(),
    (supabase as any).from("monthly_snapshots").select("*").eq("user_id", user.id).eq("month", monthStart).maybeSingle(),
  ]);

  return <ReviewClient weekly={weekly} monthly={monthly} />;
}
