
const express = require('express');
const { chromium } = require('playwright');
const sharp = require('sharp');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
    res.send('LectureSnap Capture Server is Running (Parallel Mode)');
});

// ---------------------------------------------------------
// PERCEPTUAL HASHING (dHash)
// ---------------------------------------------------------
async function calculateDHash(buffer) {
    try {
        const { data } = await sharp(buffer)
            .resize(9, 8, { fit: 'fill' })
            .grayscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        let hash = '';
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const idx = y * 9 + x;
                hash += (data[idx] > data[idx + 1] ? '1' : '0');
            }
        }
        return hash;
    } catch (e) {
        console.error("Hash calculation failed:", e);
        return '0'.repeat(64);
    }
}

// ---------------------------------------------------------
// METADATA ENDPOINT (For Probe)
// ---------------------------------------------------------
app.get('/meta', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'No URL provided' });

    let browser;
    try {
        console.log(`[META] Probing: ${url}`);
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--disable-infobars', '--disable-gpu']
        });

        const page = await browser.newPage();
        await page.route('**/*.{image,stylesheet,font}', route => route.abort());

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Quick duration check
        await page.waitForTimeout(1500);
        const duration = await page.evaluate(() => {
            const v = document.querySelector('video');
            return v ? v.duration : 0;
        });

        if (!duration) throw new Error("No duration found");

        // Calculate suggested interval
        let interval = 5;
        if (duration < 300) interval = 2;
        else if (duration < 1200) interval = 5;
        else if (duration < 3600) interval = 10;
        else interval = 30;

        await browser.close();
        res.json({ duration, interval });

    } catch (e) {
        console.error("Meta Error:", e);
        if (browser) await browser.close();
        res.status(500).json({ error: e.message });
    }
});

// ---------------------------------------------------------
// SCANNING ENDPOINT (Range Aware)
// ---------------------------------------------------------
app.get('/scan', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const url = req.query.url;
    const startParam = parseFloat(req.query.start) || 0;
    const endParam = parseFloat(req.query.end) || 0;

    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
        res.write(`data: ${JSON.stringify({ error: 'Invalid URL' })}\n\n`);
        return res.end();
    }

    console.log(`[SCAN START] Range: ${startParam}-${endParam || 'END'} | URL: ${url}`);
    let browser;

    try {
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--disable-gpu'
            ]
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 },
            isMobile: false, hasTouch: false, javascriptEnabled: true, locale: 'en-US', timezoneId: 'America/New_York'
        });

        const page = await context.newPage();
        await page.route('**/*.{image,stylesheet,font}', route => route.continue());

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.addStyleTag({
            content: `
                .ytp-chrome-bottom, .ytp-chrome-top, .ytp-watermark, .ytp-ce-element, 
                .ytp-gradient-bottom, .ytp-gradient-top, .ytp-spinner, .ytp-ad-module, 
                .branding-img, .ytp-pause-overlay, #masthead-container, #secondary, #below, #comments, #chat
                { display: none !important; } 
                ytd-player, #player-container, #movie_player, video {
                    position: fixed !important; top: 0 !important; left: 0 !important;
                    width: 100vw !important; height: 100vh !important; z-index: 9999 !important; background: black !important;
                }
            `
        });

        try { await page.click('.ytp-play-button'); } catch (e) { }
        await page.waitForTimeout(3000);

        const duration = await page.evaluate(() => {
            const v = document.querySelector('video'); return v ? v.duration : 0;
        });

        if (!duration) throw new Error("Could not detect video duration.");

        // Smart Interval
        let interval = 5;
        if (duration < 300) interval = 2;
        else if (duration < 1200) interval = 5;
        else if (duration < 3600) interval = 10;
        else interval = 30;

        res.write(`data: ${JSON.stringify({ type: 'meta', duration, interval })}\n\n`);

        // Determine Loop bounds
        // If startParam is provided, prefer it. If it is 0, start at interval (to avoid 0:00 black screen often)
        let currentTime = startParam || interval;
        if (startParam > 0) currentTime = startParam;

        const endTime = (endParam > 0 && endParam < duration) ? endParam : duration;

        console.log(`Scanning from ${currentTime}s to ${endTime}s with interval ${interval}s`);

        let slideCount = 0;
        let lastHash = null;

        while (currentTime < endTime) {
            try {
                // Auto-Error Recovery
                const isError = await page.evaluate(() => document.body.innerText.includes("Something went wrong"));
                if (isError) {
                    console.log("Error screen detected. Reloading...");
                    await page.reload({ waitUntil: 'domcontentloaded' });
                    await page.waitForTimeout(3000);
                    await page.addStyleTag({ content: 'ytd-player,video{position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;z-index:9999!important;background:black!important;} #masthead-container{display:none!important}' });
                }

                const seekResult = await page.evaluate(async (time) => {
                    const video = document.querySelector('video');
                    if (video) {
                        return new Promise((resolve) => {
                            const timeout = setTimeout(() => resolve('timeout'), 5000);
                            const onSeeked = () => { clearTimeout(timeout); video.removeEventListener('seeked', onSeeked); resolve('seeked'); };
                            video.addEventListener('seeked', onSeeked);
                            video.currentTime = time;
                        });
                    }
                    return 'no-video';
                }, currentTime);

                if (seekResult === 'no-video') throw new Error('Video element missing');

                await page.waitForTimeout(800); // 800ms Buffer wait

                // Spinner Check
                await page.evaluate(async () => {
                    const s = document.querySelector('.ytp-spinner');
                    if (s && getComputedStyle(s).display !== 'none') await new Promise(r => setTimeout(r, 1000));
                });

                const buffer = await page.screenshot();
                const pHash = await calculateDHash(buffer);

                let hamming = 0;
                if (lastHash) for (let i = 0; i < 64; i++) if (pHash[i] !== lastHash[i]) hamming++; else hamming = 100;

                const segmentDuration = endTime - (startParam || 0);
                const segmentProgress = ((currentTime - (startParam || 0)) / segmentDuration) * 100;

                if (slideCount === 0 || hamming > 0) {
                    slideCount++;
                    const processedBuffer = await sharp(buffer)
                        .resize({ width: 1280 })
                        .composite([{ input: Buffer.from(`<svg width="1280" height="720"><text x="1100" y="700" fill="rgba(255,255,255,0.5)" font-size="24" font-weight="bold" font-family="sans-serif">LectureSnap</text></svg>`), gravity: 'southeast' }])
                        .jpeg({ quality: 80 }).toBuffer();

                    res.write(`data: ${JSON.stringify({
                        type: 'image',
                        imageUrl: `data:image/jpeg;base64,${processedBuffer.toString('base64')}`,
                        timestamp: currentTime,
                        progress: Math.round(segmentProgress),
                        phash: pHash
                    })}\n\n`);
                    lastHash = pHash;
                } else {
                    res.write(`data: ${JSON.stringify({ type: 'progress', timestamp: currentTime, progress: Math.round(segmentProgress) })}\n\n`);
                }

            } catch (frameError) {
                console.error(`Frame Error at ${currentTime}s:`, frameError.message);
            }
            currentTime += interval;
        }

        res.write(`data: ${JSON.stringify({ type: 'done', totalSlides: slideCount })}\n\n`);
        res.end();
        await browser.close();

    } catch (err) {
        console.error("Scan Error:", err);
        if (browser) await browser.close();
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
    }
});

app.post('/capture', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'No URL' });
        const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.addStyleTag({ content: 'ytd-player,video{position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;z-index:9999!important;background:black!important;} #masthead-container{display:none!important}' });

        await page.evaluate(() => { const v = document.querySelector('video'); if (v) { v.currentTime = 10; v.play(); } });
        await page.waitForTimeout(1000);
        const buffer = await page.screenshot();
        const processedBuffer = await sharp(buffer).resize({ width: 1280 }).jpeg({ quality: 80 }).toBuffer();
        await browser.close();
        return res.json({ success: true, imageUrl: `data:image/jpeg;base64,${processedBuffer.toString('base64')}` });
    } catch (e) { return res.status(500).json({ error: e.message }); }
});

// EXPORTABLE START FUNCTION
// EXPORTABLE START FUNCTION
function startServer(port = 3000) {
    return new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
            console.log(`[Backend] Server listening on port ${port}`);
            resolve(server);
        });

        server.on('error', (e) => {
            if (e.code === 'EADDRINUSE') {
                console.warn(`[Backend] Port ${port} is already in use. Assuming previous instance is active.`);
                // Resolve with a dummy object or null to prevent crash. 
                // The app will connect to the existing server on that port.
                resolve({ close: () => console.log('Attached to existing server, no need to close.') });
            } else {
                console.error("[Backend] Server Error:", e);
                reject(e);
            }
        });
    });
}

// Auto-start if run directly (node index.js)
if (require.main === module) {
    startServer(3000).catch(console.error);
}

module.exports = { startServer, app };
