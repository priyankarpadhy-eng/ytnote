chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

const DASHBOARD_ORIGINS = [
    "https://lecturesnaap.web.app",
    "https://lecturesnap.online",
    "http://localhost:5173"
];

// Broadcast helper
function broadcastToDashboard(message) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.url && DASHBOARD_ORIGINS.some(origin => tab.url.startsWith(origin))) {
                chrome.tabs.sendMessage(tab.id, message).catch(() => { });
            }
        });
    });
}

// 1. Listen for messages from ANY content script (YouTube or App)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // ACTION: Capture Request (from Web App)
    if (message.action === "remote_capture_request") {
        chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "trigger_capture" });
            } else {
                broadcastToDashboard({ type: "EXTENSION_ERROR", message: "No YouTube tab found" });
            }
        });
    }

    // ACTION: Seek Request (from Web App)
    if (message.action === "remote_seek_request") {
        chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "trigger_seek",
                    timestamp: message.timestamp
                });
            }
        });
    }

    // ACTION: Capture Result (from YouTube)
    if (message.action === "capture_taken") {
        // Forward to Sidepanel
        chrome.runtime.sendMessage({
            type: "EXTENSION_CAPTURE",
            data: message.data,
            timestamp: message.timestamp
        }).catch(() => { });

        // Forward to Web App
        broadcastToDashboard({
            type: "EXTENSION_CAPTURE",
            data: message.data,
            timestamp: message.timestamp,
            duration: message.duration || 0
        });
    }

    // ACTION: Seek Done (from YouTube)
    if (message.action === "seek_done") {
        broadcastToDashboard({
            type: "EXTENSION_SEEK_DONE",
            timestamp: message.timestamp
        });
    }

    return true;
});

// Shortcut Support
chrome.commands.onCommand.addListener((command) => {
    if (command === 'capture_note') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "trigger_capture" }).catch(() => { });
            }
        });
    }
});
