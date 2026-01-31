const express = require('express');
const { chromium } = require('playwright');
const sharp = require('sharp');
const cors = require('cors');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const app = express();

// 1. TOP PRIORITY: CORS must be first
app.use(cors({
    origin: ['https://lecturesnap.online', 'http://localhost:5173'],
    credentials: true
}));

// Handle preflight requests for all routes
app.options('*', cors());

// 2. Health check for Railway's proxy
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.use(express.json({ limit: '50mb' }));

// ---------------------------------------------------------
// R2 STORAGE SETUP
// ---------------------------------------------------------
const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.VITE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY,
    }
});

app.get('/', (req, res) => res.send('Neural Engine v3.1 (Handover Stable)'));

// ---------------------------------------------------------
// BROWSER SINGLETON (REDUCE RAM USAGE)
// ---------------------------------------------------------
let sharedBrowser = null;
let launchInProgress = false;

const LAUNCH_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--single-process',
    '--disable-gpu',
    '--no-zygote',
    '--no-first-run'
];

async function getBrowser() {
    if (sharedBrowser) return sharedBrowser;
    if (launchInProgress) {
        while (launchInProgress) { await new Promise(r => setTimeout(r, 500)); }
        if (sharedBrowser) return sharedBrowser;
    }

    console.log("[BROWSER] Launching Production Singleton...");
    launchInProgress = true;
    try {
        sharedBrowser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
        sharedBrowser.on('disconnected', () => {
            console.log("[BROWSER] Disconnected.");
            sharedBrowser = null;
        });
    } catch (err) {
        console.error("[BROWSER] LAUNCH ERROR:", err);
        throw err;
    } finally {
        launchInProgress = false;
    }
    return sharedBrowser;
}

// ---------------------------------------------------------
// UTILS
// ---------------------------------------------------------
async function calculateDHash(buffer) {
    try {
        const { data } = await sharp(buffer).resize(9, 8, { fit: 'fill' }).grayscale().raw().toBuffer({ resolveWithObject: true });
        let hash = '';
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                hash += (data[y * 9 + x] > data[y * 9 + x + 1] ? '1' : '0');
            }
        }
        return hash;
    } catch { return '0'.repeat(64); }
}

// ---------------------------------------------------------
// ENDPOINTS
// ---------------------------------------------------------
app.get('/meta', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing URL' });

    let context = null;
    try {
        const browser = await getBrowser();
        context = await browser.newContext();
        const page = await context.newPage();

        await page.route('**/*.{png,jpg,jpeg,gif,webp,woff,woff2}', r => r.abort());
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const duration = await page.evaluate(() => document.querySelector('video')?.duration || 0);

        res.json({ duration, interval: duration > 1200 ? 20 : 10 });
    } catch (e) {
        console.error("[META ERROR]", e);
        res.status(500).json({ error: e.message });
    } finally {
        if (context) await context.close().catch(() => { });
    }
});

app.get('/scan', async (req, res) => {
    const { url, start, end } = req.query;

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    let context = null;
    try {
        const browser = await getBrowser();
        context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('video', { timeout: 20000 });

        await page.addStyleTag({ content: '.ytp-chrome-bottom, .ytp-chrome-top { display: none !important; }' });

        let currentTime = parseFloat(start) || 10;
        const endTime = parseFloat(end) || 30;

        while (currentTime < endTime) {
            if (res.writableEnded) break;

            await page.evaluate(t => document.querySelector('video').currentTime = t, currentTime);
            await page.waitForTimeout(600);

            const videoElement = await page.$('.html5-video-player') || await page.$('video');
            const buffer = await videoElement.screenshot({ type: 'jpeg', quality: 70 });

            res.write(`data: ${JSON.stringify({
                type: 'image',
                imageUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
                timestamp: Math.round(currentTime),
                progress: Math.round(((currentTime - start) / (end - start)) * 100)
            })}\n\n`);

            currentTime += (endTime - start > 1200 ? 25 : 15);
        }
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (e) {
        console.error("[SCAN ERROR]", e);
        res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
    } finally {
        if (context) await context.close().catch(() => { });
        res.end();
    }
});

app.post('/upload', async (req, res) => {
    try {
        const { data, fileName } = req.body;
        const buffer = Buffer.from(data.split(',')[1], 'base64');
        await r2.send(new PutObjectCommand({
            Bucket: process.env.VITE_R2_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: 'image/jpeg'
        }));
        res.json({ url: `${process.env.VITE_R2_PUBLIC_URL}/${fileName}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Final Error Handler to ensure CORS headers are sent on errors
app.use((err, req, res, next) => {
    console.error("[GLOBAL ERROR]", err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// 3. RAILWAY BINDING: Use these exact variables
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});
