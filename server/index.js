const express = require('express');
const { chromium } = require('playwright');
const sharp = require('sharp');
const cors = require('cors');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const app = express();

// 1. STRICT CORS POLICY
app.use(cors({
    origin: '*', // Allow all for development/debugging
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Manual Header Fallback for 502/Proxy bypass
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
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

app.get('/', (req, res) => res.send('LectureSnap Neural Engine v2.1 (Ultra Stealth)'));
app.get('/health', (req, res) => res.json({ status: 'ok', memory: process.memoryUsage() }));

// ---------------------------------------------------------
// BROWSER SINGLETON (REDUCE RAM USAGE)
// ---------------------------------------------------------
let sharedBrowser = null;
let browserLaunchPromise = null;

const LAUNCH_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu',
    '--disable-blink-features=AutomationControlled',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

async function getBrowser() {
    if (sharedBrowser) return sharedBrowser;
    if (browserLaunchPromise) return browserLaunchPromise;

    console.log("[SERVER] Launching fresh browser instance...");
    browserLaunchPromise = chromium.launch({ headless: true, args: LAUNCH_ARGS }).then(b => {
        sharedBrowser = b;
        browserLaunchPromise = null;
        b.on('disconnected', () => {
            console.log("[SERVER] Browser disconnected, clearing cache.");
            sharedBrowser = null;
        });
        return b;
    }).catch(err => {
        console.error("[SERVER] Browser launch FAILED:", err);
        browserLaunchPromise = null;
        throw err;
    });

    return browserLaunchPromise;
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
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'No URL' });

    let context;
    try {
        console.log(`[META] Probing: ${url}`);
        const browser = await getBrowser();
        context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });

        const page = await context.newPage();

        // Speed hack: block everything but HTML
        await page.route('**/*', (route) => {
            const type = route.request().resourceType();
            if (['document', 'script', 'xhr', 'fetch'].includes(type)) return route.continue();
            return route.abort();
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('video', { timeout: 15000 });

        const duration = await page.evaluate(() => document.querySelector('video')?.duration || 0);
        const interval = duration < 300 ? 5 : (duration < 900 ? 10 : 20);

        res.json({ duration, interval });

    } catch (e) {
        console.error("[META ERROR]", e.message);
        res.status(500).json({ error: e.message });
    } finally {
        if (context) await context.close();
    }
});

app.get('/scan', async (req, res) => {
    const { url: videoUrl, start, end } = req.query;
    const startParam = parseFloat(start) || 0;
    const endParam = parseFloat(end) || 0;

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    let context;
    try {
        const browser = await getBrowser();
        context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
        const page = await context.newPage();

        await context.route('**/*', route => {
            const u = route.request().url();
            if (u.includes('googleads') || u.includes('analytics')) return route.abort();
            route.continue();
        });

        await page.goto(videoUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('.html5-video-player', { timeout: 20000 });

        // Kill overlays
        await page.addStyleTag({
            content: `
            .ytp-chrome-top, .ytp-chrome-bottom, .ytp-gradient-top, .ytp-gradient-bottom,
            .ytp-watermark, .ytp-ce-element { display: none !important; }
        `});

        const duration = await page.evaluate(() => document.querySelector('video')?.duration || 0);
        const actualEnd = (endParam > 0 && endParam < duration) ? endParam : duration;
        const interval = duration < 1200 ? 10 : 20;

        let currentTime = startParam > 0 ? startParam : interval;
        let lastPhash = null;

        while (currentTime < actualEnd) {
            if (res.writableEnded) break;

            await page.evaluate((t) => {
                const v = document.querySelector('video');
                if (v) v.currentTime = t;
            }, currentTime);

            await page.waitForTimeout(500); // Wait for seek render

            const videoElement = await page.$('.html5-video-player');
            const buffer = await videoElement.screenshot({ type: 'jpeg', quality: 70 });

            const currentPhash = await calculateDHash(buffer);
            const isDuplicate = lastPhash && currentPhash === lastPhash; // Simple check for speed

            const progress = Math.min(100, Math.round(((currentTime - startParam) / (actualEnd - startParam)) * 100));

            if (!isDuplicate) {
                lastPhash = currentPhash;
                res.write(`data: ${JSON.stringify({
                    type: 'image',
                    imageUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
                    timestamp: Math.round(currentTime),
                    progress
                })}\n\n`);
            } else {
                res.write(`data: ${JSON.stringify({ type: 'progress', progress })}\n\n`);
            }

            currentTime += interval;
        }

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

    } catch (e) {
        console.error("[SCAN ERROR]", e.message);
        res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
    } finally {
        if (context) await context.close();
        res.end();
    }
});

app.post('/upload', async (req, res) => {
    try {
        const { data, fileName } = req.body;
        const base64Data = data.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        await r2.send(new PutObjectCommand({ Bucket: process.env.VITE_R2_BUCKET_NAME, Key: fileName, Body: buffer, ContentType: 'image/jpeg' }));
        res.json({ url: `${process.env.VITE_R2_PUBLIC_URL}/${fileName}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LectureSnap Ultra Stealth Engine running on ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
});
