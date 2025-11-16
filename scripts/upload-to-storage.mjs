import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync as readEnvFile } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
function loadEnvFile() {
  try {
    const envPath = join(__dirname, "..", ".env.local");
    const envContent = readEnvFile(envPath, "utf-8");
    const envVars = {};
    
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, ""); // Remove quotes
          envVars[key.trim()] = value.trim();
        }
      }
    });
    
    Object.assign(process.env, envVars);
  } catch (error) {
    console.warn("⚠️  Could not load .env.local file:", error.message);
  }
}

loadEnvFile();

async function uploadToStorage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing environment variables:");
    console.error("   NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
    console.error("   NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
    console.error("\nPlease set these in your .env.local file");
    process.exit(1);
  }

  // File to upload
  const filePath = join(__dirname, "..", "public", "Hina Demon Queen.mp4");
  const fileName = "Hina Demon Queen.mp4";
  const bucketName = "media"; // Change this to your bucket name if different

  // Create Supabase client with service role key for admin access
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Read the file
    console.log(`📂 Reading file: ${filePath}`);
    const fileData = readFileSync(filePath);
    console.log(`✅ File size: ${(fileData.length / 1024 / 1024).toFixed(2)} MB`);

    // Check if bucket exists, create if not
    console.log(`\n🔍 Checking bucket: ${bucketName}`);
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error("❌ Error listing buckets:", listError);
      process.exit(1);
    }

    const bucketExists = buckets?.some((b) => b.name === bucketName);
    
    if (!bucketExists) {
      console.log(`📦 Creating bucket: ${bucketName}`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true, // Make bucket public so files can be accessed via URL
      });
      
      if (createError) {
        console.error("❌ Error creating bucket:", createError);
        process.exit(1);
      }
      console.log(`✅ Bucket created: ${bucketName}`);
    } else {
      console.log(`✅ Bucket exists: ${bucketName}`);
    }

    // Upload file
    console.log(`\n📤 Uploading file: ${fileName}`);
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileData, {
        contentType: "video/mp4",
        upsert: true, // Overwrite if file exists
      });

    if (error) {
      console.error("❌ Upload error:", error);
      process.exit(1);
    }

    console.log(`✅ Upload successful!`);
    console.log(`📁 Path: ${data.path}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    console.log(`\n🔗 Public URL:`);
    console.log(`   ${urlData.publicUrl}`);
    console.log(`\n💡 You can use this URL in your code instead of the local file path.`);

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

uploadToStorage();

