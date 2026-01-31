const express = require('express');
const { chromium } = require('playwright');
const sharp = require('sharp');
const cors = require('cors');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

console.log("--- NEURAL ENGINE STARTUP ---");
console.log("Time:", new Date().toISOString());
console.log("Port Environment Variable:", process.env.PORT);

const app = express();

// 1. ABSOLUTE FIRST: Global CORS & Preflight
app.use(cors({
    origin: true, // Echoes back the origin header
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 2. MIDDLEWARE FOR LOGGING
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(express.json({ limit: '50mb' }));

// 3. LAZY R2 CLIENT
let _r2 = null;
function getR2() {
    if (_r2) return _r2;
    console.log("[STORAGE] Initializing R2 Client...");
    _r2 = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.VITE_R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY,
        }
    });
    return _r2;
}

// ---------------------------------------------------------
// HEALTH & BASIC ROUTES
// ---------------------------------------------------------
app.get('/', (req, res) => res.send('Neural Engine v2.5 (Alive)'));
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        engine: 'Playwright (Stealth)',
        env: {
            hasR2: !!process.env.VITE_R2_ACCOUNT_ID,
            port: process.env.PORT
        }
    });
});

// ---------------------------------------------------------
// BROWSER MANAGEMENT (SINGLETON + LAZY)
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
        // Simple wait for ongoing launch
        while (launchInProgress) { await new Promise(r => setTimeout(r, 500)); }
        if (sharedBrowser) return sharedBrowser;
    }

    console.log("[BROWSER] Launching Singleton...");
    launchInProgress = true;
    try {
        sharedBrowser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
        sharedBrowser.on('disconnected', () => {
            console.log("[BROWSER] Disconnected.");
            sharedBrowser = null;
        });
        console.log("[BROWSER] Launched successfully.");
    } catch (err) {
        console.error("[BROWSER] LAUNCH ERROR:", err);
        throw err;
    } finally {
        launchInProgress = false;
    }
    return sharedBrowser;
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

        // Speed tweaks
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
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    let context = null;
    try {
        const browser = await getBrowser();
        context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('video', { timeout: 20000 });

        // Minimal setup
        await page.addStyleTag({ content: '.ytp-chrome-bottom { display: none !important; }' });

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

            currentTime += (endTime - start > 1200 ? 25 : 15); // Auto interval
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
        const r2 = getR2();
        await r2.send(new PutObjectCommand({
            Bucket: process.env.VITE_R2_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: 'image/jpeg'
        }));
        res.json({ url: `${process.env.VITE_R2_PUBLIC_URL}/${fileName}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ SERVER ALIVE ON PORT ${PORT}`);
    console.log(`🌐 Public access via Railway Domain`);
});
