import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
    ArrowRight, Video, Zap, Scan, Cloud, Monitor,
    Moon, Sun, Download, FileText, Shield, Key,
    Github, Disc, Users, Globe, Puzzle, MousePointer2, Sparkles,
    Layout, Layers, Smartphone, Cpu, Lock, Star, ChevronRight,
    Play, MessageCircle, BarChart3, GraduationCap, Youtube, Folder, Upload, CheckCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { useActivePresence } from '../hooks/useActivePresence';
import { SEO } from '../components/SEO';
import { ContentDiscovery } from '../components/ContentDiscovery';

gsap.registerPlugin(ScrollTrigger);

// --- Custom Icons ---
const BrainIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .52 8.204A4.002 4.002 0 0 0 12 19V5Z" /><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.52 8.204A4.002 4.002 0 0 1 12 19V5Z" />
    </svg>
);

const GlobalIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
    </svg>
);

const CloudflareIcon = (props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...props}>
        <path fill="#F38020" d="M23.53 15.178c-.02-.02-.12-.04-.26-.06l-.28-.02h-.01c-.11 0-.21.03-.3.08l-.13.06c-.66.36-1.5.57-2.42.57-1.42 0-2.67-.49-3.48-1.28l-.11-.11a.488.488 0 0 0-.35-.15h-.11c-.13 0-.25.05-.34.14-.3.29-.63.53-.99.7-.58.28-1.22.42-1.92.42-1.41 0-2.65-.58-3.52-1.5-.16-.18-.32-.38-.46-.58l-.05-.08a.465.465 0 0 0-.29-.18h-.12c-.11 0-.22.03-.31.1-.19.14-.39.26-.59.36-.61.31-1.3.47-2.06.47-1.39 0-2.61-.53-3.44-1.39l-.09-.09a.466.466 0 0 0-.33-.14h-.05l-.17.02c-.15.02-.27.08-.34.18l-.01.01c-.17.2-.28.45-.33.72-.03.11-.04.22-.04.34 0 1.28.53 2.43 1.39 3.25.26.25.56.46.88.64.93.52 2.01.81 3.16.81.5 0 .98-.06 1.44-.17.52-.13 1.01-.33 1.45-.6.04-.03.09-.05.14-.05.08 0 .15.04.19.1.18.25.39.48.62.69.75.68 1.76 1.09 2.86 1.09.83 0 1.6-.23 2.26-.64.06-.03.11-.05.17-.05.07 0 .14.03.19.09.2.22.43.43.68.61.88.61 1.95.98 3.11.98.53 0 1.05-.08 1.54-.23 1.03-.3 1.92-.91 2.58-1.72.33-.4.59-.86.76-1.36.19-.54.29-1.12.29-1.72 0-.32-.03-.64-.09-.94l-.04-.15a.51.51 0 0 0-.41-.39" />
    </svg>
);
const FirebaseIcon = (props) => (
    <svg viewBox="0 0 24 24" width="24" height="24" {...props}>
        <path fill="#FFCA28" d="M3.89 15.672L6.255.461A.545.545 0 0 1 7.28.28l2.97 5.634L3.89 15.672z" />
        <path fill="#FFA000" d="M14.004 6.78l-2.035-3.868a.545.545 0 0 0-1.018 0L3.25 18.067l.128.1a.545.545 0 0 0 .61.054L14.004 6.78z" />
        <path fill="#F57C00" d="M20.681 15.678l-6.045-9.648-3.054 5.792 6.088 3.856h3.011z" />
    </svg>
);

const UdIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" {...props}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
    </svg>
);

const UdemyIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" {...props}>
        <path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45zM11 11h2v4h-2v-4zm0 6h2v2h-2v-2z" />
    </svg>
);

const GeminiIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" {...props}>
        <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
    </svg>
);

const ChatGPTIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" {...props}>
        <path d="M22.28 12.12c.03-.19.05-.38.05-.58 0-1.87-1.52-3.39-3.39-3.39-.41 0-.8.07-1.16.21-.49-1.62-1.99-2.81-3.77-2.81-1.25 0-2.36.57-3.08 1.47-1.19-1.33-2.92-2.18-4.85-2.18-3.64 0-6.59 2.95-6.59 6.59 0 .42.04.83.12 1.23-.9.9-1.46 2.14-1.46 3.51 0 2.76 2.24 5 5 5h12c2.76 0 5-2.24 5-5 0-1.1-.36-2.11-.98-2.93a4.912 4.912 0 0 0 .05-.44v-.03z" />
    </svg>
);

const ShareIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
);

const SecureIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const FreeIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" {...props}>
        <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
    </svg>
);

// --- UI Components ---

const FloatingElement = ({ children, delay = 0, className }) => {
    const elRef = useRef(null);
    useEffect(() => {
        if (!elRef.current) return;
        const tl = gsap.to(elRef.current, {
            y: "random(-40, 40)",
            x: "random(-20, 20)",
            rotation: "random(-15, 15)",
            duration: "random(4, 6)",
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay
        });
        return () => tl.kill();
    }, [delay]);
    return <div ref={elRef} className={cn("absolute pointer-events-none", className)}>{children}</div>;
};

const GlowEffect = () => {
    const glowRef = useRef(null);
    useEffect(() => {
        const handleMove = (e) => {
            if (!glowRef.current) return;
            gsap.to(glowRef.current, {
                x: e.clientX,
                y: e.clientY,
                duration: 1,
                ease: "power2.out"
            });
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);
    return (
        <div ref={glowRef} className="fixed top-0 left-0 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-[120px] pointer-events-none z-0 -translate-x-1/2 -translate-y-1/2" />
    );
};


import { usePWAInstall } from '../hooks/usePWAInstall';

export default function Landing() {
    const containerRef = useRef(null);
    const heroRef = useRef(null);
    const { isDarkMode, toggleTheme } = useTheme();
    const { onlineCount } = useActivePresence();
    const { isInstallable, install } = usePWAInstall();

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".hero-line span", {
                y: 150,
                skewY: 10,
                opacity: 0,
                duration: 1.5,
                stagger: 0.1,
                ease: "power4.out"
            });

            gsap.utils.toArray(".feature-card").forEach((card, i) => {
                gsap.from(card, {
                    scrollTrigger: {
                        trigger: card,
                        start: "top 90%",
                        toggleActions: "play none none reverse"
                    },
                    y: 60,
                    opacity: 0,
                    duration: 1,
                    delay: i * 0.1,
                    ease: "power3.out"
                });
            });

            gsap.to(".parallax-mockup", {
                scrollTrigger: {
                    trigger: ".parallax-mockup",
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1
                },
                y: -100,
                rotationZ: -5,
                ease: "none"
            });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <div ref={containerRef} className="relative min-h-screen bg-slate-50 dark:bg-[#030303] text-slate-900 dark:text-zinc-100 selection:bg-blue-500/30 overflow-x-hidden font-sans transition-colors duration-500">
            <SEO
                title="LectureSnap | Ultimate YouTube & Coursera Study Companion"
                description="Turn any lecture into organized notes, AI flashcards, and mind maps. Collaborative study for students."
            />

            <GlowEffect />

            {/* Floating Background Icons */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-10 dark:opacity-20">
                <FloatingElement className="top-[20%] left-[10%]" delay={0}><Youtube className="w-12 h-12 text-red-500" /></FloatingElement>
                <FloatingElement className="top-[40%] right-[15%]" delay={1}><GraduationCap className="w-16 h-16 text-blue-500" /></FloatingElement>
                <FloatingElement className="bottom-[30%] left-[20%]" delay={2}><BrainIcon className="w-10 h-10 text-purple-500" /></FloatingElement>
                <FloatingElement className="bottom-[10%] right-[10%]" delay={1.5}><Sparkles className="w-14 h-14 text-yellow-500" /></FloatingElement>
            </div>

            {/* --- NAV --- */}
            <nav className="fixed top-0 inset-x-0 z-[100] px-6 py-6 transition-all duration-300">
                <div className="max-w-7xl mx-auto flex items-center justify-between premium-blur px-8 py-4 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl backdrop-blur-3xl bg-white/40 dark:bg-black/40">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                            <img src="/logo.png" alt="L" className="w-6 h-6" />
                        </div>
                        <span className="text-xl md:text-2xl font-black tracking-tighter italic">LECTURESNAP</span>
                    </div>

                    <div className="hidden lg:flex items-center gap-10 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
                        <a href="#features" className="hover:text-blue-500 transition-colors">Exam Prep</a>
                        <a href="#intelligence" className="hover:text-blue-500 transition-colors">AI Analysis</a>
                        <a href="#labs" className="hover:text-blue-500 transition-colors">Study Rooms</a>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <button onClick={toggleTheme} className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl active:scale-90 transition-all shadow-sm">
                            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-600" />}
                        </button>
                        <Link to="/app" className="px-6 sm:px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">
                            Open App
                        </Link>
                    </div>
                </div>
            </nav>

            {/* --- HERO --- */}
            <header ref={heroRef} className="relative pt-40 pb-20 px-6 flex flex-col items-center text-center z-10">
                <div className="hero-line overflow-hidden mb-4">
                    <span className="block text-[clamp(2rem,12vw,12rem)] font-black tracking-tighter leading-none text-slate-900 dark:text-white">
                        ACE YOUR
                    </span>
                </div>
                <div className="hero-line overflow-hidden mb-12">
                    <span className="block text-[clamp(2rem,12vw,12rem)] font-black tracking-tighter leading-none text-gradient-vibrant underline decoration-blue-500 decoration-8 underline-offset-[10px] sm:underline-offset-[20px]">
                        EXAMS.
                    </span>
                </div>

                <p className="max-w-4xl mx-auto text-lg md:text-3xl font-light text-slate-600 dark:text-zinc-500 mb-20 leading-tight">
                    The #1 companion for <span className="font-bold text-red-500">YouTube</span> & <span className="font-bold text-blue-600 dark:text-blue-400">Coursera</span>. <br />
                    <span className="text-slate-900 dark:text-white font-black italic">Snap Screenshots. Create Flashcards. Score A+.</span>
                </p>

                <div className="flex flex-col sm:row items-center gap-8">
                    <Link to="/app" className="group px-10 sm:px-12 py-5 sm:py-7 bg-blue-600 text-white rounded-[3rem] font-black text-lg sm:text-xl shadow-[0_50px_100px_rgba(37,99,235,0.3)] hover:scale-110 active:scale-95 transition-all flex items-center gap-4">
                        START STUDYING FREE <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform" />
                    </Link>
                </div>
            </header>

            {/* --- INFINITE MARQUEE --- */}
            <div className="py-12 border-y border-slate-200 dark:border-white/5 overflow-hidden bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
                <div className="flex w-max gap-20 animate-infinite-scroll items-center opacity-70 dark:opacity-50">
                    {Array(10).fill(0).map((_, i) => (
                        <div key={i} className="flex items-center gap-8 text-3xl md:text-4xl font-black text-slate-400 dark:text-zinc-800 tracking-tighter uppercase">
                            <div className="flex items-center gap-3"><CloudflareIcon className="w-8 h-8 text-orange-400" /> Cloudflare</div>
                            <div className="flex items-center gap-3"><FirebaseIcon className="w-8 h-8" /> Firebase</div>
                            <div className="flex items-center gap-3"><SecureIcon className="w-8 h-8 text-green-500" /> Secure</div>
                            <div className="flex items-center gap-3"><ShareIcon className="w-8 h-8 text-blue-500" /> Share</div>
                            <div className="flex items-center gap-3"><Youtube className="w-8 h-8 text-red-600" /> Youtube</div>
                            <div className="flex items-center gap-3"><GraduationCap className="w-8 h-8 text-blue-600" /> Coursera</div>
                            <div className="flex items-center gap-3"><UdemyIcon className="w-8 h-8 text-purple-600" /> Udemy</div>
                            <div className="flex items-center gap-3"><GeminiIcon className="w-8 h-8 text-blue-400" /> Gemini</div>
                            <div className="flex items-center gap-3"><FileText className="w-8 h-8 text-black dark:text-white" /> Notion</div>
                            <div className="flex items-center gap-3"><ChatGPTIcon className="w-8 h-8 text-teal-600" /> ChatGPT</div>
                            <div className="flex items-center gap-3"><FreeIcon className="w-8 h-8 text-yellow-500" /> Free</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- MOBILE APP FEATURE SECTION --- */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 md:gap-32">
                    <div className="flex-1 order-2 md:order-1 relative group md:pl-20">
                        {/* Mockup */}
                        <div className="relative z-10 w-72 h-[600px] border-[12px] border-slate-900 bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden mx-auto transform transition-transform group-hover:scale-105 duration-700">
                            <div className="absolute top-0 w-full h-8 bg-slate-900 z-20 rounded-b-xl flex justify-center items-center">
                                <div className="w-20 h-5 bg-black rounded-b-full"></div>
                            </div>
                            {/* Mobile Screen Mockup Content */}
                            <div className="w-full h-full bg-[#0f172a] overflow-hidden flex flex-col">
                                <div className="p-4 pt-12 flex justify-between items-center text-white/50 border-b border-white/5">
                                    <div className="w-6 h-6 rounded-full bg-white/10" />
                                    <div className="w-20 h-2 rounded-full bg-white/10" />
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="h-40 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-3/4 rounded-full bg-white/20" />
                                        <div className="h-4 w-1/2 rounded-full bg-white/10" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <div className="h-24 rounded-xl bg-white/5" />
                                        <div className="h-24 rounded-xl bg-white/5" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Glow Behind */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-[500px] bg-blue-500/30 blur-[100px] -z-10 group-hover:bg-purple-500/30 transition-colors duration-1000" />
                    </div>

                    <div className="flex-1 order-1 md:order-2 text-center md:text-left">
                        <span className="inline-block px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs tracking-widest uppercase mb-6 border border-blue-500/20">
                            Available Everywhere
                        </span>
                        <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-8 leading-none">
                            STUDY ON <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">ANY DEVICE.</span>
                        </h2>
                        <p className="text-xl text-slate-600 dark:text-zinc-400 mb-10 leading-relaxed font-light">
                            Install LectureSnap as a native App on iOS and Android. No App Store needed. Just click <strong>"Add to Home Screen"</strong> for a full-screen, offline-ready experience.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                            <button className="flex items-center gap-3 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-105 transition-transform">
                                <Smartphone className="w-5 h-5" /> Install App
                            </button>
                            <Link to="/app" className="flex items-center gap-3 px-6 py-3 bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-all">
                                Try Web Version <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FEATURE SECTION --- */}
            <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-[6rem] font-black tracking-tighter mb-10 text-slate-900 dark:text-white leading-none">THE TOOLS.</h2>
                    <p className="text-lg md:text-xl text-slate-500 dark:text-zinc-500 font-bold uppercase tracking-widest">Master your courses in half the time.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
                    <div className="feature-card glass-card p-8 sm:p-10 bg-white/80 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 hover:border-blue-500 transition-all duration-500 group shadow-lg">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-blue-600 flex items-center justify-center mb-10 shadow-2xl group-hover:scale-110 transition-transform">
                            <Scan className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black mb-6 text-slate-900 dark:text-white">Smart Snap</h3>
                        <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-lg">
                            One click to capture any whiteboard or slide. No more pausing and typing manually. Your notes are **time-stamped** to the second.
                        </p>
                    </div>

                    <div className="feature-card glass-card p-8 sm:p-10 bg-white/80 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 hover:border-purple-500 transition-all duration-500 group shadow-lg">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-purple-600 flex items-center justify-center mb-10 shadow-2xl group-hover:scale-110 transition-transform">
                            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black mb-6 text-slate-900 dark:text-white">AI Flashcards</h3>
                        <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-lg">
                            Let AI turn your screenshots into exam-ready **Flashcards** and **Mind Maps**. Study smarter, not harder.
                        </p>
                    </div>

                    <div className="feature-card glass-card p-8 sm:p-10 bg-white/80 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 hover:border-indigo-500 transition-all duration-500 group shadow-lg">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-indigo-600 flex items-center justify-center mb-10 shadow-2xl group-hover:scale-110 transition-transform">
                            <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black mb-6 text-slate-900 dark:text-white">Group Study</h3>
                        <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-lg">
                            Create **Study Rooms**. Share your files and screenshots with friends instantly. Sync folders across devices.
                        </p>
                    </div>
                </div>
            </section>




            {/* --- Blog / Knowledge Base (AdSense Content) --- */}
            <ContentDiscovery />

            {/* --- NOTION INTEGRATION SECTION --- */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="max-w-7xl mx-auto backdrop-blur-3xl bg-white/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/5 rounded-[3rem] p-8 md:p-16 relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center gap-12">
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-200/50 dark:bg-white/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

                    <div className="flex-1 text-left z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center shadow-lg">
                                <FileText className="w-5 h-5 text-white dark:text-black" />
                            </div>
                            <span className="font-bold text-lg tracking-wide uppercase">Notion Integration</span>
                        </div>

                        <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-6 leading-tight">
                            YOUR NOTES. <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-600 to-black dark:from-slate-400 dark:to-white">SYNCED INSTANTLY.</span>
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-zinc-400 mb-8 leading-relaxed max-w-lg">
                            Connect your workspace once. Export lecture summaries, flashcards, and screenshots directly into your Notion databases with a single click.
                        </p>
                        <Link to="/app" className="inline-flex items-center gap-3 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-105 transition-transform shadow-xl">
                            Try It Now <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Visual Mockup */}
                    <div className="flex-1 w-full max-w-md relative group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-zinc-800 dark:to-zinc-900 blur-2xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity" />
                        <div className="relative bg-white dark:bg-[#191919] border border-slate-200 dark:border-[#2f2f2f] rounded-2xl p-6 shadow-2xl transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            {/* Mock Notion UI */}
                            <div className="flex items-center gap-2 mb-4 text-slate-400 border-b border-slate-100 dark:border-white/5 pb-4">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                                <span className="ml-2 text-xs font-mono">Lecture Notes / CS50</span>
                            </div>
                            <div className="space-y-4">
                                <div className="h-8 w-3/4 bg-slate-100 dark:bg-zinc-800 rounded-md animate-pulse" />
                                <div className="h-32 w-full bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center">
                                    <span className="text-xs text-slate-400 font-mono">IMAGE BLOCK</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-4 w-full bg-slate-100 dark:bg-zinc-800 rounded-sm" />
                                    <div className="h-4 w-5/6 bg-slate-100 dark:bg-zinc-800 rounded-sm" />
                                    <div className="h-4 w-4/6 bg-slate-100 dark:bg-zinc-800 rounded-sm" />
                                </div>
                            </div>
                            {/* Floating "Exported" Badge */}
                            <div className="absolute -bottom-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg flex items-center gap-2 animate-bounce">
                                <CheckCircle className="w-4 h-4" /> EXPORTED
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- SHOWCASE --- */}
            <section id="intelligence" className="py-32 bg-slate-100 dark:bg-zinc-950 relative overflow-hidden transition-colors duration-500">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/5 blur-[150px]" />
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-24 sm:gap-40 items-center">
                    <div>
                        <h2 className="text-5xl md:text-[6rem] font-black text-slate-900 dark:text-white tracking-tighter leading-[0.8] mb-12">
                            ORGANIZE <br />EVERYTHING.
                        </h2>
                        <div className="flex items-center gap-6 mb-12">
                            <div className="flex -space-x-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-12 h-12 rounded-full border-4 border-white dark:border-zinc-950 bg-slate-300 dark:bg-zinc-800 flex items-center justify-center font-black text-[10px] text-slate-500">
                                        USR
                                    </div>
                                ))}
                            </div>
                            <div className="text-slate-500 font-bold uppercase tracking-widest text-sm">
                                <span className="text-blue-600">JOIN 10k+</span> STUDENTS
                            </div>
                        </div>
                        <p className="text-lg md:text-xl text-slate-600 dark:text-zinc-400 leading-relaxed font-light">
                            Say goodbye to messy desktops. Organize your YouTube lectures into custom **Folders & Files** with beautiful color coding.
                        </p>
                    </div>
                    <div className="parallax-mockup relative glass-card p-2 aspect-video bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 rotate-3 hover:rotate-0 transition-all duration-1000 shadow-2xl">
                        <div className="w-full h-full bg-slate-50 dark:bg-black rounded-3xl overflow-hidden relative border border-slate-100 dark:border-white/5">
                            <div className="absolute inset-x-8 top-12 bottom-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center group/pulse">
                                <GlobalIcon className="w-20 h-20 sm:w-32 sm:h-32 text-blue-500 opacity-20 group-hover:scale-125 transition-transform duration-1000" />
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- WHATSAPP COMMUNITY SECTION --- */}
            <section className="py-24 px-6 bg-gradient-to-b from-slate-100 to-white dark:from-zinc-950 dark:to-black relative overflow-hidden">
                <div className="max-w-5xl mx-auto backdrop-blur-3xl bg-white/30 dark:bg-zinc-900/30 border border-white/20 dark:border-white/5 rounded-[3rem] p-10 md:p-14 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/20 rounded-full blur-[100px] pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-16">
                        <div className="flex-1 text-center md:text-left">
                            <span className="inline-block px-4 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-bold text-xs tracking-widest uppercase mb-6 border border-green-500/20">
                                Official Community
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-6 leading-tight">
                                JOIN THE <br /><span className="text-green-500">WHATSAPP</span> CHANNEL.
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-zinc-400 mb-10 leading-relaxed font-medium">
                                Get exclusive study tips, feature updates, and connect with other top students. Don't miss out on free resources!
                            </p>
                            <a href="https://whatsapp.com/channel/0029VbCDD9sLtOj8BCcSuj1T" target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-green-500/30 hover:scale-105 transition-all">
                                <MessageCircle className="w-6 h-6" /> JOIN CHANNEL NOW
                            </a>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-3xl transform rotate-6 group-hover:rotate-12 transition-all duration-500" />
                            <div className="relative bg-white p-4 rounded-3xl shadow-xl transform group-hover:scale-105 transition-all duration-500">
                                <img src="/whatsapp-qr.png" alt="Scan to Join" className="w-56 h-56 object-contain rounded-2xl" />
                                <div className="mt-4 text-center font-bold text-slate-900 text-sm uppercase tracking-wider">
                                    Scan to Join
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* --- BROWSER EXTENSION SECTION --- */}
            <section className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-200 dark:border-white/5">
                <div className="bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 dark:from-zinc-900 dark:via-purple-900/10 dark:to-zinc-900 rounded-[3rem] p-10 md:p-14 relative overflow-hidden text-center">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/10 blur-[150px] pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] pointer-events-none" />

                    <span className="inline-block px-4 py-2 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs tracking-widest uppercase mb-6 border border-purple-500/20">
                        LectureSnap Sidekick
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-6 leading-none">
                        GET THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">BROWSER EXTENSION</span>
                    </h2>
                    <p className="text-xl text-slate-600 dark:text-zinc-400 mb-6 max-w-3xl mx-auto leading-relaxed">
                        Capture YouTube video frames instantly with <kbd className="px-2 py-1 bg-slate-200 dark:bg-white/10 rounded-lg font-mono text-sm">Shift+S</kbd>. Perfect for taking notes from online lectures without pausing.
                    </p>

                    {/* Feature Highlights */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
                            <Scan className="w-4 h-4 text-purple-500" />
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">One-Click Capture</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
                            <Layout className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">Side Panel Dashboard</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                            <Zap className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Keyboard Shortcuts</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                            <Cloud className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">Seamless Sync</span>
                        </div>
                    </div>

                    {/* Keyboard Shortcuts Display */}
                    <div className="flex flex-wrap items-center justify-center gap-6 mb-10 text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                            <kbd className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg font-mono font-bold shadow-lg">Shift + S</kbd>
                            <span>Capture Frame</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                            <kbd className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg font-mono font-bold shadow-lg">Alt + S</kbd>
                            <span>Quick Snap</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                            <kbd className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg font-mono font-bold shadow-lg">Ctrl + Shift + S</kbd>
                            <span>Toggle Panel</span>
                        </div>
                    </div>

                    {/* Version Badge */}
                    <div className="flex items-center justify-center gap-4 mb-10">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">Latest Version: v1.0</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
                            <Monitor className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">Chrome & Edge</span>
                        </div>
                    </div>

                    <a
                        href="/extension.zip"
                        download="LectureSnap-Extension.zip"
                        className="group inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-600/30 hover:scale-105 transition-all mb-16 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Download className="w-6 h-6 relative z-10" />
                        <span className="relative z-10">DOWNLOAD EXTENSION (LATEST)</span>
                    </a>

                    {/* How to Install Steps */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                        {/* Step 1 */}
                        <div className="bg-white dark:bg-black/40 p-6 rounded-3xl border border-slate-200 dark:border-white/5 relative group hover:-translate-y-2 transition-transform duration-300">
                            <div className="absolute -top-6 -left-6 w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center font-black text-xl shadow-xl">1</div>
                            <h3 className="text-xl font-bold mb-4 mt-2">Unzip & Prep</h3>
                            <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed mb-4">
                                Download the zip file and extract it to a folder. You'll see a folder named <code>LectureSnap-Extension</code>.
                            </p>
                            <div className="h-24 bg-slate-100 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center">
                                <Folder className="w-8 h-8 text-slate-400" />
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-white dark:bg-black/40 p-6 rounded-3xl border border-slate-200 dark:border-white/5 relative group hover:-translate-y-2 transition-transform duration-300">
                            <div className="absolute -top-6 -left-6 w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center font-black text-xl shadow-xl">2</div>
                            <h3 className="text-xl font-bold mb-4 mt-2">Open Extensions</h3>
                            <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed mb-4">
                                Go to <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded text-yellow-700 dark:text-yellow-500">chrome://extensions</code> in your browser bar and toggle <strong>Developer Mode</strong> on (top right).
                            </p>
                            <div className="h-24 bg-slate-100 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center">
                                <Monitor className="w-8 h-8 text-slate-400" />
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white dark:bg-black/40 p-6 rounded-3xl border border-slate-200 dark:border-white/5 relative group hover:-translate-y-2 transition-transform duration-300">
                            <div className="absolute -top-6 -left-6 w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center font-black text-xl shadow-xl">3</div>
                            <h3 className="text-xl font-bold mb-4 mt-2">Load Unpacked</h3>
                            <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed mb-4">
                                Click <strong>"Load Unpacked"</strong> and select the extracted folder. Pin the extension and you're ready!
                            </p>
                            <div className="h-24 bg-slate-100 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center">
                                <Upload className="w-8 h-8 text-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-40 text-center px-6 relative z-10">
                <h3 className="text-sm sm:text-xl font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.5em] mb-12">Ready to Ace your class?</h3>
                <h2 className="text-[clamp(3rem,15vw,15rem)] font-black tracking-tighter leading-none mb-20 text-gradient-vibrant animate-pulse">
                    GO PRO.
                </h2>
                <Link to="/app" className="inline-block px-10 sm:px-20 py-6 sm:py-10 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full font-black text-2xl sm:text-4xl shadow-[0_40px_100px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_100px_rgba(255,255,255,0.1)] hover:scale-110 active:scale-95 transition-all">
                    FREE DOWNLOAD
                </Link>
                <div className="mt-40 text-slate-500 font-bold tracking-[0.6em] uppercase text-[10px]">
                    DESIGNED FOR STUDENTS • BY STUDENTS • 2026
                </div>
            </section>

            <footer className="py-20 px-6 bg-white dark:bg-black border-t border-slate-200 dark:border-white/5 transition-colors duration-500">
                <div className="max-w-7xl mx-auto flex flex-col md:row justify-between items-center gap-16">
                    <div className="flex items-center gap-4">
                        <img src="/logo.png" alt="L" className="w-10 h-10 sm:w-12 sm:h-12" />
                        <span className="text-2xl sm:text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white">LECTURESNAP</span>
                    </div>

                    <div className="flex gap-8 sm:gap-12 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-zinc-500">
                        <Link to="/privacy" className="hover:text-blue-500 transition-colors">Privacy</Link>
                        <Link to="/terms" className="hover:text-blue-500 transition-colors">Terms</Link>
                        <Link to="/support" className="hover:text-blue-500 transition-colors">Support</Link>
                    </div>

                    <div className="flex gap-4 sm:gap-6">
                        <Link to="#" className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:bg-slate-100 transition-all shadow-sm"><Github className="w-5 h-5 text-slate-600 dark:text-zinc-400" /></Link>
                        <Link to="#" className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:bg-slate-100 transition-all shadow-sm"><MousePointer2 className="w-5 h-5 text-slate-600 dark:text-zinc-400" /></Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
