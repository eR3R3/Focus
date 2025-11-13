import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{
    todoId: string;
  }>;
}

export async function PATCH(request: Request, { params }: Params) {
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
  const title = (body.title as string | undefined)?.trim();

  if (!title) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("ctdp_todos")
    .update({ title })
    .eq("id", todoId)
    .eq("user_id", user.id)
    .select("id,title")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to update todo", details: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: data.id,
    title: data.title,
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { todoId } = await params;

  const { error } = await supabase
    .from("ctdp_todos")
    .delete()
    .eq("id", todoId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete todo", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

