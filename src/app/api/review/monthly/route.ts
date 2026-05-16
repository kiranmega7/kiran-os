import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic();

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];
  const monthLabel = today.toLocaleDateString("en-SG", { month: "long", year: "numeric" });

  const [goalsRes, tasksRes, workoutsRes, checkinsRes, savingsRes, businessesRes] = await Promise.all([
    supabase.from("goals").select("*").eq("user_id", user.id),
    supabase.from("tasks").select("*").eq("user_id", user.id).gte("created_at", monthStart),
    supabase.from("workout_logs").select("*").eq("user_id", user.id).gte("date", monthStart).lte("date", todayStr),
    supabase.from("daily_checkins").select("*").eq("user_id", user.id).gte("date", monthStart).lte("date", todayStr),
    supabase.from("savings_logs").select("*").eq("user_id", user.id).gte("date", monthStart).lte("date", todayStr),
    supabase.from("businesses").select("*").eq("user_id", user.id),
  ]);

  const goals = goalsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const workouts = workoutsRes.data ?? [];
  const checkins = checkinsRes.data ?? [];
  const savings = savingsRes.data ?? [];
  const businesses = businessesRes.data ?? [];

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const totalIncome = savings.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
  const totalExpenses = savings.filter((l) => l.amount < 0).reduce((s, l) => s + Math.abs(l.amount), 0);
  const netSaved = totalIncome - totalExpenses;
  const daysLogged = checkins.length;
  const avgEnergy = checkins.length ? (checkins.reduce((s, c) => s + (c.energy_level ?? 0), 0) / checkins.length).toFixed(1) : "N/A";

  const activeGoals = goals.filter((g) => g.status === "active");
  const achievedGoals = goals.filter((g) => g.status === "achieved");

  const goalProgress = activeGoals.map((g) => {
    if (!g.target_value) return `${g.title}: in progress`;
    const pct = ((g.current_value / g.target_value) * 100).toFixed(0);
    const days = g.deadline ? Math.ceil((new Date(g.deadline).getTime() - today.getTime()) / 86400000) : null;
    return `${g.title}: ${pct}% complete${days ? `, ${days} days left` : ""}`;
  });

  const context = `
MONTH: ${monthLabel}
Days so far: ${today.getDate()}

GOAL PROGRESS:
${goalProgress.join("\n") || "No active goals"}
${achievedGoals.length > 0 ? `\nACHIEVED THIS MONTH: ${achievedGoals.map((g) => g.title).join(", ")}` : ""}

TASKS:
- Created: ${tasks.length}, Completed: ${doneTasks}

WORKOUTS:
- Total: ${workouts.length} sessions
- Runs: ${workouts.filter((w) => w.type === "run").length}
- Calisthenics: ${workouts.filter((w) => w.type === "calisthenics").length}

HEALTH:
- Days logged: ${daysLogged}/${today.getDate()}
- Avg energy: ${avgEnergy}/10

FINANCES:
- Income logged: $${totalIncome.toFixed(0)} SGD
- Expenses: $${totalExpenses.toFixed(0)} SGD
- Net saved: $${netSaved.toFixed(0)} SGD

BUSINESSES:
${businesses.map((b) => `- ${b.name}: $${b.current_mrr} MRR (target $${b.monthly_revenue_target}/mo)`).join("\n") || "None"}
`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: `You are Kiran's monthly performance analyst. Give a real, data-driven monthly snapshot.
Score out of 10. Be specific about what moved and what didn't.

Return ONLY this JSON:
{
  "score": 6,
  "summary": "2-3 sentence honest monthly assessment with real numbers",
  "highlights": ["specific highlight 1", "specific highlight 2"],
  "at_risk": ["goal or area at risk 1", "goal or area at risk 2"],
  "goal_progress": ["goal: status summary"],
  "next_month_focus": ["top focus 1", "top focus 2", "top focus 3"]
}`,
    messages: [{ role: "user", content: context }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  let result = { score: 0, summary: "", highlights: [], at_risk: [], goal_progress: [], next_month_focus: [] };
  try {
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    result = JSON.parse(clean);
  } catch { /* keep default */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("monthly_snapshots").upsert({
    user_id: user.id,
    month: monthStart,
    net_saved: netSaved,
    ...result,
  }, { onConflict: "user_id,month" });

  return NextResponse.json({ ...result, month: monthStart, net_saved: netSaved });
}
