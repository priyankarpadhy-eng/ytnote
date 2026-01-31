// website-content.js - Runs on global.lecturesnap.online or localhost
console.log("LectureSnap Website Bridge Loaded ✅");

// 1. Listen for messages from the Web App (CapturePage.jsx)
window.addEventListener("message", (event) => {
    // Basic origin filtering
    const allowedOrigins = ['https://lecturesnap.online', 'http://localhost:5173', 'https://lecturesnaap.web.app'];
    if (!allowedOrigins.includes(event.origin)) return;

    // Handle Ping
    if (event.data.type === "LECTURESNAP_PING") {
        window.postMessage({ type: "LECTURESNAP_PONG" }, "*");
    }

    // Handle Capture Request (Relay to Background)
    if (event.data.type === "LECTURESNAP_CAPTURE_REQUEST") {
        chrome.runtime.sendMessage({ action: "remote_capture_request" });
    }

    // Handle Seek Request (Relay to Background)
    if (event.data.type === "LECTURESNAP_SEEK_REQUEST") {
        chrome.runtime.sendMessage({
            action: "remote_seek_request",
            timestamp: event.data.timestamp
        });
    }
});

// 2. Listen for replies from the Extension (Background Script)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Capture Result
    if (request.type === "EXTENSION_CAPTURE") {
        window.postMessage({
            type: "LECTURESNAP_CAPTURE_RESPONSE",
            data: request.data,
            timestamp: request.timestamp,
            duration: request.duration
        }, "*");
    }

    // Seek Confirmation
    if (request.type === "EXTENSION_SEEK_DONE") {
        window.postMessage({
            type: "LECTURESNAP_SEEK_DONE",
            timestamp: request.timestamp
        }, "*");
    }

    // Error Handling
    if (request.type === "EXTENSION_ERROR") {
        window.postMessage({
            type: "LECTURESNAP_CAPTURE_ERROR",
            message: request.message
        }, "*");
    }

    return true;
});
