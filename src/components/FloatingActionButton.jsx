import React from 'react';
import { Camera } from 'lucide-react';
import { motion } from 'framer-motion';

const FloatingActionButton = ({ onClick }) => {
    const handleClick = () => {
        // High-quality haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
        if (onClick) onClick();
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Pulse Animation Ring - Outer Glow */}
            <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-pulse-slow scale-150 blur-xl pointer-events-none" />

            {/* Active Pulse Ring - Sharp */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border border-blue-400/50 pointer-events-none"
            />

            {/* Main Button */}
            <motion.button
                whileHover={{ scale: 1.08, rotate: 5 }}
                whileTap={{ scale: 0.9, rotate: -5 }}
                onClick={handleClick}
                className="relative w-[56px] h-[56px] rounded-full flex items-center justify-center
                   bg-gradient-to-tr from-blue-700 via-blue-600 to-blue-500
                   shadow-[0_8px_30px_rgba(59,130,246,0.5)]
                   backdrop-blur-md border border-white/20
                   text-white group overflow-hidden"
                aria-label="Capture"
            >
                {/* Glassmorphism Highlight */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                {/* Inner Glow */}
                <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-md hidden group-hover:block transition-all duration-300" />

                <Camera
                    size={24}
                    className="relative z-10 drop-shadow-md text-white/90 group-hover:text-white transition-colors"
                    strokeWidth={2.5}
                />
            </motion.button>
        </div>
    );
};

export default FloatingActionButton;
