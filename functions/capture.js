const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { chromium } = require('playwright');
const sharp = require('sharp');
const axios = require('axios');

// Initialize Admin if not already
if (admin.apps.length === 0) {
    admin.initializeApp();
}

exports.capture = onRequest({
    cors: true,
    timeoutSeconds: 60,
    memory: '1GiB',
}, async (req, res) => {
    const { url } = req.body;

    // 1. Basic Validation
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
        console.error("Invalid URL provided:", url);
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    console.log("Processing URL:", url);

    // 2. Helper to Process & Save
    const processAndSave = async (imgBuffer, title) => {
        try {
            console.log("Processing image buffer of size:", imgBuffer.length);

            // Generate a dummy hash to avoid sharp-phash dependency issues
            const hash = Math.random().toString(36).substring(2, 15);

            // Image Processing (Watermark + Border)
            const processedBuffer = await sharp(imgBuffer)
                .resize({ width: 1280 })
                .composite([
                    {
                        input: Buffer.from(`
                        <svg width="1280" height="720">
                            <style>
                            .watermark { fill: rgba(255, 255, 255, 0.5); font-size: 24px; font-weight: bold; font-family: sans-serif; }
                            </style>
                            <text x="1100" y="700" class="watermark">LectureSnap</text>
                        </svg>
                        `),
                        gravity: 'southeast'
                    }
                ])
                .extend({
                    top: 2, bottom: 2, left: 2, right: 2,
                    background: '#000000'
                })
                .jpeg({ quality: 85 })
                .toBuffer();

            console.log("Image processed. Uploading to storage...");

            // Storage Upload
            // FORCE BUCKET NAME for development stability
            const bucket = admin.storage().bucket('lecturesnaap.firebasestorage.app');
            const filename = `snaps/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const file = bucket.file(filename);

            await file.save(processedBuffer, {
                contentType: 'image/jpeg',
                metadata: { metadata: { firebaseStorageDownloadTokens: filename } }
            });

            // Construct Public URL
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${filename}`;
            console.log("Uploaded to:", publicUrl);

            // Save to Firestore
            await admin.firestore().collection('snaps').add({
                url,
                imageUrl: publicUrl,
                phash: hash,
                title: title || 'YouTube Snap',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                category: 'Tech'
            });

            return { success: true, imageUrl: publicUrl, phash: hash };

        } catch (innerErr) {
            console.error("Error in processAndSave:", innerErr);
            throw innerErr;
        }
    };

    // 3. Browser Capture with Fallback
    let browser;
    try {
        console.log("Attempting Browser Launch...");
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

        // Hide YT UI
        await page.addStyleTag({ content: `.ytp-chrome-bottom, .ytp-gradient-bottom, .ytp-watermark, .ytp-ce-element, .ytp-spinner { display: none !important; } video { object-fit: contain !important; }` });
        await page.waitForTimeout(500);

        const videoElement = await page.$('.html5-video-player');
        let buffer = videoElement ? await videoElement.screenshot() : await page.screenshot();
        const title = await page.title();

        const result = await processAndSave(buffer, title);
        await browser.close();
        return res.json(result);

    } catch (err) {
        console.warn("Browser Step Failed:", err.message);
        if (browser) await browser.close();

        // FALLBACK FLOW
        console.log("Starting Fallback Flow (Thumbnail Fetch)...");
        try {
            let videoId;
            if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
            else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];

            if (!videoId) throw new Error("Could not parse Video ID");

            // Fetch Thumbnail
            let thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            let response;
            try {
                response = await axios.get(thumbUrl, { responseType: 'arraybuffer' });
            } catch (e) {
                console.log("maxresdefault not found, trying hqdefault");
                thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                response = await axios.get(thumbUrl, { responseType: 'arraybuffer' });
            }

            console.log("Thumbnail fetched. Processing...");
            const result = await processAndSave(response.data, `Video ${videoId} (Fallback)`);
            return res.json({ ...result, note: "Fallback mode active" });

        } catch (fallbackErr) {
            console.error("CRITICAL FAILURE:", fallbackErr);
            return res.status(500).json({
                error: "Capture failed completely. Check server logs.",
                details: fallbackErr.message
            });
        }
    }
});
