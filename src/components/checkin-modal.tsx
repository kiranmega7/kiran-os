"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export function CheckinModal({ open, onClose, userId }: Props) {
  const [energy, setEnergy] = useState(7);
  const [sleep, setSleep] = useState(7);
  const [mood, setMood] = useState(3);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function save() {
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("daily_checkins") as any).upsert({
      user_id: userId,
      date: today,
      energy_level: energy,
      sleep_hours: sleep,
      mood,
      weight_kg: weight ? parseFloat(weight) : null,
      notes: notes || null,
    }, { onConflict: "user_id,date" });
    setSaving(false);
    onClose();
    window.location.reload();
  }

  const moodLabels = ["", "Terrible", "Bad", "Okay", "Good", "Great"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Daily check-in</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Energy level: {energy}/10</Label>
            <input type="range" min={1} max={10} value={energy} onChange={(e) => setEnergy(+e.target.value)}
              className="w-full mt-1 accent-gray-900" />
          </div>
          <div>
            <Label>Sleep: {sleep}h</Label>
            <input type="range" min={3} max={12} step={0.5} value={sleep} onChange={(e) => setSleep(+e.target.value)}
              className="w-full mt-1 accent-gray-900" />
          </div>
          <div>
            <Label>Mood: {moodLabels[mood]}</Label>
            <input type="range" min={1} max={5} value={mood} onChange={(e) => setMood(+e.target.value)}
              className="w-full mt-1 accent-gray-900" />
          </div>
          <div>
            <Label>Weight (kg) — optional</Label>
            <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 72.5" className="mt-1" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything on your mind today?" className="mt-1 resize-none" rows={2} />
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save check-in"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
