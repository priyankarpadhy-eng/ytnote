import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Link as LinkIcon, Image as ImageIcon, Save, FileText, Trash2, CheckCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { PdfExportOptionsModal } from '../components/PdfExportOptionsModal';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CapturePage() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('READY'); // READY, SCANNING, PAUSED, DONE, ERROR
    const [error, setError] = useState(null);
    const [snaps, setSnaps] = useState([]);

    // Local Session State
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStatus, setScanStatus] = useState('');
    const [scannedImages, setScannedImages] = useState([]); // { url, ts, phash, diff }

    // UI State
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const [showFloatingStatus, setShowFloatingStatus] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

    // Permission Modal State
    const [showPermissionModal, setShowPermissionModal] = useState(!localStorage.getItem('permission_explained'));

    const bottomRef = useRef(null);
    const autoScrollRef = useRef(true);

    // Sync Ref
    useEffect(() => { autoScrollRef.current = autoScrollEnabled; }, [autoScrollEnabled]);

    // Load Saved Snaps
    useEffect(() => {
        const q = query(collection(db, 'snaps'), orderBy('createdAt', 'desc'), limit(20));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSnaps(data);
        });

        // Scroll Listener
        const handleScroll = () => {
            setShowFloatingStatus(window.scrollY > 100);
        };
        window.addEventListener('scroll', handleScroll);
        return () => {
            unsubscribe();
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const handleDismissPermissionMatches = () => {
        localStorage.setItem('permission_explained', 'true');
        setShowPermissionModal(false);
    }

    const handleScan = async () => {
        if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
            setError('Please enter a valid YouTube URL');
            return;
        }

        setLoading(true);
        setStatus('SCANNING');
        setError(null);
        setScannedImages([]); // Clear previous local session
        setScanProgress(0);

        try {
            // STEP 1: PROBE METADATA
            setScanStatus("Probing video metadata...");
            const metaRes = await fetch(`${API_BASE}/meta?url=${encodeURIComponent(url)}`);
            if (!metaRes.ok) throw new Error("Failed to get video duration");
            const { duration, interval } = await metaRes.json();

            console.log(`Duration: ${duration}s, Suggested Interval: ${interval}s`);

            // ETA Helper
            let startTime = Date.now();
            const formatTime = (s) => {
                if (!s || s < 0) return "0:00";
                const m = Math.floor(s / 60);
                const sec = Math.floor(s % 60);
                return `${m}:${sec.toString().padStart(2, '0')}`;
            };

            // STEP 2: DETERMINE WORKERS
            // Scaling Logic:
            // > 20 mins: 4 Workers (Maximum Parallelism)
            // > 5 mins: 2 Workers
            // < 5 mins: 1 Worker
            let numWorkers = 1;
            if (duration > 1200) numWorkers = 4;
            else if (duration > 300) numWorkers = 2;

            const chunkDuration = Math.ceil(duration / numWorkers);

            console.log(`Starting ${numWorkers} parallel scan workers. Chunk size: ${chunkDuration}s`);
            setScanStatus(`Starting ${numWorkers} parallel scanners...`);

            // Worker State Tracking
            let activeWorkers = numWorkers;
            const workerProgress = new Array(numWorkers).fill(0);
            const connections = [];

            // STEP 3: LAUNCH WORKERS
            for (let i = 0; i < numWorkers; i++) {
                const start = i * chunkDuration;
                const end = Math.min((i + 1) * chunkDuration, duration);
                const scanUrl = `${API_BASE}/scan?url=${encodeURIComponent(url)}&start=${start}&end=${end}`;

                console.log(`Worker ${i}: ${start}-${end}s`);
                const es = new EventSource(scanUrl);
                connections.push(es);

                es.onopen = () => {
                    console.log(`Worker ${i} connected.`);
                    if (i === 0) startTime = Date.now();
                };

                es.onmessage = (event) => {
                    const data = JSON.parse(event.data);

                    if (data.error) {
                        console.error(`Worker ${i} error:`, data.error);
                        es.close();
                        setError(data.error);
                        setLoading(false);
                        setStatus('ERROR');
                        connections.forEach(c => c.close());
                        return;
                    }

                    // Progress or Image Update
                    if (data.type === 'progress' || data.type === 'image') {
                        workerProgress[i] = data.progress;

                        // Calculate Total Progress across all workers
                        const totalProgress = workerProgress.reduce((a, b) => a + b, 0) / numWorkers;
                        setScanProgress(totalProgress);

                        // ETA Calc
                        let etaString = '';
                        if (totalProgress > 1 && totalProgress < 100) {
                            const elapsed = (Date.now() - startTime) / 1000;
                            const rate = totalProgress / elapsed; // percent per second
                            const remainingPercent = 100 - totalProgress;
                            const remainingSeconds = remainingPercent / rate;
                            etaString = ` • ETA: ~${formatTime(remainingSeconds)}`;
                        }

                        if (data.type === 'progress') {
                            setScanStatus(`Scanning... ${Math.round(totalProgress)}%${etaString}`);
                        } else {
                            // Image Found
                            setScanStatus(`Captured Slide at ${data.timestamp}s${etaString}`);

                            setScannedImages(prev => {
                                const newImg = {
                                    url: data.imageUrl,
                                    ts: data.timestamp,
                                    phash: data.phash,
                                    id: Date.now() + Math.random().toString()
                                };
                                return [...prev, newImg].sort((a, b) => a.ts - b.ts);
                            });

                            if (autoScrollRef.current) {
                                setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 100);
                            }
                        }
                    }

                    if (data.type === 'done') {
                        console.log(`Worker ${i} finished.`);
                        es.close();
                        activeWorkers--;
                        workerProgress[i] = 100;

                        if (activeWorkers <= 0) {
                            setScanStatus(`Scan Complete! All segments finished.`);
                            setStatus('DONE');
                            setLoading(false);
                            setScanProgress(100);
                        }
                    }
                };

                es.onerror = (err) => {
                    if (es.readyState === EventSource.CLOSED) {
                        // Normal close
                    } else {
                        // Error - but we let browser retry logic handle minor bumps
                        console.warn(`Worker ${i} connection hiccup`, err);
                    }
                };
            }

        } catch (e) {
            console.error(e);
            setError(e.message);
            setLoading(false);
            setStatus('ERROR');
        }
    };

    // AI Smart Clean (Local Version) - IMPROVED
    const handleLocalDedupe = async () => {
        if (!confirm('Run Smart Unobstruct & Clean? This will remove duplicates and try to keep only the clearest board views.')) return;
        setLoading(true);

        const getHammingDistance = (h1, h2) => {
            if (!h1 || !h2 || h1.length !== h2.length) return 100;
            let dist = 0;
            for (let i = 0; i < h1.length; i++) if (h1[i] !== h2[i]) dist++;
            return dist;
        };

        setScannedImages(prev => {
            if (prev.length === 0) return prev;

            const sorted = [...prev].sort((a, b) => a.ts - b.ts);
            const unique = [];

            if (sorted.length > 0) unique.push(sorted[0]);

            let lastKept = sorted[0];
            let removedCount = 0;

            for (let i = 1; i < sorted.length; i++) {
                const current = sorted[i];
                const dist = getHammingDistance(lastKept.phash, current.phash);
                const timeDiff = current.ts - lastKept.ts;

                // LOGIC:
                // 1. IS DUPLICATE? (Hamming Dist < 12)
                if (dist <= 12) {
                    // SMART UNOBSTRUCT:
                    // If duplicate, pick the "cleaner" image (smaller file size usually means fewer people/objects)
                    // Compare file sizes (base64 length).
                    if (current.url.length < lastKept.url.length) {
                        // Current is cleaner! Swap it.
                        unique.pop();
                        unique.push(current);
                        lastKept = current; // Update reference
                        console.log(`Smart Unobstruct: Swapped for cleaner view at ${current.ts}s`);
                    } else {
                        // Last kept was cleaner. Ignore current.
                        console.log(`Smart Unobstruct: Ignored obstructed view at ${current.ts}s`);
                    }
                    removedCount++;
                }
                // 2. BURST FILTER (Time < 1s)
                else if (timeDiff < 1) {
                    removedCount++;
                }
                // 3. NEW UNIQUE SLIDE
                else {
                    unique.push(current);
                    lastKept = current;
                }
            }
            console.log(`AI Clean: Optimized ${removedCount} slides.`);
            return unique;
        });

        setLoading(false);
    };

    // Remove specific image
    const handleRemoveImage = (indexToRemove) => {
        setScannedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    // Save to Cloud
    const handleSaveToCloud = async () => {
        if (scannedImages.length === 0) return;
        if (!confirm(`Upload ${scannedImages.length} images to Cloud Gallery?`)) return;

        setLoading(true);
        try {
            const { uploadToR2 } = await import("../lib/r2");
            const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
            const { db } = await import("../lib/firebase");

            let count = 0;
            for (const img of scannedImages) {
                // Upload base64 to R2
                const filename = `snaps/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                const publicUrl = await uploadToR2(img.url, filename);

                // Save to Firestore
                await addDoc(collection(db, 'snaps'), {
                    url,
                    imageUrl: publicUrl,
                    phash: img.phash || '',
                    title: `Slide at ${img.ts}s`,
                    timestamp: { seconds: img.ts },
                    createdAt: serverTimestamp(),
                    category: 'Scan'
                });
                count++;
            }
            alert(`Saved ${count} slides to Cloud Gallery!`);
            setScannedImages([]); // Clear local
        } catch (e) {
            console.error(e);
            alert("Upload failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async (layout) => {
        setIsPdfModalOpen(false);
        if (scannedImages.length === 0) return;

        setLoading(true);
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10;
            const usableWidth = pageWidth - (margin * 2);

            // --- 1. PROMO PAGE (First Page) ---
            doc.setFillColor(0, 0, 0); // Black Background
            doc.rect(0, 0, pageWidth, pageHeight, 'F');

            doc.setTextColor(255, 255, 255); // White Text
            doc.setFont("helvetica", "bold");
            doc.setFontSize(40);
            doc.text("LECTURESNAP", pageWidth / 2, pageHeight / 3, { align: 'center' });

            doc.setFontSize(16);
            doc.setTextColor(250, 204, 21); // Yellow-400 equivalent
            doc.text("Your AI-Powered Knowledge Capture Tool", pageWidth / 2, (pageHeight / 3) + 20, { align: 'center' });

            doc.setFontSize(12);
            doc.setTextColor(200, 200, 200);
            doc.text("https://lecturesnap.online/", pageWidth / 2, (pageHeight / 3) + 40, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

            // Start Content on Page 2
            doc.addPage();
            doc.setFillColor(255, 255, 255); // Reset Fill
            doc.rect(0, 0, pageWidth, pageHeight, 'F'); // Ensure white background

            // --- 2. CONTENT PAGES ---
            const sortedImages = [...scannedImages].sort((a, b) => a.ts - b.ts);

            // Layout Logic (Maintain 16:9 Aspect Ratio)
            const imgRatio = 16 / 9;
            const imgHeight = usableWidth / imgRatio;

            for (let i = 0; i < sortedImages.length; i++) {
                const img = sortedImages[i];

                // Add Page Logic
                // i=0 is on Page 2 (created above).
                if (i > 0) {
                    if (layout === 'single') doc.addPage();
                    else if (layout === 'double' && i % 2 === 0) doc.addPage();
                }

                // --- 3. WATERMARK (Per Page) ---
                // Draw if this is the start of a "page unit"
                const isNewPageContext = (layout === 'single') || (i === 0) || (layout === 'double' && i % 2 === 0);

                if (isNewPageContext) {
                    // Reset to white bg just in case
                    // Draw Watermark
                    doc.saveGraphicsState();
                    doc.setTextColor(240, 240, 240); // Very light gray (almost invisible)
                    doc.setFontSize(50);
                    doc.setFont("helvetica", "bold");
                    // Diagonal Center Watermark (approx 45 deg)
                    // jsPDF text rotation: doc.text(text, x, y, { angle: 45 })
                    doc.text("LectureSnap", pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
                    doc.restoreGraphicsState();
                }

                // --- IMAGE CONTENT ---
                doc.setTextColor(0, 0, 0);
                doc.setFont("courier", "normal");

                // Y Position
                let yPos = margin + 20;
                if (layout === 'double' && i % 2 !== 0) {
                    yPos = margin + 20 + imgHeight + 20;
                }

                // Header
                doc.setFontSize(10);
                doc.text(`Slide ${i + 1} (${img.ts}s)`, margin, yPos - 5);

                // Image
                doc.addImage(img.url, 'JPEG', margin, yPos, usableWidth, imgHeight);

                // Notes (Single)
                if (layout === 'single') {
                    doc.setFontSize(12);
                    doc.setFont("helvetica", "bold");
                    doc.text("Notes:", margin, yPos + imgHeight + 10);

                    doc.setDrawColor(200, 200, 200);
                    doc.line(margin, yPos + imgHeight + 20, pageWidth - margin, yPos + imgHeight + 20);
                    doc.line(margin, yPos + imgHeight + 30, pageWidth - margin, yPos + imgHeight + 30);
                    doc.line(margin, yPos + imgHeight + 40, pageWidth - margin, yPos + imgHeight + 40);
                }
            }

            doc.save(`LectureSnap_${Date.now()}.pdf`);

        } catch (e) {
            console.error(e);
            alert("PDF generation failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f0f0f0] text-black font-mono flex flex-col items-center py-10 px-4">

            {/* PERMISSION EXPLAINER MODAL (Simple Words) */}
            {showPermissionModal && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white border-4 border-black shadow-[16px_16px_0px_0px_#FACC15] max-w-lg w-full p-8 relative">
                        <h3 className="text-2xl font-black uppercase mb-4 flex items-center gap-2">
                            🛡️ Security Alert?
                        </h3>
                        <p className="font-bold text-lg mb-4">
                            Did you see a <span className="text-blue-600 bg-blue-100 px-1">"Network Access"</span> or Firewall popup?
                        </p>
                        <div className="bg-gray-100 p-4 border-l-4 border-black mb-6 text-sm space-y-2">
                            <p><strong>Don't Worry! It's Safe.</strong></p>
                            <p>This app runs a <span className="font-bold">smart video scanner</span> directly on your computer (not in the cloud) for maximum privacy and speed.</p>
                            <p>Windows just wants to check if it's okay for the scanner to send screenshots to this window.</p>
                        </div>
                        <p className="font-bold mb-6 text-center">
                            Please click <span className="bg-black text-white px-2 py-1 mx-1">Allow Access</span> if asked!
                        </p>
                        <button
                            onClick={handleDismissPermissionMatches}
                            className="w-full bg-[#FACC15] hover:bg-[#EAB308] text-black font-black text-xl py-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                        >
                            OK, I UNDERSTAND
                        </button>
                    </div>
                </div>
            )}

            <PdfExportOptionsModal
                isOpen={isPdfModalOpen}
                onClose={() => setIsPdfModalOpen(false)}
                onConfirm={handleDownloadPDF}
                action="download"
            />

            {/* Header */}
            <div className="w-full max-w-5xl flex justify-between items-center mb-12 border-b-4 border-black pb-6">
                <Link to="/app" className="flex items-center gap-2 font-black text-xl hover:translate-x-1 transition-transform">
                    <ArrowLeft className="w-6 h-6 border-2 border-black rounded-full p-0.5" /> BACK TO APP
                </Link>
                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => setShowPermissionModal(true)}
                        className="text-xs font-bold underline text-gray-500 hover:text-black"
                    >
                        Why "Network Access"?
                    </button>
                    <h1 className="text-4xl font-black bg-black text-white px-4 py-1 skew-x-[-10deg]">
                        LECTURE<span className="text-yellow-400">SNAP</span>
                    </h1>
                </div>
            </div>

            {/* Input Section */}
            <div className="w-full max-w-3xl mb-16 relative">
                <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 flex flex-col gap-6 relative z-10">
                    <label className="font-black text-xl uppercase flex items-center gap-2">
                        <LinkIcon className="w-6 h-6" /> YouTube URL
                    </label>
                    <div className="flex gap-0">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="flex-1 bg-gray-100 border-4 border-black p-4 font-bold text-lg focus:outline-none focus:bg-yellow-50 placeholder:text-gray-400"
                            disabled={loading}
                        />
                        <button
                            onClick={handleScan}
                            disabled={loading}
                            className={`px-8 font-black text-xl text-white border-y-4 border-r-4 border-black transition-all active:translate-y-1 active:shadow-none
                            ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#FF3333] hover:bg-[#ff0000]'}
                            `}
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'SCAN VIDEO'}
                        </button>
                    </div>

                    {status === 'SCANNING' && (
                        <div className="w-full">
                            <div className="flex justify-between font-bold text-xs uppercase mb-1">
                                <span>Progress</span>
                                <span>{Math.round(scanProgress)}%</span>
                            </div>
                            <div className="w-full h-8 border-4 border-black bg-gray-200 relative">
                                <div className="h-full bg-yellow-400 transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
                                <div className="absolute inset-0 w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)]"></div>
                            </div>
                            <div className="mt-2 font-mono text-sm font-bold text-center animate-pulse">{scanStatus}</div>
                        </div>
                    )}
                    {error && <div className="bg-red-100 border-2 border-red-500 text-red-600 font-bold p-3 text-sm">ERROR: {error}</div>}
                </div>
                <div className="absolute top-4 left-4 w-full h-full border-4 border-black bg-yellow-400 z-0 content-['']"></div>
            </div>

            {/* LIVE LOCAL SESSION */}
            {scannedImages.length > 0 && (
                <div className="w-full max-w-6xl mb-16 animate-in slide-in-from-bottom-5 fade-in duration-500">
                    <div className="flex items-center justify-between mb-8 bg-black text-white p-4 border-4 border-yellow-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <h2 className="text-2xl font-black uppercase">Live Session ({scannedImages.length})</h2>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={handleLocalDedupe} className="bg-yellow-400 text-black px-4 py-2 font-black uppercase hover:bg-white transition-colors flex items-center gap-2">
                                ✨ AI Clean
                            </button>
                            <button onClick={() => setIsPdfModalOpen(true)} className="bg-white text-black px-4 py-2 font-black uppercase hover:bg-gray-200 transition-colors flex items-center gap-2">
                                <FileText className="w-4 h-4" /> PDF
                            </button>
                            <button onClick={handleSaveToCloud} className="bg-green-500 text-white px-4 py-2 font-black uppercase hover:bg-green-600 transition-colors flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save to Cloud
                            </button>
                            <button onClick={() => setScannedImages([])} className="bg-red-500 text-white px-4 py-2 font-black uppercase hover:bg-red-600 transition-colors flex items-center gap-2">
                                <Trash2 className="w-4 h-4" /> Clear Session
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" ref={bottomRef}>
                        {scannedImages.map((img, idx) => (
                            <div key={idx} className="group relative bg-white border-4 border-black p-2 shadow-lg">
                                <div className="relative aspect-video bg-gray-100 mb-2 border-2 border-black group-hover:border-yellow-400 transition-colors">
                                    <img src={img.url} className="w-full h-full object-cover" />
                                    <div className="absolute top-2 right-2 bg-black text-white font-bold px-2 text-xs">
                                        {img.ts}s
                                    </div>
                                    {/* DELETE BUTTON */}
                                    <button
                                        onClick={() => handleRemoveImage(idx)}
                                        className="absolute -top-3 -right-3 bg-red-500 text-white w-8 h-8 flex items-center justify-center border-2 border-black opacity-0 group-hover:opacity-100 hover:scale-110 transition-all font-black z-20 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                    >
                                        X
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SAVED SNAPS */}
            <div className="w-full max-w-6xl opacity-70 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-4 mb-8">
                    <CheckCircle className="w-8 h-8 text-black" />
                    <h2 className="text-3xl font-black uppercase">Saved Library</h2>
                    <div className="h-1 bg-black flex-1"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {snaps.map((snap) => (
                        <div key={snap.id} className="group relative bg-white border-4 border-gray-300 hover:border-black transition-all">
                            <div className="aspect-video bg-gray-100 overflow-hidden">
                                <img src={snap.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                            </div>
                            <div className="p-2 text-xs font-mono font-bold text-gray-500 group-hover:text-black">
                                {snap.title}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FLOATING STATUS BAR */}
            {status === 'SCANNING' && showFloatingStatus && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-black text-yellow-400 border-4 border-yellow-400 p-4 shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs font-black uppercase mb-1">
                                <span className="truncate">{scanStatus}</span>
                                <span>{Math.round(scanProgress)}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-400 transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
                            </div>
                        </div>
                        <div className="w-0.5 h-8 bg-yellow-400 opacity-30"></div>
                        <div className="flex items-center gap-3 shrink-0">
                            <label className="flex items-center gap-2 cursor-pointer select-none group">
                                <div className="relative">
                                    <input type="checkbox" checked={autoScrollEnabled} onChange={(e) => setAutoScrollEnabled(e.target.checked)} className="peer sr-only" />
                                    <div className="w-6 h-6 border-2 border-yellow-400 bg-black peer-checked:bg-yellow-400 transition-colors"></div>
                                    <svg className="w-4 h-4 text-black absolute top-1 left-1 opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <span className="font-bold text-sm uppercase group-hover:text-white transition-colors">Auto-Scroll</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .animate-marquee { animation: marquee 10s linear infinite; }
                @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
            `}</style>
        </div>
    );
}
