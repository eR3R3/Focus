import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing environment variables:");
    console.error("   NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
    console.error("   SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
    console.error("\nPlease set these in your .env.local file");
    process.exit(1);
  }

  // Read migration file
  const migrationPath = join(
    __dirname,
    "..",
    "supabase/migrations/20250103120000_ctdp_core.sql",
  );
  
  let migrationSQL;
  try {
    migrationSQL = readFileSync(migrationPath, "utf-8");
  } catch (error) {
    console.error("❌ Failed to read migration file:", migrationPath);
    console.error(error);
    process.exit(1);
  }

  console.log("📄 Migration file:", migrationPath);
  console.log("🚀 Executing migration...\n");

  // Extract database connection info from Supabase URL
  // Supabase URL format: https://<project-ref>.supabase.co
  // We need to construct the direct Postgres connection string
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    console.error("❌ Invalid Supabase URL format");
    process.exit(1);
  }

  // Construct Postgres connection string
  // Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  // We'll need the database password from the service role key or a separate env var
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  
  if (!dbPassword) {
    console.log("⚠️  SUPABASE_DB_PASSWORD not set. Using Supabase REST API approach...\n");
    console.log("📋 Migration SQL to execute:\n");
    console.log("=" .repeat(80));
    console.log(migrationSQL);
    console.log("=" .repeat(80));
    console.log("\n💡 To execute this migration:");
    console.log("   1. Go to: https://supabase.com/dashboard/project/_/sql/new");
    console.log("   2. Copy and paste the SQL above");
    console.log("   3. Click 'Run'\n");
    console.log("   OR use Supabase CLI:");
    console.log("   supabase db push\n");
    process.exit(0);
  }

  // Try to use pg library if available
  try {
    const { default: pg } = await import("pg");
    const { Client } = pg;

    const dbUrl = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
    
    const client = new Client({
      connectionString: dbUrl,
    });

    await client.connect();
    console.log("✅ Connected to database");

    // Execute migration SQL
    await client.query(migrationSQL);
    console.log("✅ Migration executed successfully");

    await client.end();
    console.log("✅ Migration complete!");
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
      console.log("⚠️  'pg' package not found. Installing...");
      console.log("   Run: npm install pg @types/pg");
      console.log("\n📋 Migration SQL to execute manually:\n");
      console.log("=" .repeat(80));
      console.log(migrationSQL);
      console.log("=" .repeat(80));
      console.log("\n💡 Execute this SQL in Supabase SQL Editor:");
      console.log("   https://supabase.com/dashboard/project/_/sql/new\n");
    } else {
      console.error("❌ Error executing migration:", error.message);
      console.log("\n📋 Migration SQL to execute manually:\n");
      console.log("=" .repeat(80));
      console.log(migrationSQL);
      console.log("=" .repeat(80));
    }
    process.exit(1);
  }
}

runMigration().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});

