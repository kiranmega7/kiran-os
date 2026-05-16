import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { input } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    system: `You are a goal extraction and planning assistant. The user describes a goal in plain English.
Extract structured data AND generate a specific daily action plan.

Today's date: ${today}

Extract:
- title: short goal title (max 8 words)
- category: one of "financial" | "business" | "fitness" | "personal"
- target_value: numeric target or null if not applicable
- current_value: numeric current value (default 0)
- unit: unit of measurement ("$", "min/km", "kg", "customers", etc.) or ""
- deadline: ISO date string (YYYY-MM-DD) or null
- daily_actions: 3-5 specific daily non-negotiable actions to hit this goal
- reasoning: one sentence explaining the daily plan logic

Rules:
- daily_actions must be SPECIFIC with numbers (e.g. "Send 15 cold DMs" not "do outreach")
- For pace goals (min/km), lower is better — note this in actions
- If deadline is stated as an age, calculate the date based on today
- Return ONLY JSON, no markdown

Example output:
{
  "title": "Run 5km at 5min/km",
  "category": "fitness",
  "target_value": 5,
  "current_value": 5.35,
  "unit": "min/km",
  "deadline": "2026-08-01",
  "daily_actions": [
    "Run 5km 3x per week, targeting 5:15 pace this month",
    "Do 20min tempo intervals once per week",
    "Log every run with pace and distance"
  ],
  "reasoning": "Consistent tempo runs and interval training are the fastest way to drop 35 seconds off your pace."
}`,
    messages: [{ role: "user", content: input }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";

  try {
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Could not parse goal." }, { status: 500 });
  }
}
