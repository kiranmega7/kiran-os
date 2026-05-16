import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { note } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: businesses }, { data: goals }, { data: tasks }] = await Promise.all([
    supabase.from("businesses").select("id, name, status, current_mrr, description").eq("user_id", user.id),
    supabase.from("goals").select("id, title, category, current_value, target_value, unit, status").eq("user_id", user.id).eq("status", "active"),
    supabase.from("tasks").select("id, title, status, priority").eq("user_id", user.id).neq("status", "done").limit(20),
  ]);

  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are a data extraction assistant for a personal OS dashboard.
The user gives you a natural language note. Extract structured database updates/inserts.

Today: ${today}

EXISTING DATA:
Businesses: ${JSON.stringify(businesses)}
Active Goals: ${JSON.stringify(goals)}
Open Tasks: ${JSON.stringify(tasks)}

TABLES YOU CAN WRITE TO:
- businesses: { id, name, status ("active"|"planning"|"paused"), description, current_mrr (number), monthly_revenue_target (number) }
- goals: { id, title, current_value (number), status ("active"|"achieved"|"paused"), notes }
- tasks: { title, description, priority ("high"|"medium"|"low"), due_date (YYYY-MM-DD), status ("todo"|"in_progress"|"done") }
- workout_logs: { date, type ("run"|"calisthenics"|"other"), duration_mins (number), completed (boolean), notes }
- daily_checkins: { date, energy_level (1-10), sleep_hours (number), mood (1-5), weight_kg (number), notes }
- savings_logs: { date, amount (number), type ("income"|"expense"|"savings"), category, notes }

Respond ONLY with this JSON:
{
  "changes": [
    {
      "action": "update" | "insert",
      "table": "table_name",
      "recordId": "uuid (only for updates, from existing data above)",
      "fields": { ...fields to set },
      "description": "Plain English summary of this change"
    }
  ],
  "summary": "One sentence covering all changes"
}

Rules:
- Only include changes clearly implied by the note
- Match businesses/goals/tasks by name from existing data
- For updates, always include the recordId from existing data
- If nothing applies, return { "changes": [], "summary": "No updates found." }
- Never invent data not in the note`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: note }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";

  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ changes: [], summary: "Could not parse AI response." });
  }
}
