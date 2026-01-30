chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// Listen for messages from Content Script (YouTube) or Sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 0. Handle Remote Capture Request (from Sidebar/Website)
    if (message.action === "remote_capture_request") {
        console.log("LectureSnap Background: Remote capture requested");
        // Find a YouTube tab
        chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
            // Prefer the last active one, or just the first one found
            const targetTab = tabs[0];
            if (targetTab) {
                chrome.tabs.sendMessage(targetTab.id, { action: "trigger_capture" });
            } else {
                console.log("LectureSnap: No YouTube tab found to capture from.");
            }
        });
        return;
    }

    if (message.action === "capture_taken") {
        // 1. Forward to Side Panel (Extension Runtime)
        // Sending to runtime forwards to all extension views (popup, sidepanel, etc.)
        // Note: The sidepanel must be listening to chrome.runtime.onMessage
        chrome.runtime.sendMessage({
            type: "EXTENSION_CAPTURE",
            data: message.data,
            timestamp: message.timestamp
        }).catch(err => {
            // Ignore errors if sidepanel is closed
        });

        // 2. Forward to specific Website Tabs (Dashboard)
        const dashboardOrigins = [
            "https://lecturesnaap.web.app",
            "https://lecturesnap.online",
            "http://localhost:5173",
            "http://localhost:3000"
        ];

        // Find all tabs that match our dashboard
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && dashboardOrigins.some(origin => tab.url.startsWith(origin))) {
                    // Send message to the tab's content script (website-content.js)
                    chrome.tabs.sendMessage(tab.id, {
                        type: "EXTENSION_CAPTURE",
                        data: message.data,
                        timestamp: message.timestamp
                    }).catch(() => {
                        // Tab might not have loaded content script yet
                    });
                }
            });
        });
    }
});
// Listen for keyboard commands (Alt+S)
chrome.commands.onCommand.addListener((command) => {
    console.log("LectureSnap Background: Received command", command);
    if (command === 'capture_note') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "trigger_capture" })
                    .catch(err => console.log("Content script not ready in active tab", err));
            }
        });
    }
});
