import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X, Play, Award, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * RewardedVideoGate
 * 
 * Logic Flow:
 * 1. Initialize Ad SDK (mocked for web if no SDK present)
 * 2. Show 'Preparing Ad...'
 * 3. Play Ad (Video Overlay)
 * 4. Verify Completion
 * 5. Grant Reward (callback)
 */
export const RewardedVideoGate = ({
    isOpen,
    onClose,
    onReward,
    userId
}) => {
    const [status, setStatus] = useState('idle'); // idle, initializing, playing, completed, error
    const [timeLeft, setTimeLeft] = useState(15); // 15 second ad
    const [progress, setProgress] = useState(0);
    const videoRef = useRef(null);
    const { isDarkMode } = useTheme();

    const [adPushed, setAdPushed] = useState(false);

    useEffect(() => {
        if (isOpen) {
            initializeAd();
        } else {
            resetState();
        }
    }, [isOpen]);

    const resetState = () => {
        setStatus('idle');
        setTimeLeft(15);
        setProgress(0);
        setAdPushed(false);
    };

    const initializeAd = async () => {
        // Transition to playing rapidly to show the ad slot
        setTimeout(() => {
            setStatus('playing');
        }, 500);
    };

    // Trigger AdSense when status becomes 'playing'
    useEffect(() => {
        if (status === 'playing' && !adPushed) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                setAdPushed(true);
            } catch (e) {
                console.error("AdSense push error", e);
            }
        }
    }, [status, adPushed]);

    useEffect(() => {
        let interval;
        if (status === 'playing') {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    const newValue = prev - 1;
                    const totalDuration = 15;
                    setProgress(((totalDuration - newValue) / totalDuration) * 100);

                    if (newValue <= 0) {
                        clearInterval(interval);
                        handleAdComplete();
                        return 0;
                    }
                    return newValue;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [status]);

    const handleAdComplete = () => {
        setStatus('completed');
        setTimeout(() => {
            onReward(); // Trigger Success Callback
        }, 1000); // Slight delay for UX
    };

    const handleClose = () => {
        if (status === 'playing' && timeLeft > 0) {
            // Warn user
            const confirmClose = confirm("You must finish the video to unlock your notes. Close anyway?");
            if (confirmClose) {
                onClose(); // Failed/Cancelled
            }
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            {/* Modal Container */}
            <div className={cn(
                "relative w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300",
                isDarkMode
                    ? "bg-[#1a1a1a] border-white/10"
                    : "bg-white border-gray-200"
            )}>

                {/* Header (Hidden during ad usually, but helpful here) */}
                <div className="absolute top-4 right-4 z-50">
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* --- STATE: INITIALIZING --- */}
                {status === 'initializing' && (
                    <div className="flex flex-col items-center justify-center h-[300px] gap-6">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full animate-ping bg-blue-500/20"></div>
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-lg font-bold">Preparing Ad...</h3>
                            <p className="text-sm text-gray-500">Connecting to Ad Network</p>
                        </div>
                    </div>
                )}

                {/* --- STATE: PLAYING --- */}
                {status === 'playing' && (
                    <div className="relative h-[300px] bg-white dark:bg-[#111] flex flex-col group overflow-hidden">

                        {/* Real Ad Unit */}
                        <div className="w-full h-full overflow-y-auto">
                            <ins className="adsbygoogle"
                                style={{ display: 'block' }}
                                data-ad-format="autorelaxed"
                                data-ad-client="ca-pub-5733298100433649"
                                data-ad-slot="7238352728"></ins>
                        </div>

                        {/* Progress Bar & Timer */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                            <div className="flex justify-between items-end text-white text-xs font-mono mb-1">
                                <span className="font-bold">Advertisement</span>
                                <span>Wait {timeLeft}s to unlock</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- STATE: COMPLETED --- */}
                {status === 'completed' && (
                    <div className="flex flex-col items-center justify-center h-[300px] gap-6 bg-green-50/50 dark:bg-green-900/10">
                        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-in zoom-in duration-300">
                            <Award className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">Reward Earned!</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Unlocking your PDF download...</p>
                        </div>
                    </div>
                )}

                {/* --- STATE: ERROR (Fallback) --- */}
                {status === 'error' && (
                    <div className="flex flex-col items-center justify-center h-[300px] gap-4">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                        <p className="text-center font-medium">Ad failed to load.</p>
                        <button
                            onClick={onReward}
                            className="text-sm text-blue-500 hover:underline"
                        >
                            Mock Success (Dev Mode)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
