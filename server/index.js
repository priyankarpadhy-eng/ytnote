const express = require('express');
const { chromium } = require('playwright');
const sharp = require('sharp');
const cors = require('cors');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const app = express();
app.use(cors());
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

app.get('/', (req, res) => res.send('LectureSnap Neural Engine v2.0 (Stealth)'));

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

const LAUNCH_ARGS = [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled',
    '--disable-infobars', '--window-position=0,0', '--ignore-certifcate-errors',
    '--ignore-certifcate-errors-spki-list',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

// ---------------------------------------------------------
// ENDPOINTS
// ---------------------------------------------------------
app.get('/meta', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'No URL' });

    let browser;
    try {
        console.log(`[META] Connecting: ${url}`);
        browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 },
            deviceScaleFactor: 1
        });

        // Block heavy resources for speed
        await context.route('**/*.{png,jpg,jpeg,gif,webp,font,woff,woff2}', route => route.abort());

        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for player
        await page.waitForSelector('#movie_player', { timeout: 15000 });

        // Get Duration
        const duration = await page.evaluate(() => {
            const v = document.querySelector('video');
            return v ? v.duration : 0;
        });

        const interval = duration < 300 ? 2 : (duration < 900 ? 5 : (duration < 1800 ? 10 : 20));
        res.json({ duration: duration || 0, interval });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to probe video" });
    } finally {
        if (browser) await browser.close();
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
    });

    console.log(`[SCAN] Worker started: ${startParam}-${endParam}s`);

    let browser;
    try {
        browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 },
            locale: 'en-US',
            timezoneId: 'America/New_York'
        });

        // BLOCK ADS & TRACKERS to avoid "Something went wrong" crashes
        await context.route('**/*', route => {
            const u = route.request().url();
            if (u.includes('googleads') || u.includes('doubleclick') || u.includes('analytics')) return route.abort();
            if (u.match(/\.(png|jpg|jpeg|gif|webp|font|woff|woff2)$/)) return route.abort();
            route.continue();
        });

        const page = await context.newPage();

        // Init Stealth Scripts
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        await page.goto(videoUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 1. Wait for player
        try {
            await page.waitForSelector('.html5-video-player', { state: 'visible', timeout: 20000 });
        } catch {
            throw new Error("Video player not found (blocked?)");
        }

        // 2. Kill Overlays
        await page.addStyleTag({
            content: `
            .ytp-chrome-top, .ytp-chrome-bottom, .ytp-gradient-top, .ytp-gradient-bottom,
            .ytp-watermark, .ytp-ce-element, .ytp-bezel-text, .ytp-spinner, .ytp-ad-overlay-container 
            { display: none !important; }
        `});

        // 3. Ensure Video Ready
        await page.evaluate(() => {
            const v = document.querySelector('video');
            if (v) {
                v.muted = true;
                v.pause(); // We seek manually, no need to play
            }
        });

        // 4. Calculate Steps
        const duration = await page.evaluate(() => document.querySelector('video')?.duration || 0);
        const actualEnd = (endParam > 0 && endParam < duration) ? endParam : duration;

        // Smart Interval based on total video length (not just chunk)
        let interval = 5;
        if (duration < 300) interval = 2;
        else if (duration < 900) interval = 5;
        else if (duration < 1800) interval = 10;
        else if (duration < 3600) interval = 15;
        else interval = 20;

        let currentTime = startParam > 0 ? startParam : interval;
        const segmentDuration = actualEnd - startParam;

        // Loop
        let lastPhash = null;

        while (currentTime < actualEnd) {
            if (res.writableEnded) break;

            // SEEK SAFE
            const seekSuccess = await page.evaluate(async (t) => {
                const v = document.querySelector('video');
                if (!v) return false;

                return new Promise(resolve => {
                    let done = false;
                    const onSeek = () => {
                        if (!done) { done = true; v.removeEventListener('seeked', onSeek); resolve(true); }
                    };
                    v.addEventListener('seeked', onSeek);
                    v.currentTime = t;
                    // Fallback if event doesn't fire
                    setTimeout(() => { if (!done) { done = true; resolve(false); } }, 2000);
                });
            }, currentTime);

            // Wait a tiny bit for render buffer to clear artifacts
            if (seekSuccess) await page.waitForTimeout(300);
            else await page.waitForTimeout(1000); // Wait longer if seek didn't ack

            // ERROR CHECK: "Something went wrong"
            const isError = await page.$eval('.ytp-error-content', el => el && el.offsetParent !== null).catch(() => false);
            if (isError) {
                console.log("Player crashed, retrying page...");
                await page.reload({ waitUntil: 'domcontentloaded' });
                // Reset styling
                await page.addStyleTag({ content: `.ytp-chrome-bottom { display: none !important; }` });
                continue; // Retry same timestamp
            }

            // SCREENSHOT (Element Handle Only)
            const videoElement = await page.$('.html5-video-player'); // Container is safer than just video tag sometimes
            let buffer;
            if (videoElement) {
                // screenshot element
                buffer = await videoElement.screenshot({ type: 'jpeg', quality: 80 });
            } else {
                // extreme fallback
                buffer = await page.screenshot({ type: 'jpeg', quality: 80 });
            }

            // DEDUPE
            const currentPhash = await calculateDHash(buffer);
            const getHammingDistance = (h1, h2) => {
                let dist = 0;
                for (let i = 0; i < 64; i++) if (h1[i] !== h2[i]) dist++;
                return dist;
            };

            const isDuplicate = lastPhash && getHammingDistance(lastPhash, currentPhash) < 8; // Stricter backend check

            // SEND
            const progress = Math.min(100, Math.round(((currentTime - startParam) / segmentDuration) * 100));

            if (!isDuplicate) {
                lastPhash = currentPhash;
                const base64 = buffer.toString('base64');
                res.write(`data: ${JSON.stringify({
                    type: 'image',
                    imageUrl: `data:image/jpeg;base64,${base64}`,
                    timestamp: Math.round(currentTime),
                    phash: currentPhash,
                    progress
                })}\n\n`);
            } else {
                res.write(`data: ${JSON.stringify({ type: 'progress', progress })}\n\n`);
            }

            currentTime += interval;
        }

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

    } catch (error) {
        console.error(`[SCAN ERROR] ${error.message}`);
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    } finally {
        if (browser) await browser.close();
        res.end();
    }
});

app.post('/upload', async (req, res) => {
    // ... (Use previous logic if needed, or keeping it concise) ...
    try {
        const { data, fileName } = req.body;
        const base64Data = data.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        await r2.send(new PutObjectCommand({ Bucket: process.env.VITE_R2_BUCKET_NAME, Key: fileName, Body: buffer, ContentType: 'image/jpeg' }));
        res.json({ url: `${process.env.VITE_R2_PUBLIC_URL}/${fileName}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Stealth Engine running on ${PORT}`));
