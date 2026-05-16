"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, Target, Heart, Star, Sparkles, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
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

const EMPTY_FORM = {
  title: "", category: "financial", target_value: "", current_value: "", unit: "$", deadline: "",
  current_situation: "", hours_per_day: "", main_lever: "",
};

export function GoalsClient({ userId, goals: initial, businesses }: Props) {
  const [goals, setGoals] = useState(initial);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "plan">("form");
  const [form, setForm] = useState(EMPTY_FORM);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [plan, setPlan] = useState<{ daily_actions: string[]; reasoning: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  function openDialog() {
    setForm(EMPTY_FORM);
    setPlan(null);
    setStep("form");
    setOpen(true);
  }

  async function generatePlan() {
    if (!form.title || !form.target_value || !form.current_situation || !form.hours_per_day || !form.main_lever) return;
    setGeneratingPlan(true);
    try {
      const res = await fetch("/api/goals/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setPlan(data);
      setStep("plan");
    } catch {
      setPlan({ daily_actions: [], reasoning: "Failed to generate plan." });
      setStep("plan");
    }
    setGeneratingPlan(false);
  }

  async function saveGoal() {
    setSaving(true);
    const context = `Situation: ${form.current_situation} | Hours/day: ${form.hours_per_day} | Lever: ${form.main_lever}`;
    const { data } = await supabase.from("goals").insert({
      user_id: userId,
      title: form.title,
      category: form.category,
      target_value: parseFloat(form.target_value) || null,
      current_value: parseFloat(form.current_value) || 0,
      unit: form.unit || null,
      deadline: form.deadline || null,
      status: "active",
      context,
      daily_actions: plan?.daily_actions ?? [],
    }).select().single();
    if (data) setGoals([...goals, data]);
    setSaving(false);
    setOpen(false);
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
    if (goal.unit === "$") return `Save ${formatCurrency((remaining / days) * 30)}/month to hit target`;
    return `${(remaining / days * 7).toFixed(1)} ${goal.unit}/week needed`;
  }

  const grouped = {
    financial: goals.filter((g) => g.category === "financial"),
    business: goals.filter((g) => g.category === "business"),
    fitness: goals.filter((g) => g.category === "fitness"),
    personal: goals.filter((g) => g.category === "personal"),
  };

  const formValid = form.title && form.target_value && form.current_situation && form.hours_per_day && form.main_lever;

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

                      <div className="flex items-center gap-2 mb-2">
                        <Progress value={pct} className="flex-1 h-2" />
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {goal.unit === "$" ? formatCurrency(goal.current_value) : goal.current_value}
                          {" / "}
                          {goal.unit === "$" ? formatCurrency(goal.target_value ?? 0) : `${goal.target_value} ${goal.unit ?? ""}`}
                        </span>
                      </div>

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
                        <button onClick={() => setUpdating(goal.id)} className="text-xs text-gray-400 hover:text-gray-700 underline">
                          Update progress
                        </button>
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
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{step === "form" ? "New goal" : "Your daily plan"}</DialogTitle>
          </DialogHeader>

          {step === "form" && (
            <div className="space-y-3 py-1 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Goal title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. $10k/month income" className="mt-1" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="fitness">Fitness</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Current</Label>
                  <Input type="number" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} className="mt-1" placeholder="0" />
                </div>
                <div>
                  <Label>Target</Label>
                  <Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} className="mt-1" placeholder="10000" />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="$" className="mt-1" />
                </div>
              </div>

              <div>
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="mt-1" />
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Context — be specific so the AI can help</p>
                <div className="space-y-2">
                  <div>
                    <Label>Your current situation</Label>
                    <Textarea
                      value={form.current_situation}
                      onChange={(e) => setForm({ ...form, current_situation: e.target.value })}
                      placeholder="e.g. I earn $2k/month from a job, have DoubleLead at 0 MRR, and know how to code and sell"
                      rows={2}
                      className="mt-1 resize-none text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Hours/day available</Label>
                      <Input value={form.hours_per_day} onChange={(e) => setForm({ ...form, hours_per_day: e.target.value })} placeholder="e.g. 3" className="mt-1" />
                    </div>
                    <div>
                      <Label>Main lever</Label>
                      <Input value={form.main_lever} onChange={(e) => setForm({ ...form, main_lever: e.target.value })} placeholder="e.g. sales, DoubleLead" className="mt-1" />
                    </div>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={generatePlan} disabled={!formValid || generatingPlan}>
                {generatingPlan ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating plan...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate daily plan</>
                )}
              </Button>
            </div>
          )}

          {step === "plan" && plan && (
            <div className="space-y-4 py-1">
              {plan.reasoning && (
                <p className="text-sm text-gray-500 italic">{plan.reasoning}</p>
              )}

              {plan.daily_actions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Do these every day</p>
                  <ul className="space-y-2">
                    {plan.daily_actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No plan generated. Try again with more context.</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>Back</Button>
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
