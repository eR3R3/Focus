"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/sidebar";
import { LogoutButton } from "@/components/logout-button";

interface HourlyStat {
  hour: number;
  interval: string;
  sessions: number;
  minutes: number;
}

interface DailyStat {
  date: string;
  day: string;
  sessions: number;
  hours: number;
}

interface StatsData {
  hourly: HourlyStat[];
  todayTotals: {
    sessions: number;
    minutes: number;
  };
  daily: DailyStat[];
  totals: {
    sessions: number;
    minutes: number;
  };
}

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/ctdp/stats");
      if (response.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load stats");
      }
      const data = (await response.json()) as StatsData;
      setStats(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive">{error || "Failed to load stats"}</p>
          <button
            onClick={loadStats}
            className="mt-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Statistics</h1>
            <LogoutButton />
          </div>

          {/* Today's Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Today's Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stats.todayTotals.sessions}</p>
                <p className="mt-1 text-sm text-muted-foreground">Today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Today's Focus Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stats.todayTotals.minutes}</p>
                <p className="mt-1 text-sm text-muted-foreground">Minutes</p>
              </CardContent>
            </Card>
          </div>

          {/* Today's Focus Time by Interval */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today's Focus Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="interval"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value: number) => [`${value} min`, "Focus Time"]}
                  />
                  <Bar dataKey="minutes" fill="hsl(var(--foreground))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekly Daily Focus Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly Focus Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="day"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value: number) => [`${value} hrs`, "Focus Time"]}
                  />
                  <Bar dataKey="hours" fill="hsl(var(--foreground))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                        Day
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">
                        Sessions
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">
                        Hours
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.daily.map((day) => (
                      <tr key={day.date} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 text-sm">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-2 text-sm">{day.day}</td>
                        <td className="px-4 py-2 text-right text-sm">{day.sessions}</td>
                        <td className="px-4 py-2 text-right text-sm">{day.hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

