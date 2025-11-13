import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{
    subtaskId: string;
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

  const { subtaskId } = await params;
  const body = await request.json();
  
  const updateData: { done?: boolean; label?: string } = {};
  
  if (typeof body.done === "boolean") {
    updateData.done = body.done;
  }
  
  if (typeof body.label === "string") {
    const label = body.label.trim();
    if (label) {
      updateData.label = label;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "done or label is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("ctdp_subtasks")
    .update(updateData)
    .eq("id", subtaskId)
    .eq("user_id", user.id)
    .select("id,label,done")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to update subtask", details: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: data.id,
    label: data.label,
    done: data.done,
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

  const { subtaskId } = await params;

  const { error } = await supabase
    .from("ctdp_subtasks")
    .delete()
    .eq("id", subtaskId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete subtask", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
