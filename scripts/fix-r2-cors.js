
import fs from 'fs';
import path from 'path';
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read .env file manually
const envPath = path.resolve(__dirname, '../.env');
console.log(`Reading .env from: ${envPath}`);

if (!fs.existsSync(envPath)) {
    console.error("Error: .env file not found!");
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, { encoding: 'utf-8' });
const env = {};
envContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const equalsIndex = line.indexOf('=');
    if (equalsIndex > 0) {
        const key = line.substring(0, equalsIndex).trim();
        let value = line.substring(equalsIndex + 1).trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
});

const R2_ACCOUNT_ID = env.VITE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = env.VITE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = env.VITE_R2_BUCKET_NAME;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error("Error: Missing R2 environment variables.");
    console.log("Found:", { R2_ACCOUNT_ID, R2_BUCKET_NAME, HAS_KEY: !!R2_ACCESS_KEY_ID, HAS_SECRET: !!R2_SECRET_ACCESS_KEY });
    process.exit(1);
}

console.log("Configuring R2 Client...");
const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

async function setCors() {
    console.log(`Setting CORS for bucket: ${R2_BUCKET_NAME}...`);
    try {
        const command = new PutBucketCorsCommand({
            Bucket: R2_BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
                        AllowedOrigins: ["http://localhost:5173", "http://localhost:3000", "*"], // Allow all for dev ease, or specific
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3000
                    }
                ]
            }
        });

        await r2Client.send(command);
        console.log("✅ CORS Configuration updated successfully!");
        console.log("You can now upload files from the browser (http://localhost:5173).");

    } catch (err) {
        console.error("❌ Failed to set CORS:", err);
    }
}

setCors();
