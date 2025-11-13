import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate dummy sessions for the last 7 days
    const dummySessions = [];
    const now = new Date();

    // Generate sessions for each of the last 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(0, 0, 0, 0);

      // Generate 2-5 sessions per day at random hours
      const sessionCount = Math.floor(Math.random() * 4) + 2; // 2-5 sessions
      const hours = Array.from({ length: sessionCount }, () =>
        Math.floor(Math.random() * 12) + 9, // 9 AM to 8 PM
      ).sort((a, b) => a - b);

      for (const hour of hours) {
        const sessionDate = new Date(date);
        sessionDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

        // Focus time between 15-60 minutes
        const focusMinutes = Math.floor(Math.random() * 45) + 15;
        const waitMinutes = Math.floor(Math.random() * 10) + 5;

        dummySessions.push({
          user_id: user.id,
          todo_id: null,
          todo_title: `Task ${dayOffset + 1}-${hours.indexOf(hour) + 1}`,
          wait_seconds: waitMinutes * 60,
          focus_seconds: focusMinutes * 60,
          note: `Dummy session ${dayOffset + 1}-${hours.indexOf(hour) + 1}`,
          created_at: sessionDate.toISOString(),
        });
      }
    }

    // Insert all dummy sessions
    const { data, error } = await supabase
      .from("ctdp_focus_sessions")
      .insert(dummySessions)
      .select("id");

    if (error) {
      console.error("Error inserting dummy data:", error);
      return NextResponse.json(
        { error: "Failed to insert dummy data", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: `Successfully inserted ${dummySessions.length} dummy sessions`,
      count: dummySessions.length,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

