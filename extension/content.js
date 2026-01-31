// content.js - Runs on YouTube or other video sites
console.log("LectureSnap Sidekick Content Script Loaded ✅");

function captureVideoFrame() {
    let video = document.querySelector('video');
    if (!video) return null;

    try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
        console.error("LectureSnap Capture Error:", e);
        return null;
    }
}

// ---------------------------------------------------------
// EXTENSION MESSAGE HANDLER
// ---------------------------------------------------------

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const video = document.querySelector('video');

    // ACTION: Capture
    if (request.action === "trigger_capture") {
        const imageData = captureVideoFrame();
        if (imageData && video) {
            chrome.runtime.sendMessage({
                action: "capture_taken",
                data: imageData,
                timestamp: video.currentTime,
                duration: video.duration
            });
            sendResponse({ status: "success" });
        } else {
            sendResponse({ status: "failed" });
        }
    }

    // ACTION: Seek
    if (request.action === "trigger_seek") {
        if (video) {
            video.currentTime = request.timestamp;
            const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                chrome.runtime.sendMessage({
                    action: "seek_done",
                    timestamp: video.currentTime
                });
            };
            video.addEventListener('seeked', onSeeked);
            sendResponse({ status: "seeking" });
        }
    }

    // META: Get Info
    if (request.action === "get_video_rect") {
        if (video) {
            sendResponse({ currentTime: video.currentTime, duration: video.duration });
        }
    }

    return true;
});

// Shortcut Support (Shift+S)
document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        const imageData = captureVideoFrame();
        const video = document.querySelector('video');
        if (imageData && video) {
            chrome.runtime.sendMessage({
                action: "capture_taken",
                data: imageData,
                timestamp: video.currentTime,
                duration: video.duration
            });
        }
    }
}, true);
