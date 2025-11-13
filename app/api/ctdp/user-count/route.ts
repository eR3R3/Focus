import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      // If service role key is not available, return 0
      return NextResponse.json({ count: 0 });
    }

    // Use service role key to bypass RLS and query auth.users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Query auth.users table directly
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error("Error counting users:", error);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: data?.users?.length ?? 0 });
  } catch (error) {
    console.error("Unexpected error in user-count route:", error);
    return NextResponse.json({ count: 0 });
  }
}

