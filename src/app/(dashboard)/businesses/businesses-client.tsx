"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

type Business = Database["public"]["Tables"]["businesses"]["Row"];
type MetricLog = Database["public"]["Tables"]["business_metric_logs"]["Row"];

const STATUS_COLOR = { active: "bg-green-100 text-green-700", planning: "bg-yellow-100 text-yellow-700", paused: "bg-gray-100 text-gray-600" };

interface Props {
  userId: string;
  businesses: Business[];
  metrics: MetricLog[];
}

export function BusinessesClient({ userId, businesses: init, metrics: initMetrics }: Props) {
  const [businesses, setBusinesses] = useState(init);
  const [metrics, setMetrics] = useState(initMetrics);
  const [open, setOpen] = useState(false);
  const [metricOpen, setMetricOpen] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(init[0]?.id ?? null);
  const [editingMrr, setEditingMrr] = useState<string | null>(null);
  const [mrrValue, setMrrValue] = useState("");
  const [form, setForm] = useState({ name: "", type: "saas", status: "active", description: "", monthly_revenue_target: "", current_mrr: "" });
  const [metricForm, setMetricForm] = useState({ metric_name: "", value: "", notes: "", date: new Date().toISOString().split("T")[0] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  async function addBusiness() {
    const { data } = await supabase.from("businesses").insert({
      user_id: userId,
      name: form.name,
      type: form.type,
      status: form.status,
      description: form.description || null,
      monthly_revenue_target: parseFloat(form.monthly_revenue_target) || 0,
      current_mrr: parseFloat(form.current_mrr) || 0,
    }).select().single();
    if (data) setBusinesses([...businesses, data]);
    setOpen(false);
  }

  async function updateMrr(businessId: string) {
    const val = parseFloat(mrrValue);
    if (isNaN(val)) return;
    await supabase.from("businesses").update({ current_mrr: val }).eq("id", businessId);
    setBusinesses(businesses.map((b) => b.id === businessId ? { ...b, current_mrr: val } : b));
    setEditingMrr(null);
    setMrrValue("");
  }

  async function logMetric(businessId: string) {
    const { data } = await supabase.from("business_metric_logs").insert({
      business_id: businessId,
      metric_name: metricForm.metric_name,
      value: parseFloat(metricForm.value),
      date: metricForm.date,
      notes: metricForm.notes || null,
    }).select().single();
    if (data) setMetrics([data, ...metrics]);
    setMetricOpen(null);
    setMetricForm({ metric_name: "", value: "", notes: "", date: new Date().toISOString().split("T")[0] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Businesses</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add business
        </Button>
      </div>

      <div className="space-y-4">
        {businesses.map((b) => {
          const bMetrics = metrics.filter((m) => m.business_id === b.id);
          const isExpanded = expanded === b.id;
          return (
            <Card key={b.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{b.name}</CardTitle>
                    <p className="text-xs text-gray-400 mt-0.5">{b.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${STATUS_COLOR[b.status as keyof typeof STATUS_COLOR]}`}>{b.status}</Badge>
                    <button onClick={() => setExpanded(isExpanded ? null : b.id)}>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Current MRR</p>
                    {editingMrr === b.id ? (
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          value={mrrValue}
                          onChange={(e) => setMrrValue(e.target.value)}
                          className="h-7 text-sm w-24"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") updateMrr(b.id);
                            if (e.key === "Escape") setEditingMrr(null);
                          }}
                        />
                        <Button size="sm" className="h-7 text-xs px-2" onClick={() => updateMrr(b.id)}>✓</Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingMrr(b.id); setMrrValue(String(b.current_mrr)); }}
                        className="text-lg font-bold hover:text-blue-600 transition-colors"
                        title="Click to update MRR"
                      >
                        {formatCurrency(b.current_mrr)}
                      </button>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Target MRR</p>
                    <p className="text-lg font-bold">{formatCurrency(b.monthly_revenue_target)}</p>
                  </div>
                </div>

                {b.description && <p className="text-sm text-gray-500 mb-3">{b.description}</p>}

                {isExpanded && (
                  <div className="mt-3 border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-600">KPI logs</p>
                      <Button size="sm" variant="outline" onClick={() => setMetricOpen(b.id)} className="h-7 text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Log metric
                      </Button>
                    </div>
                    {bMetrics.length === 0 && <p className="text-sm text-gray-400">No metrics logged yet.</p>}
                    <div className="space-y-2">
                      {bMetrics.slice(0, 8).map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-gray-400" />
                            <span>{m.metric_name}</span>
                            {m.notes && <span className="text-gray-400">· {m.notes}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{m.value}</span>
                            <span className="text-xs text-gray-400">{formatDate(m.date)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add business modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add business</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. DoubleLead" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="tool">Tool</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Current MRR</Label>
                <Input type="number" value={form.current_mrr} onChange={(e) => setForm({ ...form, current_mrr: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>MRR target</Label>
                <Input type="number" value={form.monthly_revenue_target} onChange={(e) => setForm({ ...form, monthly_revenue_target: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 resize-none" rows={2} />
            </div>
            <Button className="w-full" onClick={addBusiness} disabled={!form.name}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log metric modal */}
      <Dialog open={!!metricOpen} onOpenChange={() => setMetricOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log metric</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Metric name</Label>
              <Input value={metricForm.metric_name} onChange={(e) => setMetricForm({ ...metricForm, metric_name: e.target.value })} placeholder="e.g. Paying customers, MRR, Demos" className="mt-1" />
            </div>
            <div>
              <Label>Value</Label>
              <Input type="number" value={metricForm.value} onChange={(e) => setMetricForm({ ...metricForm, value: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={metricForm.date} onChange={(e) => setMetricForm({ ...metricForm, date: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={metricForm.notes} onChange={(e) => setMetricForm({ ...metricForm, notes: e.target.value })} className="mt-1" />
            </div>
            <Button className="w-full" onClick={() => metricOpen && logMetric(metricOpen)} disabled={!metricForm.metric_name || !metricForm.value}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
