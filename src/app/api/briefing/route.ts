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

function goalPacing(goal: Goal, today: string): string {
  if (!goal.deadline || !goal.target_value) return `${goal.title}: no deadline`;
  const created = new Date(goal.created_at);
  const deadline = new Date(goal.deadline);
  const now = new Date(today);
  const totalDays = Math.max(1, Math.ceil((deadline.getTime() - created.getTime()) / 86400000));
  const elapsed = Math.max(0, Math.ceil((now.getTime() - created.getTime()) / 86400000));
  const pctTime = Math.min(100, (elapsed / totalDays) * 100);
  const pctDone = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
  const status = pctDone >= pctTime + 5 ? "AHEAD" : pctDone < pctTime - 15 ? "BEHIND" : "ON TRACK";
  return `${goal.title}: ${pctDone.toFixed(0)}% done, ${pctTime.toFixed(0)}% of time used, ${daysLeft}d left → ${status}`;
}

export async function POST(req: Request) {
  const { userId } = await req.json();
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [goalsRes, tasksRes, checkinRes, businessesRes, workoutsRes] = await Promise.all([
    supabase.from("goals").select("*").eq("user_id", userId).eq("status", "active"),
    supabase.from("tasks").select("*").eq("user_id", userId).neq("status", "done").order("priority").limit(10),
    supabase.from("daily_checkins").select("*").eq("user_id", userId).eq("date", today).maybeSingle(),
    supabase.from("businesses").select("*").eq("user_id", userId),
    supabase.from("workout_logs").select("*").eq("user_id", userId).gte("date", getWeekStart()),
  ]);

  const goals = (goalsRes.data ?? []) as Goal[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const checkin = checkinRes.data as Checkin | null;
  const businesses = (businessesRes.data ?? []) as Business[];
  const workouts = (workoutsRes.data ?? []) as Workout[];

  const runsThisWeek = workouts.filter((w) => w.type === "run").length;
  const calisthicsThisWeek = workouts.filter((w) => w.type === "calisthenics").length;

  const goalPacingLines = goals.map((g) => goalPacing(g, today));
  const behindGoals = goalPacingLines.filter((l) => l.includes("BEHIND"));
  const aheadGoals = goalPacingLines.filter((l) => l.includes("AHEAD"));

  const context = `
Today: ${today}
User: Kiran — building DoubleLead (SaaS), targeting $10k/month income, based in Singapore.

ENERGY TODAY:
${checkin ? `Energy: ${checkin.energy_level}/10, Sleep: ${checkin.sleep_hours}h, Mood: ${checkin.mood}/5` : "No check-in yet."}

GOAL PACING (behind = urgent):
${goalPacingLines.join("\n") || "No goals set."}
${behindGoals.length > 0 ? `\n⚠️ BEHIND on: ${behindGoals.map((l) => l.split(":")[0]).join(", ")}` : ""}
${aheadGoals.length > 0 ? `✅ AHEAD on: ${aheadGoals.map((l) => l.split(":")[0]).join(", ")}` : ""}

BUSINESSES:
${businesses.map((b) => `- ${b.name}: MRR $${b.current_mrr} / target $${b.monthly_revenue_target}/mo (${b.status})`).join("\n") || "None."}

TOP OPEN TASKS:
${tasks.slice(0, 5).map((t) => `- [${t.priority}] ${t.title}`).join("\n") || "None."}

FITNESS:
- Runs: ${runsThisWeek}/2 this week
- Calisthenics: ${calisthicsThisWeek}/2 this week
`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: `You are Kiran's personal AI coach. Analyse his real goal pacing data and give a sharp, honest briefing.
- If he's BEHIND on goals, call it out directly with urgency
- If he's AHEAD, acknowledge it briefly then push harder
- Reference actual numbers, not generic advice
- 2-3 sentences briefing, then exactly 3 top actions for today
- Top actions must be specific and tied to his most urgent goal gaps
- Return ONLY JSON: { "briefing_text": "...", "top_actions": ["...", "...", "..."] }`,
    messages: [{ role: "user", content: context }],
  });

  let result = { briefing_text: "", top_actions: [] as string[] };
  try {
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const json = clean.match(/\{[\s\S]*\}/)?.[0];
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
