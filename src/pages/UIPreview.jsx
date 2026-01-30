import React, { useState } from 'react';
import FloatingActionButton from '../components/FloatingActionButton';
import PermissionModal from '../components/PermissionModal';

const UIPreview = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [logs, setLogs] = useState([]);

    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 4)]);
    };

    return (
        <div className="min-h-[200vh] bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 font-sans">
            <div className="max-w-lg mx-auto p-6 space-y-8 pb-32">
                <header className="text-center space-y-6 pt-12">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 pb-1">
                            Component Preview
                        </h1>
                        <p className="text-lg text-gray-500 dark:text-gray-400">
                            Interactive demonstration of new UI elements
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 items-center justify-center pt-4">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-8 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 
                         text-gray-700 dark:text-gray-200 rounded-full font-semibold shadow-sm
                         hover:shadow-md hover:scale-105 transition-all active:scale-95"
                        >
                            Open Permission Modal
                        </button>
                        <p className="text-sm text-gray-400">
                            (Or click the FAB below)
                        </p>
                    </div>
                </header>

                {/* Dummy Content to demonstrate scrolling */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between text-sm uppercase tracking-wider text-gray-400 font-bold px-1">
                        <span>Scroll Content</span>
                        <span>v1.0</span>
                    </div>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="p-6 bg-white dark:bg-zinc-900/50 rounded-3xl shadow-sm border border-white/50 dark:border-white/5 backdrop-blur-sm">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 animate-pulse" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-1/3 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
                                    <div className="h-2 w-1/4 bg-gray-50 dark:bg-zinc-800/50 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-gray-50 dark:bg-zinc-800/30 rounded animate-pulse" />
                                <div className="h-2 w-5/6 bg-gray-50 dark:bg-zinc-800/30 rounded animate-pulse" />
                                <div className="h-2 w-4/6 bg-gray-50 dark:bg-zinc-800/30 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Floating Action Button */}
            <FloatingActionButton onClick={() => {
                addLog("FAB Clicked - Capture Triggered");
                // Optional: Open modal on FAB click for demo purposes if desired, or just log
                // setIsModalOpen(true); 
            }} />

            {/* Permission Modal */}
            <PermissionModal
                isOpen={isModalOpen}
                onClose={() => {
                    addLog("Modal Closed (Maybe Later)");
                    setIsModalOpen(false);
                }}
                onGrant={() => {
                    addLog("Permission Granted!");
                    setIsModalOpen(false);
                }}
            />

            {/* Action Log Toast */}
            <div className="fixed top-6 left-6 z-[200] max-w-sm w-full pointer-events-none">
                <div className="flex flex-col gap-2">
                    {logs.map((log, i) => (
                        <div key={i} className="bg-black/80 dark:bg-white/90 backdrop-blur text-white dark:text-black 
                                     px-4 py-2 rounded-lg text-sm font-medium shadow-lg
                                     animate-in fade-in slide-in-from-top-2 duration-300">
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UIPreview;
