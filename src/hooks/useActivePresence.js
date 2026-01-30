import { useEffect, useState } from 'react';
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export function useActivePresence() {
    const { currentUser } = useAuth();
    const [activeMapUsers, setActiveMapUsers] = useState([]);
    const [onlineCount, setOnlineCount] = useState(0);

    // 1. REPORT SELF PRESENCE (Auth or Anon)
    useEffect(() => {
        // Generate or get anon ID
        let userId = currentUser?.uid;
        if (!userId) {
            let anonId = localStorage.getItem('lecturesnap_anon_id');
            if (!anonId) {
                anonId = 'anon_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('lecturesnap_anon_id', anonId);
            }
            userId = anonId;
        }

        const userStatusRef = ref(rtdb, '/status/' + userId);
        const connectedRef = ref(rtdb, '.info/connected');

        const unsubConnected = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // We're connected!
                const presenceData = {
                    isOnline: true,
                    lastSeen: serverTimestamp(),
                    // Only add lat/lng if we have it? No, keeping it simple here.
                    // Map component adds lat/lng separately if needed or merges it.
                    // For now, simple presence is enough for the count.
                };

                // If on Map page, Map component overwrites this with lat/lng.
                // But we need to make sure we don't *delete* lat/lng if we are just browsing.
                // Ideally, we'd do a merge (update), but standard set is safer for "online" state toggling.
                // Let's just use update() if possible? 
                // Using 'onDisconnect().remove()' is standard.

                // Privacy: Don't send data here, just "I exist". 
                // Map component sends location separately.

                // However, we need to ensure we don't overwrite the Map's detailed data if it exists.
                // Simple approach: usage of set here is fine as long as Map re-asserts itself.
                // Actually, let's just use update to be safe, but onDisconnect requires a specific path ref.

                set(userStatusRef, { isOnline: true, lastSeen: serverTimestamp() });
                onDisconnect(userStatusRef).remove();
            }
        });

        return () => {
            unsubConnected();
            // Optional: set offline on unmount?
            // set(userStatusRef, null); 
        };
    }, [currentUser]);

    // 2. READ GLOBAL PRESENCE
    useEffect(() => {
        const statusRef = ref(rtdb, '/status');
        const unsubscribe = onValue(statusRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const allUsers = Object.values(data);
                // 1. Total Count (Anyone online)
                const totalOnline = allUsers.filter(u => u.isOnline).length;
                setOnlineCount(totalOnline);

                // 2. Map Users (Only those with location)
                const mapUsers = allUsers.filter(u => u.isOnline && u.lat && u.lng);
                setActiveMapUsers(mapUsers);
            } else {
                setOnlineCount(0);
                setActiveMapUsers([]);
            }
        });

        return () => unsubscribe();
    }, []);

    return { activeUsers: activeMapUsers, onlineCount };
}
