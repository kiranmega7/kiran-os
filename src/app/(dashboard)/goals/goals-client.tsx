"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, TrendingUp, Target, Heart, Star, Sparkles, Loader2, CheckCircle2, ChevronDown, ChevronUp, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, progressPercent, daysUntil } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type Goal = Database["public"]["Tables"]["goals"]["Row"];

const CATEGORY_ICON = { financial: TrendingUp, business: Target, fitness: Heart, personal: Star };
const CATEGORY_COLOR = {
  financial: "bg-green-50 border-green-200",
  business: "bg-blue-50 border-blue-200",
  fitness: "bg-orange-50 border-orange-200",
  personal: "bg-purple-50 border-purple-200",
};

interface Props {
  userId: string;
  goals: Goal[];
  businesses: { id: string; name: string }[];
}

type ParsedGoal = {
  title: string;
  category: "financial" | "business" | "fitness" | "personal";
  target_value: number | null;
  current_value: number;
  unit: string;
  deadline: string | null;
  daily_actions: string[];
  reasoning: string;
};

export function GoalsClient({ userId, goals: initial }: Props) {
  const [goals, setGoals] = useState(initial);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedGoal | null>(null);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [achieving, setAchieving] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  function openDialog() {
    setInput("");
    setParsed(null);
    setStep("input");
    setOpen(true);
  }

  async function parseGoal() {
    if (!input.trim()) return;
    setParsing(true);
    try {
      const res = await fetch("/api/goals/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      setParsed(data);
      setStep("confirm");
    } catch {
      setParsed(null);
    }
    setParsing(false);
  }

  async function saveGoal() {
    if (!parsed) return;
    setSaving(true);
    const { data } = await supabase.from("goals").insert({
      user_id: userId,
      title: parsed.title,
      category: parsed.category,
      target_value: parsed.target_value,
      current_value: parsed.current_value,
      unit: parsed.unit || null,
      deadline: parsed.deadline || null,
      status: "active",
      daily_actions: parsed.daily_actions,
      context: input,
    }).select().single();
    if (data) setGoals([...goals, data]);
    setSaving(false);
    setOpen(false);
  }

  async function markAchieved(goalId: string) {
    setAchieving(goalId);
    await supabase.from("goals").update({ status: "achieved" }).eq("id", goalId);
    setGoals(goals.filter((g) => g.id !== goalId));
    setAchieving(null);
  }

  async function updateProgress(goal: Goal, newValue: string) {
    const value = parseFloat(newValue);
    if (isNaN(value)) return;
    await supabase.from("goals").update({ current_value: value }).eq("id", goal.id);
    setGoals(goals.map((g) => g.id === goal.id ? { ...g, current_value: value } : g));
    setUpdating(null);
  }

  function goalPace(goal: Goal): string {
    if (!goal.deadline || !goal.target_value) return "";
    const days = daysUntil(goal.deadline);
    if (days <= 0) return "Deadline passed";
    const remaining = goal.target_value - goal.current_value;
    if (remaining <= 0) return "Goal achieved!";
    if (goal.unit === "$") return `Need ${formatCurrency((remaining / days) * 30)}/month`;
    return `Need ${(remaining / days * 7).toFixed(1)} ${goal.unit}/week`;
  }

  const grouped = {
    financial: goals.filter((g) => g.category === "financial"),
    business: goals.filter((g) => g.category === "business"),
    fitness: goals.filter((g) => g.category === "fitness"),
    personal: goals.filter((g) => g.category === "personal"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Goals</h1>
        <Button size="sm" onClick={openDialog}><Plus className="w-4 h-4 mr-1" /> Add goal</Button>
      </div>

      {(Object.entries(grouped) as [keyof typeof CATEGORY_ICON, Goal[]][]).map(([category, catGoals]) => {
        if (catGoals.length === 0) return null;
        const Icon = CATEGORY_ICON[category];
        return (
          <div key={category}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Icon className="w-4 h-4" /> {category}
            </h2>
            <div className="space-y-3">
              {catGoals.map((goal) => {
                const pct = progressPercent(goal.current_value, goal.target_value ?? 1);
                const pace = goalPace(goal);
                const actions = Array.isArray(goal.daily_actions) ? goal.daily_actions as string[] : [];
                const isExpanded = expanded === goal.id;
                return (
                  <Card key={goal.id} className={`border ${CATEGORY_COLOR[category as keyof typeof CATEGORY_COLOR]}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{goal.title}</p>
                          {goal.deadline && (
                            <p className="text-xs text-gray-500">
                              {daysUntil(goal.deadline)} days left · {new Date(goal.deadline).toLocaleDateString("en-SG", { month: "short", year: "numeric" })}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">{pct}%</Badge>
                      </div>

                      {goal.target_value !== null && (
                        <div className="flex items-center gap-2 mb-2">
                          <Progress value={pct} className="flex-1 h-2" />
                          <span className="text-sm text-gray-600 whitespace-nowrap">
                            {goal.unit === "$" ? formatCurrency(goal.current_value) : goal.current_value}
                            {" / "}
                            {goal.unit === "$" ? formatCurrency(goal.target_value ?? 0) : `${goal.target_value} ${goal.unit ?? ""}`}
                          </span>
                        </div>
                      )}

                      {pace && <p className="text-xs text-gray-500 mb-2">{pace}</p>}

                      {updating === goal.id ? (
                        <div className="flex gap-2 mb-2">
                          <Input
                            type="number"
                            defaultValue={goal.current_value}
                            className="h-7 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") updateProgress(goal, (e.target as HTMLInputElement).value);
                              if (e.key === "Escape") setUpdating(null);
                            }}
                            autoFocus
                          />
                          <Button size="sm" variant="outline" onClick={() => setUpdating(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {goal.target_value !== null && (
                            <button onClick={() => setUpdating(goal.id)} className="text-xs text-gray-400 hover:text-gray-700 underline">
                              Update progress
                            </button>
                          )}
                          <button
                            onClick={() => markAchieved(goal.id)}
                            disabled={achieving === goal.id}
                            className="text-xs text-green-600 hover:text-green-800 underline font-medium"
                          >
                            {achieving === goal.id ? "Saving..." : "Mark achieved ✓"}
                          </button>
                        </div>
                      )}

                      {actions.length > 0 && (
                        <div className="mt-3 border-t pt-3">
                          <button
                            onClick={() => setExpanded(isExpanded ? null : goal.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
                          >
                            <Sparkles className="w-3 h-3" />
                            Daily plan ({actions.length} actions)
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          {isExpanded && (
                            <ul className="mt-2 space-y-1.5">
                              {actions.map((action, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                  <Circle className="w-3 h-3 text-gray-300 mt-0.5 shrink-0" />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {goals.length === 0 && (
        <p className="text-center text-gray-400 py-12">No goals yet. Add one above.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{step === "input" ? "What's your goal?" : "Here's your plan"}</DialogTitle>
          </DialogHeader>

          {step === "input" && (
            <div className="space-y-4 py-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your goal naturally — be specific. e.g. 'I want to hit $10k/month income by age 25. Currently earning $2k/month from my job. I have DoubleLead at 0 MRR and 3 hours a day to work on it.'"
                rows={5}
                className="resize-none text-sm"
                autoFocus
              />
              <p className="text-xs text-gray-400">The more specific you are, the better the daily plan.</p>
              <Button className="w-full" onClick={parseGoal} disabled={!input.trim() || parsing}>
                {parsing
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Thinking...</>
                  : <><Sparkles className="w-4 h-4 mr-2" /> Generate plan</>
                }
              </Button>
            </div>
          )}

          {step === "confirm" && parsed && (
            <div className="space-y-4 py-1">
              <div>
                <p className="font-semibold text-lg">{parsed.title}</p>
                <p className="text-sm text-gray-400">
                  {parsed.target_value !== null && `${parsed.target_value} ${parsed.unit} · `}
                  {parsed.deadline && `${new Date(parsed.deadline).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}`}
                </p>
              </div>

              {parsed.daily_actions.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Do every day</p>
                  {parsed.daily_actions.slice(0, 3).map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {action}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("input")}>Back</Button>
                <Button className="flex-1" onClick={saveGoal} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save goal
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
