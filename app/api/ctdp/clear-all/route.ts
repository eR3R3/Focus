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

    // Delete all user's data in order (respecting foreign key constraints)
    // 1. Delete focus sessions (references todos)
    const { error: sessionsError } = await supabase
      .from("ctdp_focus_sessions")
      .delete()
      .eq("user_id", user.id);

    if (sessionsError) {
      console.error("Error deleting sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to delete sessions", details: sessionsError.message },
        { status: 500 },
      );
    }

    // 2. Delete subtasks (references todos)
    const { error: subtasksError } = await supabase
      .from("ctdp_subtasks")
      .delete()
      .eq("user_id", user.id);

    if (subtasksError) {
      console.error("Error deleting subtasks:", subtasksError);
      return NextResponse.json(
        { error: "Failed to delete subtasks", details: subtasksError.message },
        { status: 500 },
      );
    }

    // 3. Delete todos
    const { error: todosError } = await supabase
      .from("ctdp_todos")
      .delete()
      .eq("user_id", user.id);

    if (todosError) {
      console.error("Error deleting todos:", todosError);
      return NextResponse.json(
        { error: "Failed to delete todos", details: todosError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "All data cleared successfully",
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

