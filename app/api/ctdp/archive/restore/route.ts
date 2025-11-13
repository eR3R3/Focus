import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { todoId } = body;

    if (!todoId) {
      return NextResponse.json(
        { error: "todoId is required" },
        { status: 400 },
      );
    }

    // Check if todo exists and is archived
    const { data: todo, error: todoError } = await supabase
      .from("ctdp_todos")
      .select("id")
      .eq("id", todoId)
      .eq("user_id", user.id)
      .not("archived_at", "is", null)
      .single();

    if (todoError || !todo) {
      return NextResponse.json(
        { error: "Todo not found or not archived", details: todoError?.message },
        { status: 404 },
      );
    }

    // Restore the todo (set archived_at to null)
    const { error: restoreError } = await supabase
      .from("ctdp_todos")
      .update({ archived_at: null })
      .eq("id", todoId)
      .eq("user_id", user.id);

    if (restoreError) {
      return NextResponse.json(
        { error: "Failed to restore todo", details: restoreError.message },
        { status: 500 },
      );
    }

    // Reset all subtasks to not done
    const { error: subtasksError } = await supabase
      .from("ctdp_subtasks")
      .update({ done: false })
      .eq("todo_id", todoId)
      .eq("user_id", user.id);

    if (subtasksError) {
      console.error("Failed to reset subtasks:", subtasksError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in restore route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

