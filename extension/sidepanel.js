// Bridge: Receive capture from Background -> Forward to Iframe (Website)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "EXTENSION_CAPTURE") {
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            // Determine target origin - use * for flexibility or specific domain
            iframe.contentWindow.postMessage(message, "*");
        }
    }
});

// Listener: Capture from Sidebar (when user presses Shift+S inside sidebar)
document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, [contenteditable]')) {
        return;
    }
    if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        console.log("LectureSnap: Shift+S pressed (Sidebar)");
        // Tell background to find a YouTube tab and capture
        chrome.runtime.sendMessage({ action: "remote_capture_request" });
    }
}, true);
