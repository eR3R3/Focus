import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
function loadEnvFile() {
  try {
    const envPath = join(__dirname, "..", ".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    const envVars = {};
    
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, "");
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

async function cropAndUpload() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing environment variables:");
    console.error("   NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
    console.error("   NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey);
    process.exit(1);
  }

  const inputPath = join(__dirname, "..", "public", "Hina Demon Queen.mp4");
  const outputPath = join(__dirname, "..", "public", "Hina Demon Queen_10s.mp4");
  const fileName = "Hina Demon Queen.mp4";
  const bucketName = "media";

  try {
    // Check if ffmpeg is available
    let ffmpegAvailable = false;
    try {
      execSync("which ffmpeg", { stdio: "ignore" });
      ffmpegAvailable = true;
    } catch {
      console.error("❌ ffmpeg is not installed. Please install it first:");
      console.error("   macOS: brew install ffmpeg");
      console.error("   Ubuntu: sudo apt-get install ffmpeg");
      process.exit(1);
    }

    // Crop video to first 10 seconds
    console.log("✂️  Cropping video to first 10 seconds...");
    try {
      execSync(
        `ffmpeg -i "${inputPath}" -t 10 -c copy "${outputPath}" -y`,
        { stdio: "inherit" }
      );
      console.log("✅ Video cropped successfully!");
    } catch (error) {
      console.error("❌ Error cropping video:", error.message);
      process.exit(1);
    }

    // Read the cropped file
    console.log(`\n📂 Reading cropped file: ${outputPath}`);
    const fileData = readFileSync(outputPath);
    console.log(`✅ File size: ${(fileData.length / 1024 / 1024).toFixed(2)} MB`);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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
        public: true,
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
        upsert: true,
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

    // Clean up cropped file
    console.log(`\n🧹 Cleaning up temporary file...`);
    try {
      unlinkSync(outputPath);
      console.log(`✅ Temporary file removed`);
    } catch (cleanupError) {
      console.warn(`⚠️  Could not remove temporary file: ${cleanupError.message}`);
    }

    console.log(`\n💡 You can use this URL in your code instead of the local file path.`);

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

cropAndUpload();

