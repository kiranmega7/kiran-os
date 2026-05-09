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
import { Plus, ArrowUpCircle, ArrowDownCircle, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, progressPercent, daysUntil, formatDate } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type IncomeSource = Database["public"]["Tables"]["income_sources"]["Row"];
type SavingsLog = Database["public"]["Tables"]["savings_logs"]["Row"];
type Goal = Database["public"]["Tables"]["goals"]["Row"];

interface Props {
  userId: string;
  incomeSources: IncomeSource[];
  logs: SavingsLog[];
  financialGoals: Goal[];
}

export function FinanceClient({ userId, incomeSources: initIncome, logs: initLogs, financialGoals }: Props) {
  const [income, setIncome] = useState(initIncome);
  const [logs, setLogs] = useState(initLogs);
  const [logOpen, setLogOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [logForm, setLogForm] = useState({ amount: "", type: "savings", category: "", notes: "", date: new Date().toISOString().split("T")[0] });
  const [incomeForm, setIncomeForm] = useState({ name: "", type: "salary", amount: "", expected_date: "", notes: "" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const totalSaved = logs.filter((l) => l.type === "savings").reduce((sum, l) => sum + l.amount, 0);
  const totalIncome = logs.filter((l) => l.type === "income").reduce((sum, l) => sum + l.amount, 0);
  const totalExpenses = logs.filter((l) => l.type === "expense").reduce((sum, l) => sum + Math.abs(l.amount), 0);

  async function addLog() {
    const { data } = await supabase.from("savings_logs").insert({
      user_id: userId,
      date: logForm.date,
      amount: logForm.type === "expense" ? -Math.abs(parseFloat(logForm.amount)) : parseFloat(logForm.amount),
      type: logForm.type,
      category: logForm.category || null,
      notes: logForm.notes || null,
    }).select().single();
    if (data) setLogs([data, ...logs]);
    setLogOpen(false);
    setLogForm({ amount: "", type: "savings", category: "", notes: "", date: new Date().toISOString().split("T")[0] });
  }

  async function addIncome() {
    const { data } = await supabase.from("income_sources").insert({
      user_id: userId,
      name: incomeForm.name,
      type: incomeForm.type,
      amount: parseFloat(incomeForm.amount),
      expected_date: incomeForm.expected_date || null,
      notes: incomeForm.notes || null,
      received: false,
    }).select().single();
    if (data) setIncome([...income, data]);
    setIncomeOpen(false);
  }

  async function markReceived(id: string) {
    await supabase.from("income_sources").update({ received: true }).eq("id", id);
    setIncome(income.map((i) => i.id === id ? { ...i, received: true } : i));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finance</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setIncomeOpen(true)}>
            <Calendar className="w-4 h-4 mr-1" /> Add income
          </Button>
          <Button size="sm" onClick={() => setLogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Log entry
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <p className="text-xs text-green-600 font-medium">Saved (logged)</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalSaved)}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-xs text-blue-600 font-medium">Income (logged)</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <p className="text-xs text-red-600 font-medium">Expenses</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial goals */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Savings goals</h2>
        <div className="space-y-3">
          {financialGoals.map((g) => {
            const pct = progressPercent(g.current_value, g.target_value ?? 1);
            const days = g.deadline ? daysUntil(g.deadline) : null;
            const remaining = (g.target_value ?? 0) - g.current_value;
            const monthsLeft = days ? days / 30 : 1;
            const neededPerMonth = remaining > 0 ? remaining / monthsLeft : 0;
            return (
              <Card key={g.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between mb-1">
                    <p className="font-semibold">{g.title}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(g.current_value)} / {formatCurrency(g.target_value ?? 0)}</p>
                  </div>
                  <Progress value={pct} className="h-2 mb-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{pct}% there</span>
                    {days !== null && days > 0 && <span>Need {formatCurrency(neededPerMonth)}/month · {days} days left</span>}
                    {days !== null && days <= 0 && <span className="text-red-500">Deadline passed</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Upcoming income */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Income calendar</h2>
        <div className="space-y-2">
          {income.length === 0 && <p className="text-sm text-gray-400">No income sources added yet.</p>}
          {income.map((src) => (
            <div key={src.id} className="flex items-center justify-between bg-white border rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium">{src.name}</p>
                <p className="text-xs text-gray-400">{src.type} {src.expected_date ? `· ${formatDate(src.expected_date)}` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-green-700">{formatCurrency(src.amount)}</span>
                {!src.received ? (
                  <Button size="sm" variant="outline" onClick={() => markReceived(src.id)} className="h-7 text-xs">Received</Button>
                ) : (
                  <Badge className="bg-green-100 text-green-700 text-xs">Received</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent logs */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent entries</h2>
        <div className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-gray-400">No entries yet.</p>}
          {logs.slice(0, 15).map((log) => (
            <div key={log.id} className="flex items-center justify-between bg-white border rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                {log.type === "expense"
                  ? <ArrowDownCircle className="w-4 h-4 text-red-500 shrink-0" />
                  : <ArrowUpCircle className="w-4 h-4 text-green-500 shrink-0" />
                }
                <div>
                  <p className="text-sm">{log.notes || log.category || log.type}</p>
                  <p className="text-xs text-gray-400">{formatDate(log.date)}</p>
                </div>
              </div>
              <span className={`font-semibold text-sm ${log.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                {log.amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(log.amount))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Log entry modal */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log entry</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Type</Label>
              <Select value={logForm.type} onValueChange={(v) => setLogForm({ ...logForm, type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (SGD)</Label>
              <Input type="number" value={logForm.amount} onChange={(e) => setLogForm({ ...logForm, amount: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Category / Notes</Label>
              <Input value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} placeholder="e.g. Salary, Groceries" className="mt-1" />
            </div>
            <Button className="w-full" onClick={addLog} disabled={!logForm.amount}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add income modal */}
      <Dialog open={incomeOpen} onOpenChange={setIncomeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add income source</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Name</Label>
              <Input value={incomeForm.name} onChange={(e) => setIncomeForm({ ...incomeForm, name: e.target.value })} placeholder="e.g. Salary, Job bond" className="mt-1" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={incomeForm.type} onValueChange={(v) => setIncomeForm({ ...incomeForm, type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="bonus">Bonus / Bond</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (SGD)</Label>
              <Input type="number" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Expected date</Label>
              <Input type="date" value={incomeForm.expected_date} onChange={(e) => setIncomeForm({ ...incomeForm, expected_date: e.target.value })} className="mt-1" />
            </div>
            <Button className="w-full" onClick={addIncome} disabled={!incomeForm.name || !incomeForm.amount}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
