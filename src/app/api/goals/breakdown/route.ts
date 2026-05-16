import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const { title, category, target_value, current_value, unit, deadline, current_situation, hours_per_day, main_lever } = await req.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const daysLeft = deadline ? Math.ceil((new Date(deadline).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)) : null;

  const prompt = `You are a strict goal-to-action planner. Generate a specific, realistic daily action plan.

GOAL:
- Title: ${title}
- Category: ${category}
- Target: ${target_value} ${unit}
- Current: ${current_value} ${unit}
- Gap: ${(parseFloat(target_value) - parseFloat(current_value)).toFixed(2)} ${unit}
- Deadline: ${deadline ?? "none"} ${daysLeft ? `(${daysLeft} days left)` : ""}

CONTEXT:
- Current situation: ${current_situation}
- Hours available per day: ${hours_per_day}
- Main lever/resource: ${main_lever}

Generate 3-5 SPECIFIC daily non-negotiable actions this person must do EVERY day to hit this goal.
No vague advice. Real, concrete actions with numbers where possible.

Respond ONLY with this JSON:
{
  "daily_actions": [
    "Send 15 cold LinkedIn DMs to SaaS founders",
    "Work 1 hour on DoubleLead onboarding flow",
    "Log all income and expenses"
  ],
  "reasoning": "One sentence explaining the logic behind this plan"
}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";

  try {
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ daily_actions: [], reasoning: "Could not generate plan." });
  }
}
