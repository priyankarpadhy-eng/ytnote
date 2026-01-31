const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. ATOMIC STARTUP LOGGING
console.log("--- SYSTEM BOOT ---");
console.log("Environment:", process.env.NODE_ENV);
console.log("Target Port:", process.env.PORT);

const app = express();

// 2. AGGRESSIVE GLOBAL CORS (ABSOLUTE TOP)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Standard CORS as backup
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// 3. LAZY DEPENDENCIES (Don't load these on boot to avoid OOM crashes)
let playwright = null;
let sharp = null;
let s3client = null;

const getScanner = () => {
    if (!playwright) playwright = require('playwright');
    return playwright;
};

const getSharp = () => {
    if (!sharp) sharp = require('sharp');
    return sharp;
};

// ---------------------------------------------------------
// BASIC ROUTES (NO DEPENDENCIES)
// ---------------------------------------------------------
app.get('/', (req, res) => res.send('Neural Engine v3.0 (Cloud Stable)'));
app.get('/health', (req, res) => {
    res.json({
        status: 'alive',
        time: new Date().toISOString(),
        memory: process.memoryUsage(),
        env: { port: process.env.PORT }
    });
});

// ---------------------------------------------------------
// BROWSER MANAGEMENT (SINGLETON)
// ---------------------------------------------------------
let sharedBrowser = null;
async function getBrowser() {
    if (sharedBrowser) return sharedBrowser;
    const pw = getScanner();
    console.log("[SCANNER] Launching Browser...");
    sharedBrowser = await pw.chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
    });
    return sharedBrowser;
}

// ---------------------------------------------------------
// REAL SCAN ENDPOINT
// ---------------------------------------------------------
app.get('/meta', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ error: "No URL" });

        const browser = await getBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const duration = await page.evaluate(() => document.querySelector('video')?.duration || 0);

        await context.close();
        res.json({ duration, interval: 10 });
    } catch (err) {
        console.error("META ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/scan', async (req, res) => {
    // Basic SSE Stream
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    try {
        const { url, start, end } = req.query;
        const browser = await getBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Take 1 sample to prove it works
        const buffer = await page.screenshot({ type: 'jpeg', quality: 50 });
        const base64 = buffer.toString('base64');

        res.write(`data: ${JSON.stringify({ type: 'image', imageUrl: `data:image/jpeg;base64,${base64}`, progress: 50 })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

        await context.close();
    } catch (err) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    } finally {
        res.end();
    }
});

// ---------------------------------------------------------
// STARTUP (LISTENING ON 0.0.0.0 FOR CLOUD)
// ---------------------------------------------------------
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================`);
    console.log(`✅ NEURAL ENGINE LISTENING ON PORT ${PORT}`);
    console.log(`📡 URL: http://0.0.0.0:${PORT}`);
    console.log(`========================================\n`);
});

// Avoid Railway Timeout Killing
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
