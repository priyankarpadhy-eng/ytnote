import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 Client Configuration
 * To be powered by environment variables for security.
 */

const R2_ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME;
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL; // e.g. https://pub-xxx.r2.dev

const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

/**
 * Uploads a base64 image or blob to Cloudflare R2
 * @param {string|Blob} data - Image data
 * @param {string} fileName - Destination filename
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export async function uploadToR2(data, fileName) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        throw new Error("R2 Configuration missing. Please check your .env file.");
    }

    let body;
    let contentType = "image/jpeg";

    if (typeof data === 'string' && data.startsWith('data:')) {
        // Handle base64
        const base64Data = data.split(',')[1];
        body = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        contentType = data.split(';')[0].split(':')[1];
    } else {
        body = data;
    }

    // 1. Try Local Proxy (Bypass CORS in Dev)
    // Runs on http://localhost:3001 (started via scripts/upload-server.js)
    if (import.meta.env.DEV) {
        try {
            const response = await fetch('http://localhost:3001/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, fileName })
            });

            if (response.ok) {
                const result = await response.json();
                return result.url;
            } else {
                console.warn("Proxy upload failed, falling back to direct SDK.");
            }
        } catch (err) {
            // Proxy likely not running, ignore and fallback
            console.log("Local R2 proxy not detected. Using direct upload.");
        }
    }

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        Body: body,
        ContentType: contentType,
        ACL: 'public-read',
    });

    try {
        await r2Client.send(command);
        return `${R2_PUBLIC_URL}/${fileName}`;
    } catch (err) {
        console.error("R2 Upload Error:", err);
        throw err;
    }
}
