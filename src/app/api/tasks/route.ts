import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  await supabase.from("tasks").update({ status }).eq("id", id);
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
