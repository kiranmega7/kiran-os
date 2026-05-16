"use client";

import { useState } from "react";
import { PenLine, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Change = {
  action: "update" | "insert";
  table: string;
  recordId?: string;
  fields: Record<string, unknown>;
  description: string;
};

type ParsedLog = {
  changes: Change[];
  summary: string;
};

export function LogInput() {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedLog | null>(null);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  async function handleParse() {
    if (!note.trim()) return;
    setLoading(true);
    setParsed(null);
    setDone(false);
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      setParsed(data);
    } catch {
      setParsed({ changes: [], summary: "Failed to connect. Try again." });
    }
    setLoading(false);
  }

  async function handleApply() {
    if (!parsed || parsed.changes.length === 0) return;
    setApplying(true);
    try {
      await fetch("/api/log/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: parsed.changes }),
      });
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setNote("");
        setParsed(null);
        setDone(false);
      }, 1500);
    } catch {
      // keep modal open on error
    }
    setApplying(false);
  }

  function handleClose() {
    setOpen(false);
    setNote("");
    setParsed(null);
    setDone(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors w-full"
      >
        <PenLine className="w-4 h-4" />
        Quick log
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log something</DialogTitle>
          </DialogHeader>

          {!parsed && (
            <div className="space-y-3">
              <Textarea
                placeholder="e.g. Had a demo with Mr. Siva for DoubleLead today. Went for a 5km run."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <Button onClick={handleParse} disabled={loading || !note.trim()} className="w-full">
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analysing...</>
                ) : "Analyse"}
              </Button>
            </div>
          )}

          {parsed && !done && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{parsed.summary}</p>

              {parsed.changes.length === 0 ? (
                <p className="text-sm text-gray-400">No updates to apply.</p>
              ) : (
                <ul className="space-y-2">
                  {parsed.changes.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{c.description}</span>
                    </li>
                  ))}
                </ul>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  <XCircle className="w-4 h-4 mr-1" /> Cancel
                </Button>
                {parsed.changes.length > 0 && (
                  <Button onClick={handleApply} disabled={applying}>
                    {applying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Apply changes
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 text-green-600 text-sm py-2">
              <CheckCircle2 className="w-5 h-5" />
              Done! Data updated.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
