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

    // Query archived todos
    const { data: todos, error: todosError } = await supabase
      .from("ctdp_todos")
      .select("id,title,created_at,archived_at")
      .eq("user_id", user.id)
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false });

    if (todosError) {
      console.error("Error loading archived todos:", todosError);
      return NextResponse.json(
        { error: "Failed to load archived todos", details: todosError.message },
        { status: 500 },
      );
    }

    // Query subtasks separately for all archived todos
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

    return NextResponse.json({
      todos: (todos ?? []).map((todo) => ({
        id: todo.id,
        title: todo.title,
        archivedAt: todo.archived_at,
        subtasks:
          subtasksByTodoId.get(todo.id)?.map((subtask) => ({
            id: subtask.id,
            label: subtask.label,
            done: subtask.done,
            totalSeconds: subtask.total_seconds ?? 0,
          })) ?? [],
      })),
    });
  } catch (error) {
    console.error("Unexpected error in archive route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

