import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Flame, Brain, Clock, Target, Calendar, Share2,
    Zap, Award, Trophy, ChevronLeft, ChevronRight,
    Sprout, Heart, Coffee, Star, MapPin, User, Settings, Info,
    Moon, Sun, LayoutGrid, CheckCircle2, ArrowRight, Sparkles,
    ZapOff, Activity, ShieldCheck, Rocket, Zap as ZapIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNoteStore } from '../hooks/useNoteStore';
import { ContributionHeatmap } from '../components/ContributionHeatmap';
import { db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

// --- Heatmap Implementation (Premium Style) ---
const HeatmapCell = ({ level, date, onHover, onClick }) => {
    const colors = [
        "bg-slate-100 dark:bg-white/[0.03]",
        "bg-emerald-400/30 dark:bg-emerald-500/10",
        "bg-emerald-500/60 dark:bg-emerald-500/40",
        "bg-emerald-600 dark:bg-emerald-500"
    ];

    const isToday = new Date(date).toDateString() === new Date().toDateString();

    return (
        <motion.div
            onMouseEnter={(e) => onHover(e, { date, level })}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(date, level)}
            whileHover={{ scale: 1.3, zIndex: 10 }}
            className={cn(
                "w-4 h-4 md:w-5 md:h-5 rounded-[4px] cursor-pointer transition-all duration-300 relative group",
                colors[level],
                isToday && "ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent dark:ring-offset-[#080808]"
            )}
        >
            {level > 0 && (
                <div className="absolute inset-0 rounded-[4px] bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
            )}
        </motion.div>
    );
};

const ActivityHeatmap = ({ data, onCellClick }) => {
    const [tooltip, setTooltip] = useState(null);
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const weeks = [];
    for (let i = 0; i < data.length; i += 7) {
        weeks.push(data.slice(i, i + 7));
    }

    return (
        <div className="glass-card p-10 noise-light relative group/heatmap overflow-visible">
            {/* Custom Tooltip */}
            <AnimatePresence>
                {tooltip && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        style={{ left: tooltip.x, top: tooltip.y }}
                        className="fixed z-[100] pointer-events-none -translate-x-1/2 -translate-y-[120%]"
                    >
                        <div className="px-4 py-3 rounded-2xl bg-slate-900/90 dark:bg-white/95 backdrop-blur-xl text-white dark:text-slate-900 shadow-2xl border border-white/20 flex flex-col items-center gap-1 min-w-[140px]">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                {new Date(tooltip.data.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <div className="h-px w-full bg-white/10 dark:bg-black/10 my-1" />
                            <span className="text-sm font-black flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5 text-blue-500" />
                                {tooltip.data.level === 0 ? 'No Snapshots' : `${tooltip.data.level * 4}+ Captures`}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-10 gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10">
                        <Activity className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="font-black text-3xl tracking-tighter text-gradient leading-none mb-2">Study Persistence</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Annual Knowledge Matrix
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-white/[0.03] p-2 rounded-2xl border border-black/5 dark:border-white/5 flex items-center gap-4 px-6 shrink-0">
                    <span className="text-[10px] font-black text-slate-400">PULSE INTENSITY</span>
                    <div className="flex gap-2">
                        {[0, 1, 2, 3].map(l => {
                            const colors = ["bg-slate-200 dark:bg-white/10", "bg-emerald-400/30", "bg-emerald-500/60", "bg-emerald-600"];
                            return <div key={l} className={cn("w-3.5 h-3.5 rounded-sm shadow-sm transition-transform hover:scale-125", colors[l])} />
                        })}
                    </div>
                </div>
            </div>

            <div className="flex gap-6">
                {/* Day Labels - Professional Styling */}
                <div className="flex flex-col gap-2 mt-10 shrink-0">
                    {daysOfWeek.map((day, i) => (
                        <div key={i} className="h-4 md:h-5 text-[10px] font-black text-slate-400/40 uppercase items-center flex pr-2">
                            {[1, 3, 5].includes(i) ? day : ''}
                        </div>
                    ))}
                </div>

                <div className="overflow-x-auto pb-8 custom-scrollbar scroll-smooth flex-1 heatmap-scrollmask">
                    <div className="inline-block min-w-full">
                        {/* Month Labels with Vertical Markers */}
                        <div className="flex mb-3">
                            {weeks.map((week, i) => {
                                const date = new Date(week[0].date);
                                const isFirstWeekOfMonth = date.getDate() <= 7;
                                const isFirstWeekOfGrid = i === 0;

                                return (
                                    <div key={i} className="w-4 md:w-5 mr-1.5 flex-shrink-0 text-[10px] font-black text-slate-400/60 uppercase">
                                        {(isFirstWeekOfMonth || isFirstWeekOfGrid) ? months[date.getMonth()] : ''}
                                    </div>
                                );
                            })}
                        </div>

                        {/* The Grid with Staggered Animation */}
                        <div className="flex gap-1.5">
                            {weeks.map((week, weekIdx) => {
                                const date = new Date(week[0].date);
                                const isFirstWeekOfMonth = date.getDate() <= 7;

                                return (
                                    <motion.div
                                        key={weekIdx}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: weekIdx * 0.01 }}
                                        className={cn(
                                            "flex flex-col gap-1.5 md:gap-2 relative",
                                            isFirstWeekOfMonth && weekIdx !== 0 ? "pl-2 ml-1 border-l-2 border-slate-200 dark:border-white/5" : ""
                                        )}
                                    >
                                        {week.map((day, dayIdx) => (
                                            <HeatmapCell
                                                key={dayIdx}
                                                level={day.level}
                                                date={day.date}
                                                onClick={onCellClick}
                                                onHover={(e, data) => {
                                                    if (!e) return setTooltip(null);
                                                    setTooltip({ x: e.clientX, y: e.clientY, data });
                                                }}
                                            />
                                        ))}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Evolutionary Avatar (Premium Style) ---
const EvolutionaryAvatar = ({ streak }) => {
    const getAvatarConfig = () => {
        if (streak === 0) return {
            icon: <Moon className="w-16 h-16" />,
            label: "Dormant",
            color: "from-slate-400 to-slate-600",
            shadow: "shadow-slate-500/20"
        };
        if (streak <= 5) return {
            icon: <Sprout className="w-16 h-16" />,
            label: "The Sprout",
            color: "from-emerald-400 to-teal-500",
            shadow: "shadow-emerald-500/20"
        };
        if (streak <= 15) return {
            icon: <Coffee className="w-16 h-16" />,
            label: "Caffeinated",
            color: "from-amber-400 to-orange-500",
            shadow: "shadow-amber-500/20"
        };
        if (streak <= 30) return {
            icon: <Brain className="w-16 h-16" />,
            label: "Neuro-Link",
            color: "from-purple-500 to-indigo-600",
            shadow: "shadow-purple-500/20"
        };
        return {
            icon: <Trophy className="w-16 h-16" />,
            label: "The Legend",
            color: "from-yellow-400 to-orange-600",
            shadow: "shadow-yellow-500/40"
        };
    };

    const config = getAvatarConfig();

    return (
        <div className="flex flex-col items-center gap-4 relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 blur-2xl rounded-full group-hover:opacity-40 transition-opacity" />
            <motion.div
                key={config.label}
                initial={{ scale: 0.8, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                whileHover={{ rotate: 5, scale: 1.05 }}
                className={cn(
                    "w-32 h-32 rounded-3xl bg-gradient-to-br flex items-center justify-center relative z-10 p-1",
                    config.color, config.shadow, "shadow-2xl"
                )}
            >
                <div className="w-full h-full rounded-[20px] bg-white/10 dark:bg-black/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/30">
                    {config.icon}
                </div>
            </motion.div>
            <motion.span
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="px-4 py-1.5 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-md text-[10px] font-black uppercase tracking-[0.2em] border border-black/5 dark:border-white/10"
            >
                {config.label}
            </motion.span>
        </div>
    );
};

// --- Main Layout ---
export default function ProfilePage() {
    const { currentUser } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const { studyTime } = useNoteStore();

    const formatStudyTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const [profileData, setProfileData] = useState(null);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [heatmapData, setHeatmapData] = useState([]);
    const [loading, setLoading] = useState(true);

    const level = Math.floor((profileData?.exp || 0) / 1000) + 1;
    const exp = (profileData?.exp || 0) % 1000;
    const maxExp = 1000;
    const streak = profileData?.streak || 0;

    useEffect(() => {
        if (!currentUser) return;

        // 1. Listen to Profile Data
        const unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setProfileData(data);
                setNewUsername(data.username || data.displayName || '');
            }
        });

        // 2. Fetch Notes for Heatmap
        const fetchHeatmap = async () => {
            const notesQ = query(collection(db, `users/${currentUser.uid}/notes`));
            const snapshot = await getDocs(notesQ);
            const notes = snapshot.docs.map(d => d.data());

            // Aggregate counts by date
            const counts = {};
            notes.forEach(note => {
                if (!note.createdAt) return;
                const date = note.createdAt.toDate().toISOString().split('T')[0];
                counts[date] = (counts[date] || 0) + 1;
            });

            // Generate exactly 1 year of data (Last 12 Months)
            const today = new Date();
            const startOfHistory = new Date();
            startOfHistory.setFullYear(today.getFullYear() - 1);
            startOfHistory.setDate(today.getDate() + 1); // Start from "tomorrow" 1 year ago

            // Adjust to the nearest Sunday to keep the grid aligned
            const startDay = startOfHistory.getDay();
            const adjustedStart = new Date(startOfHistory);
            adjustedStart.setDate(startOfHistory.getDate() - startDay);

            // Generate 365 days (approx 52 weeks)
            const daysDiff = 52 * 7;

            const data = Array.from({ length: daysDiff }, (_, i) => {
                const date = new Date(adjustedStart);
                date.setDate(adjustedStart.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                const count = counts[dateStr] || 0;
                return {
                    date: dateStr,
                    count: count
                };
            });
            setHeatmapData(data);
            setLoading(false);
        };

        fetchHeatmap();
        return () => unsubProfile();
    }, [currentUser]);

    const handleUpdateUsername = async () => {
        if (!newUsername.trim()) return;
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                username: newUsername.trim()
            });
            setIsEditingUsername(false);
        } catch (err) {
            alert("Failed to update username");
        }
    };

    const handleShare = () => {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#8b5cf6', '#10b981']
        });
    };

    const handleHeatmapClick = (date, level) => {
        if (window.navigator?.vibrate) window.navigator.vibrate(10);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#080808] text-slate-800 dark:text-slate-100 overflow-x-hidden transition-colors duration-500 font-sans">

            {/* Dynamic Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40 dark:opacity-20 transition-opacity">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/30 blur-[120px] rounded-full animate-float" />
                <div className="absolute bottom-[20%] right-[-10%] w-[35%] h-[45%] bg-purple-500/20 blur-[120px] rounded-full animate-float" style={{ animationDelay: '2s' }} />
                <div className="absolute top-[40%] left-[60%] w-[25%] h-[25%] bg-emerald-500/20 blur-[120px] rounded-full animate-float" style={{ animationDelay: '4s' }} />
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 relative z-10 space-y-10">

                {/* Navigation / Header */}
                <header className="flex items-center justify-between">
                    <Link to="/app" className="group flex items-center gap-3 px-5 py-2.5 rounded-2xl premium-blur hover:bg-white dark:hover:bg-white/10 transition-all border border-black/5 dark:border-white/5 active:scale-95">
                        <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm tracking-tight uppercase">Dashboard</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <button onClick={toggleTheme} className="p-3 rounded-2xl premium-blur hover:rotate-12 transition-transform border border-black/5 dark:border-white/5">
                            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-600" />}
                        </button>
                        <div className="p-3 rounded-2xl premium-blur border border-black/5 dark:border-white/5 hover:scale-110 transition-transform cursor-pointer">
                            <Settings className="w-5 h-5 text-slate-400" />
                        </div>
                    </div>
                </header>

                {/* PROFILE HERO BENTO */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main User Card */}
                    <div className="lg:col-span-2 glass-card p-1 items-stretch group overflow-visible">
                        <div className="h-full bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl rounded-[28px] p-8 md:p-10 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">

                            {/* Interior gradient accent */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-3xl -mr-20 -mt-20 group-hover:opacity-100 opacity-60 transition-opacity" />

                            <EvolutionaryAvatar streak={streak} />

                            <div className="flex-1 space-y-6 text-center md:text-left relative z-10">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-center md:justify-start gap-3">
                                        {isEditingUsername ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    value={newUsername}
                                                    onChange={e => setNewUsername(e.target.value)}
                                                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-2xl font-black outline-none focus:ring-2 ring-blue-500"
                                                    autoFocus
                                                />
                                                <button onClick={handleUpdateUsername} className="p-2 bg-blue-500 rounded-xl"><CheckCircle2 className="w-6 h-6" /></button>
                                            </div>
                                        ) : (
                                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-gradient leading-tight flex items-center gap-2">
                                                {profileData?.username || profileData?.displayName || 'Knowledge Seeker'}
                                                <button onClick={() => setIsEditingUsername(true)} className="opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity"><Settings className="w-4 h-4" /></button>
                                            </h1>
                                        )}
                                        {currentUser?.emailVerified && (
                                            <div className="hidden md:flex p-1.5 rounded-xl bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">
                                                <ShieldCheck className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-center md:justify-start gap-4">
                                        <span className="px-4 py-1 rounded-full bg-blue-500 text-white text-xs font-black tracking-widest uppercase italic">{streak > 10 ? 'Elite Tier' : 'Aspirant'}</span>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-blue-500" /> Joined {profileData?.joinedAt?.toDate().toLocaleDateString() || 'Recently'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                                        <span className="flex items-center gap-2">Level Up Progress <Rocket className="w-3.5 h-3.5 text-blue-500" /></span>
                                        <span className="text-blue-500">{exp} / {maxExp} PX</span>
                                    </div>
                                    <div className="h-4 bg-black/5 dark:bg-white/5 rounded-full p-1 border border-black/5 dark:border-white/5 relative group/bar">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(exp / maxExp) * 100}%` }}
                                            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full relative"
                                        >
                                            <div className="absolute top-0 bottom-0 right-0 w-4 bg-white/20 blur-sm rounded-full" />
                                        </motion.div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold opacity-60">RANK: MASTER SCRIBE</span>
                                        <div className="px-3 py-1 rounded-lg bg-white/50 dark:bg-white/10 text-[10px] font-black text-blue-500 border border-blue-500/20 uppercase tracking-wider">LVL {level}</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center md:justify-start gap-3">
                                    <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs hover:scale-105 transition-transform active:scale-95 shadow-xl">
                                        EDIT PROFILE <ArrowRight className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleShare} className="p-3 rounded-2xl bg-white/50 dark:bg-white/10 hover:bg-blue-500 hover:text-white transition-all border border-black/5 dark:border-white/10">
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Streak Bento Widget */}
                    <div className="glass-card p-8 group relative overflow-hidden flex flex-col items-center justify-center text-center gap-8 border-none md:border md:border-white/10">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative">
                            <div className="w-44 h-44 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center animate-spin-slow">
                                {/* Orbiting particles */}
                                <div className="absolute top-0 w-3 h-3 bg-orange-500 rounded-full shadow-[0_0_10px_orange]" />
                            </div>

                            <div className="absolute inset-4 rounded-full premium-blur flex items-center justify-center flex-col border border-white/40 dark:border-white/10 shadow-xl">
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg shadow-orange-500/40 mb-2 rotate-12 group-hover:rotate-0 transition-transform"
                                >
                                    <Flame className="w-8 h-8" fill="currentColor" />
                                </motion.div>
                                <span className="text-5xl font-black text-gradient leading-none">{streak}</span>
                                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Days Streak</span>
                            </div>
                        </div>

                        <div className="w-full space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col items-start gap-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Streak Freeze</span>
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className={cn("w-6 h-2 rounded-full", i <= 2 ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-800")} />
                                        ))}
                                    </div>
                                </div>
                                <div className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 font-black text-[10px] uppercase border border-orange-500/20">
                                    BEST: 42D
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 dark:bg-white/5 w-full" />

                            <div className="flex items-center justify-between">
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lifetime Focus</span>
                                    <span className="text-xl font-black text-blue-500">{formatStudyTime(studyTime)}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                                    <Clock className="w-5 h-5 animate-pulse" />
                                </div>
                            </div>

                            <p className="text-[11px] font-bold text-slate-400 italic">"Your persistence is reaching critical levels. Stay consistent."</p>
                        </div>
                    </div>

                    {/* Matrix Bento Grid */}
                    <div className="lg:col-span-3 space-y-8">
                        <ContributionHeatmap data={heatmapData} onCellClick={handleHeatmapClick} />

                        {/* Daily Habit Tracker */}
                        <div className="glass-card p-8 group relative overflow-hidden bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black tracking-tight text-gradient">Habit Integrity</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Snapshot Consistency (Last 7 Days)</p>
                                </div>
                                <div className="flex -space-x-2">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#080808] bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                                            {i}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-4">
                                {heatmapData.slice(-7).map((day, i) => (
                                    <div key={i} className="flex flex-col items-center gap-3">
                                        <div className={cn(
                                            "w-full aspect-square rounded-2xl border-2 flex items-center justify-center transition-all duration-500",
                                            day.level > 0
                                                ? "bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-white"
                                                : "bg-black/5 dark:bg-white/5 border-transparent text-slate-400"
                                        )}>
                                            {day.level > 0 ? <CheckCircle2 className="w-6 h-6" /> : <ZapOff className="w-5 h-5 opacity-20" />}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">
                                            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(day.date).getDay()]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stats Triple Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:col-span-3 gap-6">
                        {[
                            {
                                label: "Total Captures",
                                val: heatmapData.reduce((acc, curr) => acc + (curr.level > 0 ? 1 : 0), 0),
                                meta: "Historical Archive",
                                color: "text-blue-500",
                                bg: "bg-blue-500/5",
                                icon: <Clock />
                            },
                            {
                                label: "Study Consistency",
                                val: `${Math.round((heatmapData.filter(d => d.level > 0).length / 365) * 100)}%`,
                                meta: "Yearly Active Days",
                                color: "text-emerald-500",
                                bg: "bg-emerald-500/5",
                                icon: <Target />
                            },
                            {
                                label: "Current Pace",
                                val: `${heatmapData.slice(-7).filter(d => d.level > 0).length}/7`,
                                meta: "Days Active this Week",
                                color: "text-purple-500",
                                bg: "bg-purple-500/5",
                                icon: <ZapIcon />
                            }
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -5 }}
                                className="glass-card p-8 flex flex-col justify-between gap-6 group relative overflow-hidden"
                            >
                                <div className={cn("absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full transition-opacity opacity-20 group-hover:opacity-40", stat.bg)} />

                                <div className="flex items-center justify-between relative z-10">
                                    <div className={cn("p-4 rounded-2xl premium-blur border border-white/20 shadow-lg", stat.color)}>
                                        {stat.icon}
                                    </div>
                                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 uppercase tracking-wider">{stat.meta}</span>
                                </div>

                                <div className="space-y-1 relative z-10">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</span>
                                    <div className="flex items-baseline gap-2">
                                        <h4 className="text-5xl font-black text-gradient">{stat.val}</h4>
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Achievement Matrix */}
                    <div className="lg:col-span-2 glass-card p-8 space-y-8">
                        <div className="flex items-center justify-between text-gradient">
                            <h3 className="text-2xl font-black italic tracking-tight uppercase flex items-center gap-3">
                                Achievement Matrix <Award className="w-6 h-6 text-blue-500" />
                            </h3>
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/50 dark:bg-white/5 text-[10px] font-black uppercase border border-black/5 dark:border-black/10">
                                Unlocked: <span className="text-blue-500 ml-1">4/12</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {[
                                { name: "First Snap", icon: <ZapIcon />, unlocked: true, rarity: "Common" },
                                { name: "Night Owl", icon: <Moon />, unlocked: false, rarity: "Epic" },
                                { name: "Scribe Elite", icon: <Award />, unlocked: true, rarity: "Rare" },
                                { name: "Marathon", icon: <Trophy />, unlocked: true, rarity: "Legendary" },
                                { name: "Squad Alpha", icon: <Star />, unlocked: false, rarity: "Rare" },
                                { name: "Consistency", icon: <CheckCircle2 />, unlocked: true, rarity: "Legendary" },
                            ].map((badge, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ scale: 1.05 }}
                                    className={cn(
                                        "p-4 rounded-[24px] border transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden",
                                        badge.unlocked
                                            ? "premium-blur border-blue-500/20 shadow-xl opacity-100 cursor-pointer"
                                            : "bg-black/5 dark:bg-white/[0.02] border-dashed border-gray-300 dark:border-white/5 opacity-40 grayscale"
                                    )}
                                >
                                    {badge.unlocked && <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/10 blur-lg" />}
                                    <div className={cn(
                                        "p-3 rounded-2xl border transition-colors",
                                        badge.unlocked ? "bg-white dark:bg-black/20 border-blue-500/20 text-blue-500" : "bg-transparent border-slate-200 dark:border-white/5 text-slate-400"
                                    )}>
                                        {badge.icon}
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[10px] font-black uppercase block tracking-tight">{badge.name}</span>
                                        <span className={cn(
                                            "text-[8px] font-bold uppercase tracking-[0.15em]",
                                            badge.rarity === 'Legendary' ? 'text-amber-500' : 'text-slate-400'
                                        )}>{badge.rarity}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Action Card */}
                    <div className="glass-card p-8 flex flex-col justify-between bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-[0_20px_50px_rgba(37,99,235,0.3)]">
                        <div className="space-y-4">
                            <Rocket className="w-10 h-10 mb-2" />
                            <h3 className="text-2xl font-black italic uppercase leading-tight">Sync Global Progress</h3>
                            <p className="text-xs font-bold text-white/70 leading-relaxed">
                                Join 2,400+ students on the global heat map. Share your deep work focus and compete for the leaderboard.
                            </p>
                        </div>
                        <Link to="/global-map" className="group flex items-center justify-between w-full p-4 mt-8 rounded-2xl bg-white text-slate-900 font-extrabold text-sm hover:scale-105 transition-transform">
                            GO TO GLOBAL MAP
                            <div className="p-1 px-2 rounded-lg bg-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </Link>
                    </div>

                </div>

                {/* Footer Meta */}
                <footer className="pt-10 pb-20 border-t border-black/5 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <img src="/logo.png" alt="LectureSnap" className="w-10 h-10 grayscale hover:grayscale-0 transition-all opacity-40 hover:opacity-100 cursor-pointer" />
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Encrypted Study Repository v4.0.2</div>
                    </div>
                    <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <span className="hover:text-blue-500 cursor-pointer transition-colors">Privacy</span>
                        <span className="hover:text-blue-500 cursor-pointer transition-colors">Nodes</span>
                        <span className="hover:text-blue-500 cursor-pointer transition-colors">Credits</span>
                    </div>
                </footer>

            </div>
        </div>
    );
}
