import React, { useState, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import {
    X, ChevronRight, Check, Sparkles, LayoutGrid,
    ShieldCheck, Zap, Rocket, Star, CheckCircle2, Trophy
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// --- Configuration ---
// --- Configuration (The "Best of the Best" Flow) ---
export const TUTORIAL_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to LectureSnap! 🚀',
        description: "The #1 way to master lectures in 2026. We've built an ecosystem to help you capture knowledge instantly. Ready to evolve?",
        targetId: null,
        requiredAction: null,
        icon: <Sparkles className="w-8 h-8 text-yellow-500" />
    },
    {
        id: 'create-folder',
        title: 'Organize Your Path 📚',
        description: "Consistency starts with organization. Create your first subject folder (e.g., Physics, History) here.",
        targetId: 'create-folder-btn',
        requiredAction: 'folder_created',
        position: 'right',
        icon: <LayoutGrid className="w-8 h-8 text-blue-500" />
    },
    {
        id: 'user-profile',
        title: 'Evolutionary Profile 🧬',
        description: "Your study habits have an identity. Track your heatmap, level up, and evolve your custom avatar here.",
        targetId: 'tutorial-user-profile',
        position: 'right',
        icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />
    },
    {
        id: 'start-session',
        title: 'Ignite Knowledge ⚡',
        description: "Join your lecture and click 'START STUDY SESSION'. We'll sync with your video stream instantly.",
        targetId: 'tutorial-start-session',
        position: 'bottom',
        icon: <Zap className="w-8 h-8 text-orange-500" />
    },
    {
        id: 'auto-capture',
        title: 'Auto-Pilot Mode 🤖',
        description: "Once inside, toggle 'Auto ON'. We'll detect slide changes and capture them for you—hands-free.",
        targetId: 'tutorial-auto-capture',
        position: 'bottom',
        icon: <Rocket className="w-8 h-8 text-purple-500" />
    },
    {
        id: 'credits',
        title: 'Study Fuel 🔋',
        description: "Capturing uses credits. You can get more by watching quick bonus clips here. Keep the engine running!",
        targetId: 'tutorial-credits',
        position: 'bottom-left',
        icon: <Star className="w-8 h-8 text-yellow-400" />
    },
    {
        id: 'export-studio',
        title: 'Smart Export Studio 📄',
        description: "Turn your captures into beautiful Study Guides or PDFs in one click. Your exams won't know what hit them.",
        targetId: 'tutorial-export-pdf',
        position: 'bottom-left',
        icon: <CheckCircle2 className="w-8 h-8 text-pink-500" />
    },
    {
        id: 'finish',
        title: "You're Legend Bound! 🏆",
        description: "That's it! You're fully equipped to destroy your next exam. Welcome to the 1% of students.",
        targetId: null,
        requiredAction: null,
        icon: <Trophy className="w-10 h-10 text-yellow-500" />
    }
];

// --- Context ---
const TutorialContext = createContext({
    triggerAction: (action) => { },
    isActive: false,
    currentStep: null
});

export const useTutorial = () => useContext(TutorialContext);

// --- Provider ---
export const TutorialProvider = ({ children }) => {
    const [isActive, setIsActive] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        const hasSeen = localStorage.getItem('lectureSnap_pioneers_tutorial_v3');
        if (!hasSeen) {
            const timer = setTimeout(() => setIsActive(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const step = TUTORIAL_STEPS[currentStepIndex];

    const nextStep = () => {
        if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            completeTutorial();
        }
    };

    const completeTutorial = () => {
        setIsActive(false);
        localStorage.setItem('lectureSnap_pioneers_tutorial_v3', 'true');
    };

    const triggerAction = (actionName) => {
        if (!isActive) return;
        if (step?.requiredAction === actionName) {
            nextStep();
        }
    };

    return (
        <TutorialContext.Provider value={{ triggerAction, isActive, currentStepIndex }}>
            {children}
            {isActive && step && (
                <TutorialOverlay
                    step={step}
                    stepIndex={currentStepIndex}
                    totalSteps={TUTORIAL_STEPS.length}
                    onNext={nextStep}
                    onClose={completeTutorial}
                />
            )}
        </TutorialContext.Provider>
    );
};

// --- Premium Overlay Component ---
function TutorialOverlay({ step, stepIndex, totalSteps, onNext, onClose }) {
    const [rect, setRect] = useState(null);
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        if (!step.targetId) {
            setRect(null);
            return;
        }

        const updateRect = () => {
            const el = document.getElementById(step.targetId);
            if (el) {
                const r = el.getBoundingClientRect();
                setRect({
                    top: r.top - 12,
                    left: r.left - 12,
                    width: r.width + 24,
                    height: r.height + 24,
                    bottom: r.bottom + 12,
                    right: r.right + 12
                });
            } else {
                setRect(null);
            }
        };

        const updateSize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
            updateRect();
        }

        updateRect();
        window.addEventListener('resize', updateSize);
        window.addEventListener('scroll', updateRect, true);
        const timer = setInterval(updateRect, 300);

        return () => {
            window.removeEventListener('resize', updateSize);
            window.removeEventListener('scroll', updateRect, true);
            clearInterval(timer);
        };
    }, [step.targetId]);

    const isActionRequired = !!step.requiredAction;
    const pathString = rect
        ? `M 0 0 H ${windowSize.width} V ${windowSize.height} H 0 Z M ${rect.left} ${rect.top} V ${rect.bottom} H ${rect.right} V ${rect.top} Z`
        : `M 0 0 H ${windowSize.width} V ${windowSize.height} H 0 Z`;

    return createPortal(
        <div className="fixed inset-0 z-[99999] pointer-events-none">
            {/* Dark Mask */}
            <svg className="absolute inset-0 w-full h-full" width={windowSize.width} height={windowSize.height}>
                <path d={pathString} fill="black" fillOpacity="0.75" fillRule="evenodd" />
            </svg>

            {/* Glowing Spotlight */}
            {rect && (
                <motion.div
                    className="absolute rounded-2xl md:rounded-3xl border-4 border-blue-500 shadow-[0_0_60px_rgba(59,130,246,0.6)]"
                    initial={false}
                    animate={{
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                />
            )}

            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    key={step.id}
                    className={cn(
                        "absolute w-full max-w-[420px] max-h-[90vh] overflow-y-auto custom-scrollbar bg-white dark:bg-[#0f0f0f] rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.5)] border border-white/20 dark:border-white/5 pointer-events-auto p-8 flex flex-col items-center",
                        !rect ? "relative" : "" // Use relative if no rect for flex centering
                    )}
                    style={rect ? getTooltipPosition(rect, step.position) : {}}
                >
                    {/* Premium Header Decoration */}
                    <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-600/10 blur-3xl rounded-full" />

                    <div className="flex flex-col items-center text-center mb-6 relative">
                        <div className="mb-6 p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 shadow-inner">
                            {step.icon}
                        </div>
                        <div className="flex gap-1.5 mb-2">
                            {Array.from({ length: totalSteps }).map((_, i) => (
                                <div key={i} className={cn("w-6 h-1 rounded-full transition-all duration-500", i <= stepIndex ? "bg-blue-600" : "bg-gray-200 dark:bg-white/10")} />
                            ))}
                        </div>
                        <span className="text-[10px] font-black uppercase text-blue-500 tracking-[0.3em] mb-4">Challenge Step {stepIndex + 1}</span>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tighter">
                            {step.title}
                        </h3>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 text-base font-medium leading-relaxed mb-8 text-center px-4">
                        {step.description}
                    </p>

                    <div className="flex flex-col gap-4">
                        {!isActionRequired ? (
                            <button
                                onClick={onNext}
                                className="group relative flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-black shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {stepIndex === totalSteps - 1 ? "ENTER THE ARENA" : "NEXT LEVEL"}
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <div className="w-full py-4 bg-slate-900/5 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl flex flex-col items-center gap-2">
                                <div className="flex items-center gap-2 text-blue-500 text-xs font-black animate-pulse">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    WAITING FOR ACTION
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Complete the task above</span>
                            </div>
                        )}

                        <button onClick={onClose} className="text-slate-400 hover:text-red-500 text-xs font-black uppercase tracking-widest transition-colors py-2">
                            SKIP TUTORIAL
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>,
        document.body
    );
}

function getTooltipPosition(rect, position) {
    const gap = 24;
    const tooltipWidth = 420;
    const tooltipHeight = 440; // Safe estimate including padding/button

    let top = 0;
    let left = 0;

    // 1. Initial Position based on requested placement
    switch (position) {
        case 'right':
            top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            left = rect.right + gap;
            // Collision: If too far right, move to left
            if (left + tooltipWidth > window.innerWidth - 20) {
                left = rect.left - gap - tooltipWidth;
            }
            break;
        case 'left':
            top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            left = rect.left - gap - tooltipWidth;
            // Collision: If too far left, move to right
            if (left < 20) {
                left = rect.right + gap;
            }
            break;
        case 'bottom':
        case 'bottom-left':
            top = rect.bottom + gap;
            left = position === 'bottom'
                ? rect.left + (rect.width / 2) - (tooltipWidth / 2)
                : rect.left;
            // Collision: If too far down, move to top
            if (top + tooltipHeight > window.innerHeight - 20) {
                top = rect.top - tooltipHeight - gap;
            }
            break;
        case 'top':
            top = rect.top - tooltipHeight - gap;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            // Collision: If too far up, move to bottom
            if (top < 20) {
                top = rect.bottom + gap;
            }
            break;
        default:
            top = rect.bottom + gap;
            left = rect.left;
            if (top + tooltipHeight > window.innerHeight - 20) {
                top = rect.top - tooltipHeight - gap;
            }
    }

    // 2. Final Adaptive Clamping
    // Vertical Clamp
    if (top < 20) top = 20;
    if (top + tooltipHeight > window.innerHeight - 20) {
        top = window.innerHeight - tooltipHeight - 20;
    }

    // Horizontal Clamp
    if (left < 20) left = 20;
    if (left + tooltipWidth > window.innerWidth - 20) {
        left = window.innerWidth - tooltipWidth - 20;
    }

    return { top, left };
}
