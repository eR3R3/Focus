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

    // Query todos first (exclude archived ones)
    const { data: todos, error: todosError } = await supabase
      .from("ctdp_todos")
      .select("id,title,created_at")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (todosError) {
      console.error("Error loading todos:", todosError);
      return NextResponse.json(
        { error: "Failed to load todos", details: todosError.message },
        { status: 500 },
      );
    }

    // Query subtasks separately for all todos
    const todoIds = todos?.map((todo) => todo.id) ?? [];
    const { data: subtasks, error: subtasksError } = todoIds.length > 0
      ? await supabase
          .from("ctdp_subtasks")
          .select("id,todo_id,label,done,total_seconds")
          .eq("user_id", user.id)
          .in("todo_id", todoIds)
      : { data: null, error: null };

    if (subtasksError) {
      console.error("Error loading subtasks:", subtasksError);
      // Don't fail the whole request if subtasks fail, just log it
    }

    // Group subtasks by todo_id
    const subtasksByTodoId = new Map<
      string,
      Array<{ id: string; todo_id: string; label: string; done: boolean; total_seconds: number }>
    >();
    if (subtasks) {
      for (const subtask of subtasks) {
        const existing = subtasksByTodoId.get(subtask.todo_id) ?? [];
        existing.push(subtask);
        subtasksByTodoId.set(subtask.todo_id, existing);
      }
    }

    const { data: sessionRows, error: sessionsError } = await supabase
      .from("ctdp_focus_sessions")
      .select("focus_seconds")
      .eq("user_id", user.id);

    if (sessionsError) {
      console.error("Error loading sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to load stats", details: sessionsError.message },
        { status: 500 },
      );
    }

    const totalSeconds =
      sessionRows?.reduce((acc, row) => acc + row.focus_seconds, 0) ?? 0;

    const { data: logs, error: logsError } = await supabase
      .from("ctdp_focus_sessions")
      .select("id,note,todo_title,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (logsError) {
      console.error("Error loading logs:", logsError);
      return NextResponse.json(
        { error: "Failed to load logs", details: logsError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      todos: (todos ?? []).map((todo) => ({
        id: todo.id,
        title: todo.title,
        subtasks:
          subtasksByTodoId.get(todo.id)?.map((subtask) => ({
            id: subtask.id,
            label: subtask.label,
            done: subtask.done,
            totalSeconds: subtask.total_seconds ?? 0,
          })) ?? [],
      })),
      stats: {
        nodes: sessionRows?.length ?? 0,
        minutes: Math.round(totalSeconds / 60),
      },
      logs:
        logs?.map((log) => ({
          id: log.id,
          todo: log.todo_title,
          note: log.note ?? "",
          createdAt: log.created_at,
        })) ?? [],
    });
  } catch (error) {
    console.error("Unexpected error in bootstrap route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
