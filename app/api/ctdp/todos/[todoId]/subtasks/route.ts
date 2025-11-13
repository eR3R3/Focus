import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{
    todoId: string;
  }>;
}

export async function POST(request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { todoId } = await params;
  const body = await request.json();
  const label = (body.label as string | undefined)?.trim();

  if (!label) {
    return NextResponse.json(
      { error: "Label is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("ctdp_subtasks")
    .insert({
      todo_id: todoId,
      label,
      user_id: user.id,
    })
    .select("id,label,done,created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to create subtask", details: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: data.id,
    label: data.label,
    done: data.done,
  });
}
