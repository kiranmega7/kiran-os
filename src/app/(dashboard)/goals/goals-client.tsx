"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, Target, Heart, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, progressPercent, daysUntil } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type Goal = Database["public"]["Tables"]["goals"]["Row"];

const CATEGORY_ICON = {
  financial: TrendingUp,
  business: Target,
  fitness: Heart,
  personal: Star,
};

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

export function GoalsClient({ userId, goals: initial, businesses }: Props) {
  const [goals, setGoals] = useState(initial);
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", category: "financial", target_value: "", current_value: "", unit: "$", deadline: "", business_id: "" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  async function addGoal() {
    const { data } = await supabase.from("goals").insert({
      user_id: userId,
      title: form.title,
      category: form.category,
      target_value: parseFloat(form.target_value) || null,
      current_value: parseFloat(form.current_value) || 0,
      unit: form.unit || null,
      deadline: form.deadline || null,
      business_id: form.business_id || null,
      status: "active",
    }).select().single();
    if (data) setGoals([...goals, data]);
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
    if (goal.unit === "$") {
      const perMonth = (remaining / days) * 30;
      return `Save ${formatCurrency(perMonth)}/month to hit target`;
    }
    return `${(remaining / days * 7).toFixed(1)} ${goal.unit}/week needed`;
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
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add goal
        </Button>
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
                return (
                  <Card key={goal.id} className={`border ${CATEGORY_COLOR[category as keyof typeof CATEGORY_COLOR]}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{goal.title}</p>
                          {goal.deadline && (
                            <p className="text-xs text-gray-500">{daysUntil(goal.deadline)} days left · {new Date(goal.deadline).toLocaleDateString("en-SG", { month: "short", year: "numeric" })}</p>
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
                        <div className="flex gap-2">
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New goal</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Save $10K" className="mt-1" />
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Current value</Label>
                <Input type="number" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Target value</Label>
                <Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="$, customers, kg" className="mt-1" />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="mt-1" />
              </div>
            </div>
            <Button className="w-full" onClick={addGoal} disabled={!form.title}>Add goal</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
