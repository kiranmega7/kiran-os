import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = "https://kiran-os.vercel.app/api/strava/callback";
  const scope = "activity:read_all";

  const url = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;

  return NextResponse.redirect(url);
}
