import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic();

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const ws = weekStart.toISOString().split("T")[0];
  const we = weekEnd.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  const [goalsRes, tasksRes, workoutsRes, checkinsRes, savingsRes, businessesRes] = await Promise.all([
    supabase.from("goals").select("*").eq("user_id", user.id).eq("status", "active"),
    supabase.from("tasks").select("*").eq("user_id", user.id).gte("created_at", ws),
    supabase.from("workout_logs").select("*").eq("user_id", user.id).gte("date", ws).lte("date", todayStr),
    supabase.from("daily_checkins").select("*").eq("user_id", user.id).gte("date", ws).lte("date", todayStr),
    supabase.from("savings_logs").select("*").eq("user_id", user.id).gte("date", ws).lte("date", todayStr),
    supabase.from("businesses").select("*").eq("user_id", user.id),
  ]);

  const goals = goalsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const workouts = workoutsRes.data ?? [];
  const checkins = checkinsRes.data ?? [];
  const savings = savingsRes.data ?? [];
  const businesses = businessesRes.data ?? [];

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const runs = workouts.filter((w) => w.type === "run").length;
  const cals = workouts.filter((w) => w.type === "calisthenics").length;
  const avgEnergy = checkins.length ? (checkins.reduce((s, c) => s + (c.energy_level ?? 0), 0) / checkins.length).toFixed(1) : "N/A";
  const avgSleep = checkins.length ? (checkins.reduce((s, c) => s + (c.sleep_hours ?? 0), 0) / checkins.length).toFixed(1) : "N/A";
  const netSaved = savings.reduce((s, l) => s + l.amount, 0);

  const context = `
WEEK: ${ws} to ${we}
Day of review: ${todayStr}

GOALS (active):
${goals.map((g) => {
  if (!g.deadline || !g.target_value) return `- ${g.title}: ${g.current_value} ${g.unit ?? ""}`;
  const days = Math.ceil((new Date(g.deadline).getTime() - today.getTime()) / 86400000);
  const pct = ((g.current_value / g.target_value) * 100).toFixed(0);
  return `- ${g.title}: ${pct}% done, ${days} days left`;
}).join("\n") || "None"}

TASKS THIS WEEK:
- Created: ${tasks.length}, Completed: ${doneTasks}

WORKOUTS THIS WEEK:
- Runs: ${runs} (target: 2)
- Calisthenics: ${cals} (target: 2)

DAILY CHECK-INS THIS WEEK:
- Days logged: ${checkins.length}/7
- Avg energy: ${avgEnergy}/10
- Avg sleep: ${avgSleep}h

FINANCES THIS WEEK:
- Net: ${netSaved >= 0 ? "+" : ""}$${netSaved.toFixed(0)} SGD
- Entries logged: ${savings.length}

BUSINESSES:
${businesses.map((b) => `- ${b.name}: $${b.current_mrr} MRR (target $${b.monthly_revenue_target})`).join("\n") || "None"}
`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 700,
    system: `You are Kiran's weekly performance coach. Be honest, direct, and specific.
Give a score out of 10 based on goal progress, fitness, tasks, and consistency.
Be tough but fair. Call out what was actually good vs what was weak.

Return ONLY this JSON:
{
  "score": 7,
  "summary": "2-3 sentence honest assessment of the week",
  "wins": ["specific win 1", "specific win 2"],
  "gaps": ["specific gap 1", "specific gap 2"],
  "next_week_focus": ["top priority 1 for next week", "top priority 2", "top priority 3"]
}`,
    messages: [{ role: "user", content: context }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  let result = { score: 0, summary: "", wins: [], gaps: [], next_week_focus: [] };
  try {
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    result = JSON.parse(clean);
  } catch { /* keep default */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("weekly_reviews").upsert({
    user_id: user.id,
    week_start: ws,
    week_end: we,
    ...result,
  }, { onConflict: "user_id,week_start" });

  return NextResponse.json({ ...result, week_start: ws, week_end: we });
}
