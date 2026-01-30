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

// Function to handle the capture command (e.g. from keyboard shortcut or other content scripts)
// For this demo, let's assume we capture when we receive a specific "CAPTURE_NOW" message 
// OR simpler: we expose a listener. 
// BUT the user requirement implies "When a capture happens". 
// Let's add a keyboard listener for 'S' or distinct key as a trigger, 
// OR expose the function for the sidepanel to call.
// Given "LectureSnap" context, likely a keypress.
document.addEventListener('keydown', (e) => {
    // Ignore if user is typing in a comment or search box
    if (e.target.matches('input, textarea, [contenteditable]')) {
        return;
    }

    // Shortcut: Shift + S to capture
    if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault(); // Prevent typing 'S' if applicable
        e.stopPropagation(); // Stop YouTube from handling it
        console.log("LectureSnap: Shift+S pressed (YouTube)");

        const imageData = captureVideoFrame();
        if (imageData) {
            const timestamp = document.querySelector('video')?.currentTime || 0;
            // Send to Extension Runtime (Background)
            chrome.runtime.sendMessage({
                action: "capture_taken",
                data: imageData,
                timestamp: timestamp,
                source: "youtube_tab"
            });
            console.log("LectureSnap: Capture sent!");
        }
    }
}, true); // <--- TRUE: Use Capture Phase to intercept before YouTube

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_video_rect") {
        // Reuse original logic if needed, but for now capture is priority
        const video = document.querySelector('video');
        if (video) {
            sendResponse({
                currentTime: video.currentTime,
                duration: video.duration
            });
        }
    }
    // Also support external trigger (from Background Command)
    if (request.action === "trigger_capture") {
        console.log("LectureSnap: Received trigger_capture command");
        const imageData = captureVideoFrame();
        if (imageData) {
            const timestamp = document.querySelector('video')?.currentTime || 0;
            // Send back to Background so it can broadcast to sidepanel & website
            chrome.runtime.sendMessage({
                action: "capture_taken",
                data: imageData,
                timestamp: timestamp,
                source: "youtube_tab"
            });
            console.log("LectureSnap: Command Capture sent!");
            sendResponse({ status: "success" });
        } else {
            console.warn("LectureSnap: Capture failed (no image data)");
            sendResponse({ status: "failed" });
        }
    }
    return true;
});
