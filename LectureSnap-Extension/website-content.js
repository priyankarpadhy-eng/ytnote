// Content script for the LectureSnap Web App
// It receives messages from the background script and forwards them to the React App window

// Forward messages FROM Page TO Background
window.addEventListener("message", (event) => {
    // Only accept messages from the window itself
    if (event.source !== window) return;

    if (event.data.type === 'TRIGGER_EXTENSION_CAPTURE') {
        console.log("LectureSnap Content: Relaying trigger to Background");
        chrome.runtime.sendMessage({ action: "remote_capture_request" });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check for the known message type
    if (request.type === "EXTENSION_CAPTURE") {
        console.log("LectureSnap Extension: Forwarding capture to App");
        // Forward to the web page context (React)
        window.postMessage({
            type: "EXTENSION_CAPTURE",
            data: request.data,
            timestamp: request.timestamp
        }, "*"); // Target origin * or specific domain
    }
    return true;
});
