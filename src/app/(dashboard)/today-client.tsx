"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Zap, Target, CheckCircle2, Circle, Sparkles, Dumbbell, TrendingUp, RefreshCw, Flame } from "lucide-react";
import { formatCurrency, progressPercent, daysUntil } from "@/lib/utils";
import { CheckinModal } from "@/components/checkin-modal";
import type { Database } from "@/lib/types/database";

type Goal = Database["public"]["Tables"]["goals"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Business = Database["public"]["Tables"]["businesses"]["Row"];
type Checkin = Database["public"]["Tables"]["daily_checkins"]["Row"];
type Insight = Database["public"]["Tables"]["ai_insights"]["Row"];
type Workout = Database["public"]["Tables"]["workout_logs"]["Row"];

interface Props {
  userId: string;
  greeting: string;
  today: string;
  goals: Goal[];
  tasks: Task[];
  checkin: Checkin | null;
  businesses: Business[];
  workoutsThisWeek: Workout[];
  insight: Insight | null;
}

const PRIORITY_COLOR = { high: "bg-red-100 text-red-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-gray-100 text-gray-600" };

export function TodayClient({ userId, greeting, today, goals, tasks, checkin, businesses, workoutsThisWeek, insight }: Props) {
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [briefing, setBriefing] = useState(insight?.briefing_text ?? "");
  const [topActions, setTopActions] = useState<string[]>(
    Array.isArray(insight?.top_actions) ? insight.top_actions as string[] : []
  );
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const runsThisWeek = workoutsThisWeek.filter((w) => w.type === "run").length;
  const calisthicsThisWeek = workoutsThisWeek.filter((w) => w.type === "calisthenics").length;

  const financialGoals = goals.filter((g) => g.category === "financial");
  const businessGoals = goals.filter((g) => g.category === "business");

  async function generateBriefing() {
    setLoadingBriefing(true);
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      setBriefing(data.briefing_text ?? "");
      setTopActions(data.top_actions ?? []);
    } catch {
      setBriefing("Could not generate briefing. Check your API key.");
    }
    setLoadingBriefing(false);
  }

  async function toggleTask(taskId: string) {
    const next = new Set(completedTasks);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: "done" }),
      });
    }
    setCompletedTasks(next);
  }

  const todayTasks = tasks.filter((t) => !completedTasks.has(t.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting}, Kiran</h1>
          <p className="text-gray-500 text-sm">{today}</p>
        </div>
        {!checkin ? (
          <Button onClick={() => setCheckinOpen(true)} size="sm">
            <Zap className="w-4 h-4 mr-1" /> Check in
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Energy: {checkin.energy_level}/10</span>
            <span>·</span>
            <span>Sleep: {checkin.sleep_hours}h</span>
          </div>
        )}
      </div>

      {/* AI Briefing */}
      <Card className="border-0 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> AI Briefing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {briefing ? (
            <>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">{briefing}</p>
              {topActions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Top 3 today</p>
                  {topActions.map((action, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs font-bold text-gray-400 mt-0.5">{i + 1}.</span>
                      <p className="text-sm text-white">{action}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 mb-4">No briefing yet for today.</p>
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-3 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            onClick={generateBriefing}
            disabled={loadingBriefing}
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loadingBriefing ? "animate-spin" : ""}`} />
            {loadingBriefing ? "Thinking..." : briefing ? "Refresh" : "Generate briefing"}
          </Button>
        </CardContent>
      </Card>

      {/* Daily goal actions — checkable */}
      {goals.some((g) => Array.isArray(g.daily_actions) && (g.daily_actions as string[]).length > 0) && (
        <DailyNonNegotiables goals={goals} />
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Financial goals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Savings goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {financialGoals.length === 0 && <p className="text-sm text-gray-400">No financial goals yet.</p>}
            {financialGoals.map((g) => (
              <div key={g.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{g.title}</span>
                  <span className="text-gray-500">
                    {formatCurrency(g.current_value)} / {formatCurrency(g.target_value ?? 0)}
                  </span>
                </div>
                <Progress value={progressPercent(g.current_value, g.target_value ?? 1)} className="h-2" />
                {g.deadline && (
                  <p className="text-xs text-gray-400 mt-1">
                    {daysUntil(g.deadline)} days left
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Business pulse */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" /> Business pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {businesses.map((b) => (
              <div key={b.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{b.name}</p>
                  <p className="text-xs text-gray-400">MRR: {formatCurrency(b.current_mrr)}</p>
                </div>
                <Badge variant="outline" className="text-xs">{b.status}</Badge>
              </div>
            ))}
            {businessGoals.map((g) => (
              <div key={g.id} className="flex items-center justify-between">
                <p className="text-sm">{g.title}</p>
                <span className="text-sm font-semibold">{g.current_value} / {g.target_value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Fitness this week */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Dumbbell className="w-4 h-4" /> Fitness this week
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Running</span>
              <div className="flex gap-1">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      runsThisWeek >= n ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {n}
                  </div>
                ))}
                <span className="text-xs text-gray-400 ml-1 self-center">/2</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Calisthenics</span>
              <div className="flex gap-1">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      calisthicsThisWeek >= n ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {n}
                  </div>
                ))}
                <span className="text-xs text-gray-400 ml-1 self-center">/2</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Today&apos;s tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {todayTasks.length === 0 && <p className="text-sm text-gray-400">All done!</p>}
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-start gap-2">
                  <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0">
                    {completedTasks.has(task.id)
                      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                      : <Circle className="w-4 h-4 text-gray-300" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{task.title}</p>
                  </div>
                  <Badge className={`text-xs shrink-0 ${PRIORITY_COLOR[task.priority as keyof typeof PRIORITY_COLOR]}`}>
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <CheckinModal open={checkinOpen} onClose={() => setCheckinOpen(false)} userId={userId} />
    </div>
  );
}

function DailyNonNegotiables({ goals }: { goals: Goal[] }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const storageKey = `kiran-os-checked-${todayStr}`;

  const [checked, setChecked] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }

  const goalsWithActions = goals.filter((g) => Array.isArray(g.daily_actions) && (g.daily_actions as string[]).length > 0);
  const totalActions = goalsWithActions.reduce((sum, g) => sum + (g.daily_actions as string[]).length, 0);
  const doneCount = [...checked].length;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" /> Daily non-negotiables
          </CardTitle>
          <span className="text-xs font-semibold text-orange-600">{doneCount}/{totalActions} done</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goalsWithActions.map((g) => (
          <div key={g.id}>
            <p className="text-xs font-semibold text-gray-500 mb-2">{g.title}</p>
            <ul className="space-y-2">
              {(g.daily_actions as string[]).map((action, i) => {
                const key = `${g.id}-${i}`;
                const done = checked.has(key);
                return (
                  <li key={key}>
                    <button
                      onClick={() => toggle(key)}
                      className={`flex items-start gap-2 text-sm w-full text-left transition-opacity ${done ? "opacity-50" : ""}`}
                    >
                      {done
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        : <Circle className="w-4 h-4 text-orange-300 mt-0.5 shrink-0" />
                      }
                      <span className={done ? "line-through text-gray-400" : ""}>{action}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
