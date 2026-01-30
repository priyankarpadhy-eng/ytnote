/**
 * LectureSnap Dashboard Sync Utility
 * Include this in your React App (e.g., in a useEffect hook in your Dashboard layout)
 */

export class DashboardSync {
    constructor(channelName = 'study_sync') {
        this.channelName = channelName;
        this.broadcastChannel = new BroadcastChannel(channelName);
        this.listeners = [];

        // Listen for messages from the Extension Bridge (window.postMessage)
        this.handleWindowMessage = this.handleWindowMessage.bind(this);
        window.addEventListener('message', this.handleWindowMessage);

        // Listen for messages from other Tabs (BroadcastChannel)
        this.broadcastChannel.onmessage = (event) => {
            this.notifyListeners(event.data);
        };
    }

    handleWindowMessage(event) {
        // Security check: Ensure message is from a trusted source (ourselves or extension)
        // Since content script runs in same origin, event.origin is reliable
        if (event.data && event.data.type === "EXTENSION_CAPTURE") {
            console.log("DashboardSync: Received capture from Extension Bridge");

            const payload = event.data;

            // 1. Notify local listeners (this tab)
            this.notifyListeners(payload);

            // 2. Broadcast to other tabs
            this.broadcastChannel.postMessage(payload);
        }
    }

    // Subscribe to updates
    onCapture(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    notifyListeners(data) {
        this.listeners.forEach(cb => cb(data));
    }

    cleanup() {
        window.removeEventListener('message', this.handleWindowMessage);
        this.broadcastChannel.close();
    }
}

// Singleton instance if needed
export const dashboardSync = new DashboardSync();
