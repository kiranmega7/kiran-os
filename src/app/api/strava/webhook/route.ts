import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Strava webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Invalid token" }, { status: 403 });
}

// Strava webhook event receiver
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Only handle new activity creates
  if (body.object_type !== "activity" || body.aspect_type !== "create") {
    return NextResponse.json({ ok: true });
  }

  const athleteId = body.owner_id;
  const activityId = body.object_id;

  const supabase = await createClient();

  // Find the user by athlete ID
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: connection } = await (supabase as any)
    .from("strava_connections")
    .select("*")
    .eq("athlete_id", athleteId)
    .single();

  if (!connection) return NextResponse.json({ ok: true });

  // Refresh token if expired
  let accessToken = connection.access_token;
  if (Date.now() / 1000 > connection.expires_at - 300) {
    const refreshRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const refreshed = await refreshRes.json();
    if (refreshed.access_token) {
      accessToken = refreshed.access_token;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("strava_connections").update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
      }).eq("user_id", connection.user_id);
    }
  }

  // Fetch activity details from Strava
  const activityRes = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const activity = await activityRes.json();

  // Map Strava sport type to our workout type
  const typeMap: Record<string, string> = {
    Run: "run",
    TrailRun: "run",
    WeightTraining: "calisthenics",
    Workout: "calisthenics",
  };
  const workoutType = typeMap[activity.sport_type] ?? "other";

  const date = activity.start_date_local?.split("T")[0] ?? new Date().toISOString().split("T")[0];
  const durationMins = activity.moving_time ? Math.round(activity.moving_time / 60) : null;
  const distanceKm = activity.distance ? (activity.distance / 1000).toFixed(2) : null;
  const paceNote = activity.average_speed && workoutType === "run"
    ? `${(1000 / activity.average_speed / 60).toFixed(2)} min/km`
    : null;

  const notes = [
    distanceKm ? `${distanceKm}km` : null,
    paceNote,
    activity.name !== "Morning Run" && activity.name !== "Evening Run" ? activity.name : null,
  ].filter(Boolean).join(" · ");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("workout_logs").insert({
    user_id: connection.user_id,
    date,
    type: workoutType,
    duration_mins: durationMins,
    completed: true,
    notes: notes || null,
  });

  return NextResponse.json({ ok: true });
}
