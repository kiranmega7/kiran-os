import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type Goal = Database["public"]["Tables"]["goals"]["Row"];
type Business = Database["public"]["Tables"]["businesses"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Checkin = Database["public"]["Tables"]["daily_checkins"]["Row"];
type Workout = Database["public"]["Tables"]["workout_logs"]["Row"];

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { userId } = await req.json();
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const goalsRes = await supabase.from("goals").select("*").eq("user_id", userId).eq("status", "active");
  const tasksRes = await supabase.from("tasks").select("*").eq("user_id", userId).neq("status", "done").order("priority").limit(10);
  const checkinRes = await supabase.from("daily_checkins").select("*").eq("user_id", userId).eq("date", today).maybeSingle();
  const businessesRes = await supabase.from("businesses").select("*").eq("user_id", userId);
  const workoutsRes = await supabase.from("workout_logs").select("*").eq("user_id", userId).gte("date", getWeekStart());

  const goals = (goalsRes.data ?? []) as Goal[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const checkin = checkinRes.data as Checkin | null;
  const businesses = (businessesRes.data ?? []) as Business[];
  const workouts = (workoutsRes.data ?? []) as Workout[];

  const runsThisWeek = workouts.filter((w) => w.type === "run").length;
  const calisthicsThisWeek = workouts.filter((w) => w.type === "calisthenics").length;

  const context = `
Today: ${today}
User: Kiran — solo operator, co-founder of DoubleLead (SaaS), also building Quotation Tracker.

CHECK-IN TODAY:
${checkin ? `Energy: ${checkin.energy_level}/10, Sleep: ${checkin.sleep_hours}h, Mood: ${checkin.mood}/5` : "No check-in yet."}

ACTIVE GOALS:
${goals.map((g) => `- ${g.title}: ${g.current_value}/${g.target_value} ${g.unit ?? ""} (deadline: ${g.deadline ?? "none"})`).join("\n")}

BUSINESSES:
${businesses.map((b) => `- ${b.name}: MRR $${b.current_mrr}, target $${b.monthly_revenue_target}/mo`).join("\n")}

OPEN TASKS (by priority):
${tasks.map((t) => `- [${t.priority}] ${t.title}`).join("\n")}

FITNESS THIS WEEK:
- Runs: ${runsThisWeek}/2 goal
- Calisthenics: ${calisthicsThisWeek}/2 goal
`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: `You are Kiran's personal AI coach. Give a sharp, motivating morning briefing in 2-3 sentences, then list exactly 3 top actions for today. Be specific, direct, and data-driven. No fluff. Return JSON: { "briefing_text": "...", "top_actions": ["...", "...", "..."] }`,
    messages: [{ role: "user", content: context }],
  });

  let result = { briefing_text: "", top_actions: [] as string[] };
  try {
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (json) result = JSON.parse(json);
  } catch {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("ai_insights").upsert({
    user_id: userId,
    date: today,
    briefing_text: result.briefing_text,
    top_actions: result.top_actions,
  }, { onConflict: "user_id,date" });

  return NextResponse.json(result);
}

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}
