"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Link2, Unlink } from "lucide-react";

interface Props {
  stravaConnected: boolean;
  stravaAthleteId: number | null;
}

export function IntegrationsClient({ stravaConnected: initialConnected, stravaAthleteId }: Props) {
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected") === "true";
  const connectError = searchParams.get("error");

  const [connected, setConnected] = useState(initialConnected || justConnected);
  const [disconnecting, setDisconnecting] = useState(false);

  async function disconnect() {
    setDisconnecting(true);
    await fetch("/api/strava/disconnect", { method: "POST" });
    setConnected(false);
    setDisconnecting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-gray-400 mt-1">Connect apps to auto-sync data into Kiran OS</p>
      </div>

      {connectError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to connect. Try again.
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">S</div>
              <div>
                <CardTitle className="text-base">Strava</CardTitle>
                <p className="text-xs text-gray-400">Auto-log runs and workouts</p>
              </div>
            </div>
            {connected
              ? <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Connected</Badge>
              : <Badge variant="outline" className="text-xs text-gray-400">Not connected</Badge>
            }
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {connected ? (
            <>
              <p className="text-sm text-gray-500">
                Every run or workout you log on Strava will automatically appear in your Health page and count toward your fitness goals.
              </p>
              {stravaAthleteId && (
                <p className="text-xs text-gray-400">Athlete ID: {stravaAthleteId}</p>
              )}
              <Button variant="outline" size="sm" onClick={disconnect} disabled={disconnecting} className="text-red-600 border-red-200 hover:bg-red-50">
                <Unlink className="w-4 h-4 mr-1" />
                {disconnecting ? "Disconnecting..." : "Disconnect Strava"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                Connect Strava to automatically sync your runs and workouts. No more manual logging.
              </p>
              <Button size="sm" onClick={() => window.location.href = "/api/strava/connect"}>
                <Link2 className="w-4 h-4 mr-1" />
                Connect Strava
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="opacity-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 font-bold text-sm">$</div>
              <div>
                <CardTitle className="text-base text-gray-400">Bank / Finance</CardTitle>
                <p className="text-xs text-gray-400">Auto-sync transactions</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs text-gray-300">Coming soon</Badge>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
