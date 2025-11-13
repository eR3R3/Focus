import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get sessions from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: sessions, error: sessionsError } = await supabase
      .from("ctdp_focus_sessions")
      .select("id,created_at,focus_seconds")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (sessionsError) {
      console.error("Error loading sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to load stats", details: sessionsError.message },
        { status: 500 },
      );
    }

    // Group by date
    const dailyStats = new Map<string, { sessions: number; minutes: number }>();

    // Initialize last 7 days with zeros
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split("T")[0];
      dailyStats.set(dateKey, { sessions: 0, minutes: 0 });
    }

    // Aggregate sessions by date
    if (sessions) {
      for (const session of sessions) {
        const sessionDate = new Date(session.created_at);
        sessionDate.setHours(0, 0, 0, 0);
        const dateKey = sessionDate.toISOString().split("T")[0];

        const existing = dailyStats.get(dateKey) || { sessions: 0, minutes: 0 };
        dailyStats.set(dateKey, {
          sessions: existing.sessions + 1,
          minutes: existing.minutes + Math.round(session.focus_seconds / 60),
        });
      }
    }

    // Convert to array format with hours
    const dailyData = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        day: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
        sessions: stats.sessions,
        hours: Number((stats.minutes / 60).toFixed(1)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate totals
    const totalSessions = dailyData.reduce((sum, day) => sum + day.sessions, 0);
    const totalHours = dailyData.reduce((sum, day) => sum + day.hours, 0);

    // Get today's sessions for hourly breakdown
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todaySessions, error: todaySessionsError } = await supabase
      .from("ctdp_focus_sessions")
      .select("id,created_at,focus_seconds")
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString())
      .order("created_at", { ascending: true });

    if (todaySessionsError) {
      console.error("Error loading today's sessions:", todaySessionsError);
    }

    // Group by hour (0-23)
    const hourlyStats = new Map<number, { sessions: number; minutes: number }>();

    // Initialize all 24 hours with zeros
    for (let hour = 0; hour < 24; hour++) {
      hourlyStats.set(hour, { sessions: 0, minutes: 0 });
    }

    // Aggregate today's sessions by hour
    if (todaySessions) {
      for (const session of todaySessions) {
        const sessionDate = new Date(session.created_at);
        const hour = sessionDate.getHours();

        const existing = hourlyStats.get(hour) || { sessions: 0, minutes: 0 };
        hourlyStats.set(hour, {
          sessions: existing.sessions + 1,
          minutes: existing.minutes + Math.round(session.focus_seconds / 60),
        });
      }
    }

    // Convert to interval format (e.g., 09:00-10:00)
    const hourlyData = Array.from(hourlyStats.entries())
      .map(([hour, stats]) => {
        const startHour = hour.toString().padStart(2, "0");
        const endHour = ((hour + 1) % 24).toString().padStart(2, "0");
        return {
          hour,
          interval: `${startHour}:00-${endHour}:00`,
          sessions: stats.sessions,
          minutes: stats.minutes,
        };
      })
      .sort((a, b) => a.hour - b.hour);

    // Calculate today's totals
    const todayTotalSessions = hourlyData.reduce((sum, h) => sum + h.sessions, 0);
    const todayTotalMinutes = hourlyData.reduce((sum, h) => sum + h.minutes, 0);

    return NextResponse.json({
      hourly: hourlyData,
      todayTotals: {
        sessions: todayTotalSessions,
        minutes: todayTotalMinutes,
      },
      daily: dailyData,
      totals: {
        sessions: totalSessions,
        hours: totalHours,
      },
    });
  } catch (error) {
    console.error("Unexpected error in stats route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

