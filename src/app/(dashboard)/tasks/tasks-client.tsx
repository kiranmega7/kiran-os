"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

const PRIORITY_COLOR = { high: "bg-red-100 text-red-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-gray-100 text-gray-600" };

interface Props {
  userId: string;
  tasks: Task[];
  businesses: { id: string; name: string }[];
  goals: { id: string; title: string }[];
}

export function TasksClient({ userId, tasks: init, businesses, goals }: Props) {
  const [tasks, setTasks] = useState(init);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "todo" | "done">("todo");
  const [form, setForm] = useState({ title: "", priority: "medium", due_date: "", business_id: "", goal_id: "", description: "" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient() as any;

  async function addTask() {
    const { data } = await db.from("tasks").insert({
      user_id: userId,
      title: form.title,
      priority: form.priority,
      due_date: form.due_date || null,
      business_id: form.business_id || null,
      goal_id: form.goal_id || null,
      description: form.description || null,
      status: "todo",
    }).select().single();
    if (data) setTasks([data, ...tasks]);
    setOpen(false);
    setForm({ title: "", priority: "medium", due_date: "", business_id: "", goal_id: "", description: "" });
  }

  async function toggleTask(task: Task) {
    const status = task.status === "done" ? "todo" : "done";
    await db.from("tasks").update({ status }).eq("id", task.id);
    setTasks(tasks.map((t) => t.id === task.id ? { ...t, status } : t));
  }

  const filtered = tasks.filter((t) =>
    filter === "all" ? true : filter === "todo" ? t.status !== "done" : t.status === "done"
  );

  const grouped = {
    high: filtered.filter((t) => t.priority === "high"),
    medium: filtered.filter((t) => t.priority === "medium"),
    low: filtered.filter((t) => t.priority === "low"),
  };

  const businessMap = Object.fromEntries(businesses.map((b) => [b.id, b.name]));
  const goalMap = Object.fromEntries(goals.map((g) => [g.id, g.title]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add task
        </Button>
      </div>

      <div className="flex gap-2">
        {(["todo", "all", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "todo" ? "Open" : f === "all" ? "All" : "Done"}
          </button>
        ))}
      </div>

      {(Object.entries(grouped) as ["high" | "medium" | "low", Task[]][]).map(([priority, ptasks]) => {
        if (ptasks.length === 0) return null;
        return (
          <div key={priority}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{priority} priority</h2>
            <div className="space-y-2">
              {ptasks.map((task) => (
                <Card key={task.id} className={task.status === "done" ? "opacity-50" : ""}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleTask(task)} className="mt-0.5 shrink-0">
                        {task.status === "done"
                          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                          : <Circle className="w-5 h-5 text-gray-300" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-gray-400" : ""}`}>
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <Badge className={`text-xs ${PRIORITY_COLOR[task.priority as keyof typeof PRIORITY_COLOR]}`}>
                            {task.priority}
                          </Badge>
                          {task.business_id && businessMap[task.business_id] && (
                            <Badge variant="outline" className="text-xs">{businessMap[task.business_id]}</Badge>
                          )}
                          {task.goal_id && goalMap[task.goal_id] && (
                            <Badge variant="outline" className="text-xs">{goalMap[task.goal_id]}</Badge>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-gray-400">Due {new Date(task.due_date).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-8">No tasks here. Add one above.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Task</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Follow up with Siva" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Business (optional)</Label>
              <Select value={form.business_id} onValueChange={(v) => setForm({ ...form, business_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {businesses.map((b) => <SelectItem key={b.id} value={b.id ?? ""}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Goal (optional)</Label>
              <Select value={form.goal_id} onValueChange={(v) => setForm({ ...form, goal_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {goals.map((g) => <SelectItem key={g.id} value={g.id ?? ""}>{g.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={addTask} disabled={!form.title}>Add task</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
