"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Star, RefreshCw, Calendar, TrendingUp } from "lucide-react";

interface WeeklyReview {
  score: number;
  summary: string;
  wins: string[];
  gaps: string[];
  next_week_focus: string[];
  week_start: string;
  week_end: string;
}

interface MonthlySnapshot {
  score: number;
  summary: string;
  highlights: string[];
  at_risk: string[];
  goal_progress: string[];
  next_month_focus: string[];
  net_saved: number;
  month: string;
}

interface Props {
  weekly: WeeklyReview | null;
  monthly: MonthlySnapshot | null;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 8 ? "text-green-600 bg-green-50 border-green-200"
    : score >= 6 ? "text-yellow-600 bg-yellow-50 border-yellow-200"
    : "text-red-600 bg-red-50 border-red-200";
  return (
    <div className={`flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-bold ${color}`}>
      <Star className="w-3.5 h-3.5" /> {score}/10
    </div>
  );
}

export function ReviewClient({ weekly: initialWeekly, monthly: initialMonthly }: Props) {
  const [weekly, setWeekly] = useState<WeeklyReview | null>(initialWeekly);
  const [monthly, setMonthly] = useState<MonthlySnapshot | null>(initialMonthly);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  async function generateWeekly() {
    setLoadingWeekly(true);
    try {
      const res = await fetch("/api/review/weekly", { method: "POST" });
      const data = await res.json();
      setWeekly(data);
    } catch { /* keep state */ }
    setLoadingWeekly(false);
  }

  async function generateMonthly() {
    setLoadingMonthly(true);
    try {
      const res = await fetch("/api/review/monthly", { method: "POST" });
      const data = await res.json();
      setMonthly(data);
    } catch { /* keep state */ }
    setLoadingMonthly(false);
  }

  const weekLabel = weekly
    ? `${new Date(weekly.week_start).toLocaleDateString("en-SG", { day: "numeric", month: "short" })} – ${new Date(weekly.week_end).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}`
    : "This week";

  const monthLabel = monthly
    ? new Date(monthly.month).toLocaleDateString("en-SG", { month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-SG", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reviews</h1>

      {/* Weekly Review */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Weekly — {weekLabel}
          </h2>
          <Button size="sm" variant="outline" onClick={generateWeekly} disabled={loadingWeekly}>
            {loadingWeekly
              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
              : <><RefreshCw className="w-3 h-3 mr-1" /> {weekly ? "Regenerate" : "Generate"}</>
            }
          </Button>
        </div>

        {!weekly ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-gray-400 text-sm">
              No weekly review yet. Hit Generate to get your honest score.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Week score</CardTitle>
                  <ScoreBadge score={weekly.score} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 leading-relaxed">{weekly.summary}</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-3">
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-green-600 uppercase tracking-wide">Wins</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(weekly.wins ?? []).map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                      {w}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-red-600 uppercase tracking-wide">Gaps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(weekly.gaps ?? []).map((g, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      {g}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-blue-600 uppercase tracking-wide">Next week focus</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(weekly.next_week_focus ?? []).map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-xs font-bold text-blue-400 mt-0.5 shrink-0">{i + 1}.</span>
                      {f}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Snapshot */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Monthly — {monthLabel}
          </h2>
          <Button size="sm" variant="outline" onClick={generateMonthly} disabled={loadingMonthly}>
            {loadingMonthly
              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
              : <><RefreshCw className="w-3 h-3 mr-1" /> {monthly ? "Regenerate" : "Generate"}</>
            }
          </Button>
        </div>

        {!monthly ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-gray-400 text-sm">
              No monthly snapshot yet. Hit Generate to see your month in numbers.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Month score</CardTitle>
                  <div className="flex items-center gap-3">
                    {monthly.net_saved !== 0 && (
                      <span className={`text-sm font-semibold ${monthly.net_saved >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {monthly.net_saved >= 0 ? "+" : ""}${Math.abs(monthly.net_saved).toFixed(0)} SGD
                      </span>
                    )}
                    <ScoreBadge score={monthly.score} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 leading-relaxed">{monthly.summary}</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-3">
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-green-600 uppercase tracking-wide">Highlights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(monthly.highlights ?? []).map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                      {h}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-red-600 uppercase tracking-wide">At risk</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(monthly.at_risk ?? []).map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      {r}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {(monthly.next_month_focus ?? []).length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-blue-600 uppercase tracking-wide">Next month focus</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {monthly.next_month_focus.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-xs font-bold text-blue-400 mt-0.5 shrink-0">{i + 1}.</span>
                      {f}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
