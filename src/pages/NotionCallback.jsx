
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function NotionCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [status, setStatus] = useState('processing'); // processing, success, error
    const [message, setMessage] = useState('Finalizing connection...');

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (!currentUser) {
            setStatus('error');
            setMessage("You must be logged in to connect Notion.");
            return;
        }

        if (error) {
            setStatus('error');
            setMessage(`Notion Error: ${error}`);
            return;
        }

        // 1. Verify State (CSRF Protection)
        const savedState = localStorage.getItem('notion_auth_state');
        if (!state || state !== savedState) {
            setStatus('error');
            setMessage("Security Check Failed: Invalid State parameter.");
            return;
        }
        localStorage.removeItem('notion_auth_state'); // Cleanup

        // 2. Exchange Token via Backend
        const exchangeToken = async () => {
            try {
                // Determine Redirect URI used (must match exactly what was sent in step 1)
                const redirectUri = window.location.origin + '/auth/notion/callback';

                // Cloudflare Worker URL (Update this after deployment or use env var)
                const workerUrl = import.meta.env.VITE_AI_WORKER_URL + '/exchangeNotionToken';

                const response = await fetch(workerUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ code, redirectUri })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Token exchange failed');
                }

                const data = await response.json();

                // Store Access Token in Firestore
                // (Since we moved logic to Worker, we save it here now)
                const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                const { db } = await import('../lib/firebase');

                await setDoc(doc(db, `users/${currentUser.uid}/integrations/notion`), {
                    access_token: data.access_token,
                    workspace_id: data.workspace_id,
                    workspace_name: data.workspace_name || "Notion Workspace",
                    bot_id: data.bot_id,
                    connectedAt: serverTimestamp()
                });

                setStatus('success');
                setMessage("Successfully connected to Notion!");

                // Redirect back to app after brief delay
                setTimeout(() => navigate('/app'), 2000);

            } catch (err) {
                console.error(err);
                setStatus('error');
                setMessage(err.message || "Failed to connect to Notion.");
            }
        };

        if (code) {
            exchangeToken();
        } else {
            setStatus('error');
            setMessage("No auth code received.");
        }

    }, [searchParams, currentUser, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black text-slate-900 dark:text-white font-sans">
            <div className="max-w-md w-full p-8 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-white/5 text-center">

                {status === 'processing' && (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
                        <h2 className="text-2xl font-black mb-2">Connecting...</h2>
                        <p className="text-gray-500">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mb-6" />
                        <h2 className="text-2xl font-black mb-2">Success!</h2>
                        <p className="text-gray-500 mb-6">{message}</p>
                        <button onClick={() => navigate('/app')} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold">
                            Return to App
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <XCircle className="w-12 h-12 text-red-500 mb-6" />
                        <h2 className="text-2xl font-black mb-2">Connection Failed</h2>
                        <p className="text-red-500 bg-red-50 dark:bg-red-900/10 p-4 rounded-xl mb-6 text-sm font-mono break-all">{message}</p>
                        <button onClick={() => navigate('/app')} className="px-6 py-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white rounded-xl font-bold">
                            Go Back
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
