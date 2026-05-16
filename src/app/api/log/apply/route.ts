import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Change = {
  action: "update" | "insert";
  table: string;
  recordId?: string;
  fields: Record<string, unknown>;
  description: string;
};

const USER_ID_TABLES = ["businesses", "goals", "tasks", "workout_logs", "daily_checkins", "savings_logs", "income_sources"];

export async function POST(req: NextRequest) {
  const { changes } = await req.json() as { changes: Change[] };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results = [];

  for (const change of changes) {
    const table = change.table as Parameters<typeof supabase.from>[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const from = supabase.from(table as any);

    if (change.action === "update" && change.recordId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = (from as any).update(change.fields).eq("id", change.recordId);
      if (USER_ID_TABLES.includes(change.table)) {
        const { error } = await query.eq("user_id", user.id);
        results.push({ success: !error, error: error?.message });
      } else {
        const { error } = await query;
        results.push({ success: !error, error: error?.message });
      }
    } else if (change.action === "insert") {
      const fields = USER_ID_TABLES.includes(change.table)
        ? { ...change.fields, user_id: user.id }
        : change.fields;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (from as any).insert(fields);
      results.push({ success: !error, error: error?.message });
    }
  }

  return NextResponse.json({ results });
}
