// content.js - Runs on YouTube or other video sites
console.log("LectureSnap Sidekick Content Script Loaded ✅");

function captureVideoFrame() {
    let video = document.querySelector('video');
    if (!video) {
        console.warn("LectureSnap: No video element found.");
        return null;
    }

    try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85); // Compress slightly for speed
    } catch (e) {
        console.error("LectureSnap Capture Error:", e);
        return null;
    }
}

// Shortcut: Shift + S to capture
document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        const imageData = captureVideoFrame();
        if (imageData) {
            chrome.runtime.sendMessage({
                action: "capture_taken",
                data: imageData,
                timestamp: document.querySelector('video')?.currentTime || 0,
                source: "youtube_tab"
            });
        }
    }
}, true);

// ---------------------------------------------------------
// WEBSITE <-> EXTENSION BRIDGE
// ---------------------------------------------------------

window.addEventListener("message", (event) => {
    const allowedOrigins = ['https://lecturesnap.online', 'http://localhost:5173'];
    if (!allowedOrigins.includes(event.origin)) return;

    if (event.data.type === "LECTURESNAP_PING") {
        window.postMessage({ type: "LECTURESNAP_PONG" }, "*");
    }

    if (event.data.type === "LECTURESNAP_CAPTURE_REQUEST") {
        const video = document.querySelector('video');
        if (!video) {
            window.postMessage({ type: "LECTURESNAP_CAPTURE_ERROR", message: "No video found" }, "*");
            return;
        }

        const data = captureVideoFrame();
        window.postMessage({
            type: "LECTURESNAP_CAPTURE_RESPONSE",
            data: data,
            timestamp: video.currentTime,
            duration: video.duration
        }, "*");
    }

    if (event.data.type === "LECTURESNAP_SEEK_REQUEST") {
        const video = document.querySelector('video');
        if (video) {
            video.currentTime = event.data.timestamp;
            // Wait for seeked event once
            const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                window.postMessage({ type: "LECTURESNAP_SEEK_DONE", timestamp: video.currentTime }, "*");
            };
            video.addEventListener('seeked', onSeeked);
        }
    }
});

// Extension-Specific Listeners
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_video_rect") {
        const video = document.querySelector('video');
        if (video) sendResponse({ currentTime: video.currentTime, duration: video.duration });
    }
    if (request.action === "trigger_capture") {
        const imageData = captureVideoFrame();
        if (imageData) {
            chrome.runtime.sendMessage({
                action: "capture_taken",
                data: imageData,
                timestamp: document.querySelector('video')?.currentTime || 0,
                source: "youtube_tab"
            });
            sendResponse({ status: "success" });
        } else {
            sendResponse({ status: "failed" });
        }
    }
    return true;
});
