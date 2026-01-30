import React, { useState, useEffect } from 'react';
import { Droplets, X, Sparkles, Brain, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export function SidebarBreakModal({ isOpen, onClose, onReward }) {
    const [secondsLeft, setSecondsLeft] = useState(5);

    useEffect(() => {
        if (!isOpen) return;

        setSecondsLeft(5);
        const timer = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#1a1a1a] w-full max-w-[280px] rounded-3xl shadow-2xl overflow-hidden border border-blue-500/30 flex flex-col items-center p-8 text-center relative"
            >
                {/* --- Animated Water Icon --- */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center shadow-xl relative z-10 group">
                        <Droplets className="text-white w-12 h-12 animate-bounce" />
                    </div>
                    {/* Floating Bubbles */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-400/30 rounded-full blur-sm animate-pulse" />
                    <div className="absolute -bottom-4 -left-2 w-8 h-8 bg-cyan-400/20 rounded-full blur-sm animate-pulse" />
                </div>

                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Hydration Break! 💧</h2>

                <div className="space-y-4 mb-8">
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                        You've been studying hard for <span className="text-blue-500 font-black">40 minutes</span>.
                    </p>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-bold leading-relaxed">
                            Take a moment to <span className="underline decoration-blue-500/50">drink some water</span> and stretch. Your brain needs fuel!
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-1.5"><Brain className="w-3 h-3" /> Focus</div>
                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                        <div className="flex items-center gap-1.5"><Heart className="w-3 h-3" /> Health</div>
                    </div>
                </div>

                {/* --- Action Button --- */}
                <button
                    disabled={secondsLeft > 0}
                    onClick={() => {
                        onReward();
                        onClose();
                    }}
                    className={cn(
                        "w-full py-4 rounded-2xl font-black text-xs tracking-widest uppercase transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2",
                        secondsLeft > 0
                            ? "bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:shadow-blue-500/40 hover:scale-[1.02]"
                    )}
                >
                    {secondsLeft > 0 ? (
                        <>Take a Breath ({secondsLeft}s)</>
                    ) : (
                        <>Resume Study <Sparkles className="w-4 h-4" /></>
                    )}
                </button>

                <p className="mt-4 text-[9px] text-gray-400 font-black tracking-tighter opacity-50 uppercase">
                    Capture session paused for wellness
                </p>
            </motion.div>
        </div>
    );
}
