import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PermissionModal = ({ isOpen, onClose, onGrant }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 sm:p-0">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={onClose}
                    />

                    {/* Modal Panel */}
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.8 }}
                        className="relative w-full max-w-sm bg-white dark:bg-zinc-900 
                       rounded-[24px] sm:rounded-3xl p-6 pb-8
                       shadow-2xl border border-white/50 dark:border-white/5
                       scale-100 origin-bottom sm:origin-center overflow-hidden"
                    >
                        {/* Top Security Badge - Floating above slightly or just top focused */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-50/50 dark:from-blue-900/10 to-transparent pointer-events-none" />

                        <div className="relative flex flex-col items-center text-center space-y-6 z-10">
                            {/* Icon Badge */}
                            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center
                            shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-100 dark:ring-blue-800">
                                <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                            </div>

                            {/* Text Content */}
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight font-display">
                                    Enable One-Tap Snapping
                                </h2>
                                <div className="flex flex-col gap-3 pt-2 text-left bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No data is stored without your click</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Only captures your active lecture tab</p>
                                    </div>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="w-full space-y-3 pt-2">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onGrant}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 
                             hover:from-blue-500 hover:to-indigo-500
                             text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25
                             transition-all duration-200"
                                >
                                    Grant Permission
                                </motion.button>

                                <button
                                    onClick={onClose}
                                    className="text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors py-2"
                                >
                                    Maybe Later
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PermissionModal;
