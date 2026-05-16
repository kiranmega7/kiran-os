import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect("https://kiran-os.vercel.app/integrations?error=access_denied");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect("https://kiran-os.vercel.app/login");

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  const token = await tokenRes.json();
  if (!token.access_token) {
    return NextResponse.redirect("https://kiran-os.vercel.app/integrations?error=token_failed");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("strava_connections").upsert({
    user_id: user.id,
    athlete_id: token.athlete.id,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: token.expires_at,
  }, { onConflict: "user_id" });

  return NextResponse.redirect("https://kiran-os.vercel.app/integrations?connected=true");
}
