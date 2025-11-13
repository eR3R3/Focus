import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type InsertBody = {
  todoId: string | null;
  todoTitle: string;
  waitSeconds: number;
  focusSeconds: number;
  note?: string;
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
