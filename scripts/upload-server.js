
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read .env
const envPath = path.resolve(__dirname, '../.env');
let env = {};
try {
    const envContent = fs.readFileSync(envPath, { encoding: 'utf-8' });
    envContent.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        const eq = line.indexOf('=');
        if (eq > 0) {
            let val = line.substring(eq + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            env[line.substring(0, eq).trim()] = val;
        }
    });
} catch (e) {
    console.error("Failed to read .env", e);
}

const { VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_BUCKET_NAME, VITE_R2_PUBLIC_URL } = env;

// 2. Setup S3 Client
const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: VITE_R2_ACCESS_KEY_ID,
        secretAccessKey: VITE_R2_SECRET_ACCESS_KEY,
    }
});

// 3. Create Server
const PORT = 3001;
const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    if (req.url === '/upload' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { data, fileName } = JSON.parse(body);

                console.log(`Uploading ${fileName}...`);

                // Convert Base64 to Buffer
                const base64Data = data.split(',')[1];
                const buffer = Buffer.from(base64Data, 'base64');
                const contentType = data.split(';')[0].split(':')[1];

                await r2.send(new PutObjectCommand({
                    Bucket: VITE_R2_BUCKET_NAME,
                    Key: fileName,
                    Body: buffer,
                    ContentType: contentType,
                    ACL: 'public-read'
                }));

                const publicUrl = `${VITE_R2_PUBLIC_URL}/${fileName}`;
                console.log(`Uploaded: ${publicUrl}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ url: publicUrl }));

            } catch (err) {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else {
        res.statusCode = 404;
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`R2 Proxy Server running at http://localhost:${PORT}`);
});
