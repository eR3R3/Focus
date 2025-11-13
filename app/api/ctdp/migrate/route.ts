import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Migration endpoint - executes the migration SQL directly
 * This requires SUPABASE_SERVICE_ROLE_KEY to be set
 * 
 * Usage: POST /api/ctdp/migrate
 */
export async function POST() {
  try {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseServiceKey || !supabaseUrl) {
      return NextResponse.json(
        {
          error: "Missing configuration",
          details: "SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required",
        },
        { status: 500 },
      );
    }

    // Read migration file
    const migrationPath = join(
      process.cwd(),
      "supabase/migrations/20250103120000_ctdp_core.sql",
    );

    let migrationSQL: string;
    try {
      migrationSQL = readFileSync(migrationPath, "utf-8");
    } catch (error) {
      return NextResponse.json(
        {
          error: "Failed to read migration file",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }

    // Extract project ref from Supabase URL
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectRef) {
      return NextResponse.json(
        {
          error: "Invalid Supabase URL format",
          details: "Could not extract project reference from URL",
        },
        { status: 500 },
      );
    }

    // Use Supabase Management API to execute SQL
    // Note: This requires the SQL to be executed via the Supabase dashboard
    // or using a Postgres client directly
    
    // For now, return the SQL to be executed
    return NextResponse.json({
      message: "Migration SQL ready",
      sql: migrationSQL,
      instructions: [
        "1. Copy the SQL from the 'sql' field above",
        "2. Go to: https://supabase.com/dashboard/project/_/sql/new",
        `3. Paste the SQL and click 'Run'`,
        "",
        "Alternatively, use Supabase CLI:",
        "  supabase db push",
      ],
      note: "Direct SQL execution via API is not supported. Please use the Supabase SQL Editor or CLI.",
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        error: "Failed to prepare migration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

