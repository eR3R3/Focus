import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const title = (body.title as string | undefined)?.trim();

  if (!title) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("ctdp_todos")
    .insert({
      title,
      user_id: user.id,
    })
    .select("id,title,created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to create todo", details: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: data.id,
    title: data.title,
    subtasks: [],
  });
}
