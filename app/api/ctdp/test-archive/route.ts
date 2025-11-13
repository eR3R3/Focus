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

    // Create a test todo
    const { data: todo, error: todoError } = await supabase
      .from("ctdp_todos")
      .insert({
        title: "测试归档任务",
        user_id: user.id,
      })
      .select("id")
      .single();

    if (todoError || !todo) {
      return NextResponse.json(
        { error: "Failed to create todo", details: todoError?.message },
        { status: 500 },
      );
    }

    // Create completed subtasks
    const subtasks = [
      { label: "完成第一步", done: true },
      { label: "完成第二步", done: true },
      { label: "完成第三步", done: true },
    ];

    const { error: subtasksError } = await supabase
      .from("ctdp_subtasks")
      .insert(
        subtasks.map((subtask) => ({
          todo_id: todo.id,
          user_id: user.id,
          label: subtask.label,
          done: subtask.done,
        })),
      );

    if (subtasksError) {
      return NextResponse.json(
        { error: "Failed to create subtasks", details: subtasksError.message },
        { status: 500 },
      );
    }

    // Archive the todo with yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999); // Set to end of yesterday

    const { error: archiveError } = await supabase
      .from("ctdp_todos")
      .update({ archived_at: yesterday.toISOString() })
      .eq("id", todo.id);

    if (archiveError) {
      return NextResponse.json(
        { error: "Failed to archive todo", details: archiveError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test archived task created successfully",
      archivedAt: yesterday.toISOString(),
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

