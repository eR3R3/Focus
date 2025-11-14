import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type InsertBody = {
  todoId: string | null;
  todoTitle: string;
  waitSeconds: number;
  focusSeconds: number;
  note?: string;
  subtaskIds?: string[]; // Array of subtask IDs that were selected for this session
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as InsertBody;
  const todoTitle = body.todoTitle?.trim();
  if (!todoTitle) {
    return NextResponse.json(
      { error: "todoTitle is required" },
      { status: 400 },
    );
  }

  const waitSeconds = Math.max(0, Number(body.waitSeconds) || 0);
  const focusSeconds = Math.max(1, Number(body.focusSeconds) || 0);
  const note = body.note?.trim();
  const subtaskIds = body.subtaskIds ?? [];

  const { data: session, error: insertError } = await supabase
    .from("ctdp_focus_sessions")
    .insert({
      todo_id: body.todoId,
      todo_title: todoTitle,
      wait_seconds: waitSeconds,
      focus_seconds: focusSeconds,
      note,
      user_id: user.id,
    })
    .select("id,todo_title,note,created_at")
    .single();

  if (insertError || !session) {
    return NextResponse.json(
      { error: "Failed to write session", details: insertError?.message },
      { status: 500 },
    );
  }

  // Record time for each subtask
  if (subtaskIds.length > 0 && focusSeconds > 0) {
    // Distribute time equally among selected subtasks
    const secondsPerSubtask = Math.floor(focusSeconds / subtaskIds.length);
    
    if (secondsPerSubtask > 0) {
      // Insert subtask session records
      const subtaskSessionRecords = subtaskIds.map((subtaskId) => ({
        user_id: user.id,
        subtask_id: subtaskId,
        session_id: session.id,
        seconds: secondsPerSubtask,
      }));

      const { error: subtaskSessionsError } = await supabase
        .from("ctdp_subtask_sessions")
        .insert(subtaskSessionRecords);

      if (subtaskSessionsError) {
        console.error("Error recording subtask sessions:", subtaskSessionsError);
        // Don't fail the whole request, just log it
      } else {
        // Update total_seconds for each subtask
        for (const subtaskId of subtaskIds) {
          const { error: updateError } = await supabase.rpc("increment_subtask_time", {
            subtask_id: subtaskId,
            seconds_to_add: secondsPerSubtask,
          });

          if (updateError) {
            // Fallback: direct update if RPC doesn't exist
            const { data: currentSubtask } = await supabase
              .from("ctdp_subtasks")
              .select("total_seconds")
              .eq("id", subtaskId)
              .eq("user_id", user.id)
              .single();

            if (currentSubtask) {
              await supabase
                .from("ctdp_subtasks")
                .update({ total_seconds: currentSubtask.total_seconds + secondsPerSubtask })
                .eq("id", subtaskId)
                .eq("user_id", user.id);
            }
          }
        }
      }
    }
  }

  const { data: statsRows, error: statsError } = await supabase
    .from("ctdp_focus_sessions")
    .select("focus_seconds")
    .eq("user_id", user.id);

  if (statsError) {
    return NextResponse.json(
      { error: "Failed to compute stats", details: statsError.message },
      { status: 500 },
    );
  }

  const totalSeconds =
    statsRows?.reduce((acc, row) => acc + row.focus_seconds, 0) ?? 0;

  return NextResponse.json({
    stats: {
      nodes: statsRows?.length ?? 0,
      minutes: Math.round(totalSeconds / 60),
    },
    log: {
      id: session.id,
      todo: session.todo_title,
      note: session.note ?? "",
      createdAt: session.created_at,
    },
  });
}
