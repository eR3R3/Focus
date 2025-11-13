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

    // Get all unarchived todos
    const { data: todos, error: todosError } = await supabase
      .from("ctdp_todos")
      .select("id")
      .eq("user_id", user.id)
      .is("archived_at", null);

    if (todosError) {
      console.error("Error loading todos:", todosError);
      return NextResponse.json(
        { error: "Failed to load todos", details: todosError.message },
        { status: 500 },
      );
    }

    if (!todos || todos.length === 0) {
      return NextResponse.json({ archived: 0 });
    }

    const todoIds = todos.map((todo) => todo.id);

    // Get all subtasks for these todos
    const { data: subtasks, error: subtasksError } = await supabase
      .from("ctdp_subtasks")
      .select("todo_id,done")
      .eq("user_id", user.id)
      .in("todo_id", todoIds);

    if (subtasksError) {
      console.error("Error loading subtasks:", subtasksError);
      return NextResponse.json(
        { error: "Failed to load subtasks", details: subtasksError.message },
        { status: 500 },
      );
    }

    // Group subtasks by todo_id and check if all are done
    const subtasksByTodoId = new Map<string, { total: number; done: number }>();
    
    for (const subtask of subtasks ?? []) {
      const existing = subtasksByTodoId.get(subtask.todo_id) ?? { total: 0, done: 0 };
      existing.total += 1;
      if (subtask.done) {
        existing.done += 1;
      }
      subtasksByTodoId.set(subtask.todo_id, existing);
    }

    // Find todos where all subtasks are completed
    // Archive tasks that have all subtasks completed (user will call this after midnight)
    const todosToArchive: string[] = [];
    
    for (const todo of todos) {
      const stats = subtasksByTodoId.get(todo.id);
      // Archive if: has subtasks and all are done, OR has no subtasks (empty task)
      if (!stats || stats.total === 0 || stats.done === stats.total) {
        todosToArchive.push(todo.id);
      }
    }

    if (todosToArchive.length === 0) {
      return NextResponse.json({ archived: 0 });
    }

    // Archive these todos
    const { error: archiveError } = await supabase
      .from("ctdp_todos")
      .update({ archived_at: new Date().toISOString() })
      .in("id", todosToArchive)
      .eq("user_id", user.id);

    if (archiveError) {
      console.error("Error archiving todos:", archiveError);
      return NextResponse.json(
        { error: "Failed to archive todos", details: archiveError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ archived: todosToArchive.length });
  } catch (error) {
    console.error("Unexpected error in auto-archive route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

