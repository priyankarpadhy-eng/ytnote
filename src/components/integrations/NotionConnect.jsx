
import React, { useState } from 'react';
import { Layers, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEffect } from 'react';

export const NotionConnect = () => {
    const { currentUser } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const checkConnection = async () => {
            try {
                const docRef = doc(db, `users/${currentUser.uid}/integrations/notion`);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().access_token) {
                    setIsConnected(true);
                }
            } catch (err) {
                console.error("Failed to check notion status", err);
            } finally {
                setLoading(false);
            }
        };
        checkConnection();
    }, [currentUser]);

    const handleConnect = () => {
        // 1. Generate Random State for CSRF protection
        const state = Math.random().toString(36).substring(7);
        localStorage.setItem('notion_auth_state', state);

        // 2. Redirect URL (Callback)
        // In local: http://localhost:5173/auth/notion/callback
        // In prod: https://lecturesnaap.web.app/auth/notion/callback
        const redirectUri = window.location.origin + '/auth/notion/callback';

        // 3. Notion Auth URL
        const clientId = import.meta.env.VITE_NOTION_CLIENT_ID;
        const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

        window.location.href = authUrl;
    };

    if (loading) return <div className="text-xs text-gray-500">Checking...</div>;

    return (
        <div className="p-6 bg-white dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center">
                        <span className="text-white dark:text-black font-black text-lg">N</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Notion Integration</h3>
                        <p className="text-xs text-slate-500 dark:text-gray-400">Export your notes directly to Notion pages.</p>
                    </div>
                </div>
                {isConnected ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full text-xs font-bold border border-green-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Connected
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-full text-xs font-bold">
                        <AlertCircle className="w-3 h-3" /> Not Connected
                    </div>
                )}
            </div>

            {!isConnected ? (
                <button
                    onClick={handleConnect}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg"
                >
                    Connect Notion <ArrowRight className="w-4 h-4" />
                </button>
            ) : (
                <button
                    disabled
                    className="w-full py-3 bg-gray-100 dark:bg-white/5 text-gray-400 rounded-xl font-bold border border-dashed border-gray-300 dark:border-white/10 cursor-not-allowed"
                >
                    Integration Active
                </button>
            )}
        </div>
    );
};
