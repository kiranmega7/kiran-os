"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type Checkin = Database["public"]["Tables"]["daily_checkins"]["Row"];
type Workout = Database["public"]["Tables"]["workout_logs"]["Row"];

interface Props {
  userId: string;
  checkins: Checkin[];
  workouts: Workout[];
}

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

export function HealthClient({ userId, checkins: initCheckins, workouts: initWorkouts }: Props) {
  const [workouts, setWorkouts] = useState(initWorkouts);
  const [checkins] = useState(initCheckins);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "run", duration_mins: "30", notes: "", date: new Date().toISOString().split("T")[0] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const weekStart = getWeekStart();
  const thisWeek = workouts.filter((w) => w.date >= weekStart);
  const runsThisWeek = thisWeek.filter((w) => w.type === "run").length;
  const calisthicsThisWeek = thisWeek.filter((w) => w.type === "calisthenics").length;

  const latest = checkins[0];
  const avgEnergy = checkins.length > 0
    ? Math.round(checkins.slice(0, 7).reduce((s, c) => s + (c.energy_level ?? 0), 0) / Math.min(7, checkins.length))
    : 0;
  const latestWeight = checkins.find((c) => c.weight_kg)?.weight_kg;

  async function logWorkout() {
    const { data } = await supabase.from("workout_logs").insert({
      user_id: userId,
      date: form.date,
      type: form.type,
      duration_mins: parseInt(form.duration_mins) || null,
      completed: true,
      notes: form.notes || null,
    }).select().single();
    if (data) setWorkouts([data, ...workouts]);
    setOpen(false);
  }

  const workoutColor = { run: "bg-orange-100 text-orange-700", calisthenics: "bg-blue-100 text-blue-700", other: "bg-gray-100 text-gray-600" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Health</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Log workout
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{avgEnergy || "—"}</p>
            <p className="text-xs text-gray-500 mt-1">Avg energy (7d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{latestWeight ? `${latestWeight}kg` : "—"}</p>
            <p className="text-xs text-gray-500 mt-1">Last weight</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{thisWeek.length}</p>
            <p className="text-xs text-gray-500 mt-1">Workouts this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly targets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" /> Weekly targets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Running", done: runsThisWeek, target: 2, type: "run" },
            { label: "Calisthenics", done: calisthicsThisWeek, target: 2, type: "calisthenics" },
          ].map(({ label, done, target }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm font-medium">{label}</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: target }, (_, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i < done ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {i < done ? "✓" : i + 1}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-gray-400">{done}/{target}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent workouts */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent workouts</h2>
        <div className="space-y-2">
          {workouts.length === 0 && <p className="text-sm text-gray-400">No workouts logged yet.</p>}
          {workouts.slice(0, 15).map((w) => (
            <div key={w.id} className="flex items-center justify-between bg-white border rounded-xl px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${workoutColor[w.type as keyof typeof workoutColor] || workoutColor.other}`}>
                    {w.type}
                  </Badge>
                  {w.duration_mins && <span className="text-sm text-gray-500">{w.duration_mins} min</span>}
                </div>
                {w.notes && <p className="text-xs text-gray-400 mt-1">{w.notes}</p>}
              </div>
              <p className="text-xs text-gray-400">{formatDate(w.date)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Energy history */}
      {checkins.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Energy log</h2>
          <div className="space-y-2">
            {checkins.slice(0, 10).map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white border rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    (c.energy_level ?? 0) >= 7 ? "bg-green-100 text-green-700" :
                    (c.energy_level ?? 0) >= 5 ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {c.energy_level}
                  </div>
                  <div>
                    <p className="text-sm">Sleep {c.sleep_hours}h · Mood {c.mood}/5</p>
                    {c.weight_kg && <p className="text-xs text-gray-400">{c.weight_kg}kg</p>}
                  </div>
                </div>
                <p className="text-xs text-gray-400">{formatDate(c.date)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log workout</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="run">Run</SelectItem>
                  <SelectItem value="calisthenics">Calisthenics</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" value={form.duration_mins} onChange={(e) => setForm({ ...form, duration_mins: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. 5km, felt great" className="mt-1" />
            </div>
            <Button className="w-full" onClick={logWorkout}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
