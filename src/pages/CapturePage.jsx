import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, Link as LinkIcon, Save, FileText, Trash2,
    CheckCircle, Zap, Loader, X, MoreVertical, LayoutGrid, Image
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { PdfExportOptionsModal } from '../components/PdfExportOptionsModal';

// --- CONFIG ---
// Allow swapping backend URL for Railway
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function CapturePage() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('READY'); // READY, SCANNING, PAUSED, DONE, ERROR
    const [error, setError] = useState(null);
    const [snaps, setSnaps] = useState([]);

    // Local Session State
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStatus, setScanStatus] = useState('');
    const [scannedImages, setScannedImages] = useState([]); // { url, ts, phash, id }

    // UI State
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [showFloatingStatus, setShowFloatingStatus] = useState(false);
    const [hasExtension, setHasExtension] = useState(false);
    const [scanMethod, setScanMethod] = useState('cloud'); // cloud or extension

    const bottomRef = useRef(null);
    const autoScrollRef = useRef(true);

    // Sync Ref
    useEffect(() => { autoScrollRef.current = autoScrollEnabled; }, [autoScrollEnabled]);

    // Extension Check
    useEffect(() => {
        const checkExtension = () => {
            window.postMessage({ type: "LECTURESNAP_PING" }, "*");
        };
        const handleMessage = (event) => {
            if (event.data.type === "LECTURESNAP_PONG") {
                setHasExtension(true);
                setScanMethod('extension'); // Prefer extension if found
            }
        };
        window.addEventListener('message', handleMessage);
        checkExtension();
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Scroll Listener for Floating Status
    useEffect(() => {
        const handleScroll = () => {
            setShowFloatingStatus(window.scrollY > 100);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Load Saved Snaps
    useEffect(() => {
        const q = query(collection(db, 'snaps'), orderBy('createdAt', 'desc'), limit(20));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSnaps(data);
        });
        return () => unsubscribe();
    }, []);

    // --------------------------------------------------------------------------------
    // DEEP SCAN LOGIC (EXTENSION BASED)
    // --------------------------------------------------------------------------------
    const handleExtensionScan = async () => {
        setLoading(true);
        setStatus('SCANNING');
        setError(null);
        setScannedImages([]);
        setScanProgress(0);
        setScanStatus("Initializing Local Engine...");

        const waitForMessage = (type) => new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error(`Timeout waiting for ${type}`));
            }, 10000);

            const handler = (event) => {
                if (event.data.type === type) {
                    clearTimeout(timer);
                    window.removeEventListener('message', handler);
                    resolve(event.data);
                }
            };
            window.addEventListener('message', handler);
        });

        try {
            // STEP 1: INITIAL PROBE
            window.postMessage({ type: "LECTURESNAP_CAPTURE_REQUEST" }, "*");
            const initial = await waitForMessage("LECTURESNAP_CAPTURE_RESPONSE");
            const duration = initial.duration;
            const interval = duration > 1200 ? 20 : 10;

            setScanStatus(`Acquired video (${Math.floor(duration)}s). Starting deep scan...`);

            let currentTime = interval;
            while (currentTime < duration) {
                // Seek
                window.postMessage({ type: "LECTURESNAP_SEEK_REQUEST", timestamp: currentTime }, "*");
                await waitForMessage("LECTURESNAP_SEEK_DONE");

                // Capture
                window.postMessage({ type: "LECTURESNAP_CAPTURE_REQUEST" }, "*");
                const response = await waitForMessage("LECTURESNAP_CAPTURE_RESPONSE");

                setScannedImages(prev => {
                    const newImg = {
                        url: response.data,
                        ts: Math.round(currentTime),
                        id: Math.random().toString(36).substr(2, 9)
                    };
                    return [...prev, newImg];
                });

                const progress = Math.min(100, Math.round((currentTime / duration) * 100));
                setScanProgress(progress);
                setScanStatus(`Scanning... ${progress}%`);

                currentTime += interval;

                // Smart auto-scroll
                if (autoScrollRef.current) {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
            }

            setScanStatus("Deep Scan Completed");
            setStatus('DONE');
        } catch (e) {
            setError(`Extension Error: ${e.message}. Please ensure the YouTube video is open in another tab.`);
            setStatus('ERROR');
        } finally {
            setLoading(false);
        }
    };

    // --------------------------------------------------------------------------------
    // CLOUD SCAN LOGIC (BACKUP)
    // --------------------------------------------------------------------------------
    const handleScan = async () => {
        if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
            setError('Please enter a valid YouTube URL');
            return;
        }

        setLoading(true);
        setStatus('SCANNING');
        setError(null);
        setScannedImages([]);
        setScanProgress(0);

        try {
            setScanStatus("Connecting to Neural Engine...");
            const metaRes = await fetch(`${BACKEND_URL}/meta?url=${encodeURIComponent(url)}`);
            if (!metaRes.ok) throw new Error(`Cloud Engine Busy (502). Please use Deep Scan.`);
            const { duration, interval } = await metaRes.json();

            let numWorkers = duration > 1200 ? 4 : (duration > 300 ? 2 : 1);
            const chunkDuration = Math.ceil(duration / numWorkers);
            let activeWorkers = numWorkers;
            const workerProgress = new Array(numWorkers).fill(0);

            for (let i = 0; i < numWorkers; i++) {
                const start = i * chunkDuration;
                const end = Math.min((i + 1) * chunkDuration, duration);
                const es = new EventSource(`${BACKEND_URL}/scan?url=${encodeURIComponent(url)}&start=${start}&end=${end}`);

                es.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'progress' || data.type === 'image') {
                        workerProgress[i] = data.progress;
                        const total = workerProgress.reduce((a, b) => a + b, 0) / numWorkers;
                        setScanProgress(total);
                        if (data.type === 'image') {
                            setScannedImages(prev => [...prev, {
                                url: data.imageUrl,
                                ts: data.timestamp,
                                phash: data.phash,
                                id: Math.random().toString(36).substr(2, 9)
                            }].sort((a, b) => a.ts - b.ts));
                        }
                    }
                    if (data.type === 'done') {
                        es.close();
                        activeWorkers--;
                        if (activeWorkers <= 0) { setStatus('DONE'); setLoading(false); }
                    }
                };
            }
        } catch (e) {
            setError(e.message);
            setStatus('ERROR');
            setLoading(false);
        }
    };

    const runScan = () => {
        if (!url) { setError('Please enter a URL'); return; }
        if (scanMethod === 'extension') handleExtensionScan();
        else handleScan();
    };



    // --------------------------------------------------------------------------------
    // SMART TOOLS (AI Clean, Upload, PDF)
    // --------------------------------------------------------------------------------

    // AI Smart Clean (Unobstruct Logic)
    const handleLocalDedupe = async () => {
        if (!confirm('Run Smart Clean? This will remove duplicates and obstructed views.')) return;
        setLoading(true);

        const getHammingDistance = (h1, h2) => {
            if (!h1 || !h2) return 100;
            let dist = 0;
            for (let i = 0; i < 64; i++) if (h1[i] !== h2[i]) dist++;
            return dist;
        };

        setScannedImages(prev => {
            if (prev.length === 0) return prev;
            const sorted = [...prev].sort((a, b) => a.ts - b.ts);
            const unique = [];
            if (sorted.length > 0) unique.push(sorted[0]);
            let lastKept = sorted[0];

            for (let i = 1; i < sorted.length; i++) {
                const current = sorted[i];
                const dist = getHammingDistance(lastKept.phash, current.phash);
                const timeDiff = current.ts - lastKept.ts;

                if (dist <= 12) {
                    // Smart Unobstruct: Keep smaller file (cleaner view)
                    if (current.url.length < lastKept.url.length) {
                        unique.pop();
                        unique.push(current);
                        lastKept = current;
                    }
                } else if (timeDiff < 1) {
                    // Burst ignore
                } else {
                    unique.push(current);
                    lastKept = current;
                }
            }
            return unique;
        });
        setLoading(false);
    };

    const handleRemoveImage = (idToRemove) => {
        setScannedImages(prev => prev.filter(img => img.id !== idToRemove));
    };

    // Save to Cloud (Uses merged /upload endpoint)
    const handleSaveToCloud = async () => {
        if (scannedImages.length === 0) return;
        if (!confirm(`Save ${scannedImages.length} slides to cloud?`)) return;

        setLoading(true);
        try {
            let count = 0;
            for (const img of scannedImages) {
                // Determine filename
                const fileName = `snaps/${Date.now()}_${img.id}.jpg`;

                // Upload to Backend (which proxies to R2)
                const uploadRes = await fetch(`${BACKEND_URL}/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: img.url, fileName })
                });

                if (!uploadRes.ok) throw new Error("Upload failed");
                const { url: publicUrl } = await uploadRes.json();

                // Save Metadata to Firestore
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
            alert(`Saved ${count} slides!`);
            setScannedImages([]);
        } catch (e) {
            alert("Save failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // PDF Export
    const handleDownloadPDF = async (layout) => {
        setIsPdfModalOpen(false);
        if (scannedImages.length === 0) return;
        setLoading(true);
        try {
            // Dynamic import to prevent SSR issues
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10;
            const usableWidth = pageWidth - (2 * margin);

            // Cover Page
            doc.setFillColor(10, 10, 10);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(32);
            doc.text("LECTURESNAP", pageWidth / 2, pageHeight / 3, { align: 'center' });
            doc.setFontSize(14);
            doc.setTextColor(250, 204, 21); // Yellow
            doc.text("Your AI-Powered Knowledge Capture Tool", pageWidth / 2, pageHeight / 3 + 20, { align: 'center' });
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(10);
            doc.text("https://lecturesnap.online/", pageWidth / 2, pageHeight / 3 + 40, { align: 'center' });

            doc.addPage();

            // Content
            const sorted = [...scannedImages].sort((a, b) => a.ts - b.ts);
            const imgHeight = usableWidth / (16 / 9);

            for (let i = 0; i < sorted.length; i++) {
                const img = sorted[i];
                if (i > 0) {
                    if (layout === 'single') doc.addPage();
                    else if (layout === 'double' && i % 2 === 0) doc.addPage();
                }

                // Watermark per page context
                const isNewContext = (layout === 'single' || i === 0 || (layout === 'double' && i % 2 === 0));
                if (isNewContext) {
                    doc.saveGraphicsState();
                    doc.setTextColor(245, 245, 245);
                    doc.setFontSize(60);
                    doc.text("LectureSnap", pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
                    doc.restoreGraphicsState();
                }

                doc.setTextColor(0, 0, 0);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);

                let y = margin + 20;
                if (layout === 'double' && i % 2 !== 0) y = margin + 20 + imgHeight + 20;

                doc.text(`Slide ${i + 1} (${img.ts}s)`, margin, y - 5);
                doc.addImage(img.url, 'JPEG', margin, y, usableWidth, imgHeight);

                if (layout === 'single') {
                    doc.setFont("helvetica", "bold");
                    doc.text("Notes:", margin, y + imgHeight + 15);
                    doc.setDrawColor(220, 220, 220);
                    doc.line(margin, y + imgHeight + 25, pageWidth - margin, y + imgHeight + 25);
                    doc.line(margin, y + imgHeight + 35, pageWidth - margin, y + imgHeight + 35);
                }
            }
            doc.save('LectureSnap_Notes.pdf');
        } catch (e) {
            console.error(e);
            alert("PDF Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // --------------------------------------------------------------------------------
    // RENDER
    // --------------------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-yellow-200">
            <PdfExportOptionsModal
                isOpen={isPdfModalOpen}
                onClose={() => setIsPdfModalOpen(false)}
                onConfirm={handleDownloadPDF}
                action="download"
            />

            {/* NAVBAR */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <Link to="/app" className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                </Link>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-black rounded-lg transform -skew-x-12">
                        ls
                    </div>
                    <span className="font-bold text-xl tracking-tight">LectureSnap</span>
                </div>
                <div className="w-16"></div> {/* Spacer */}
            </nav>

            {/* HERO INPUT */}
            <div className="max-w-4xl mx-auto pt-16 pb-12 px-4 text-center">
                <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
                    Capture Knowledge.<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500">
                        Faster than real-time.
                    </span>
                </h1>

                <div className="relative group max-w-2xl mx-auto shadow-2xl shadow-yellow-500/20 rounded-2xl">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
                    <div className="relative flex items-center bg-white rounded-2xl p-2">
                        <LinkIcon className="w-5 h-5 text-gray-400 ml-4" />
                        <input
                            type="text"
                            className="w-full bg-transparent p-4 text-lg font-medium outline-none placeholder:text-gray-400"
                            placeholder="Paste YouTube Link..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                        <div className="flex flex-col gap-1 mr-2">
                            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border text-center whitespace-nowrap
                                ${hasExtension ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                {hasExtension ? 'SIDEKICK CONNECTED' : 'SIDEKICK DISCONNECTED'}
                            </div>
                            <select
                                value={scanMethod}
                                onChange={(e) => setScanMethod(e.target.value)}
                                className="text-[10px] font-black uppercase text-gray-500 outline-none cursor-pointer bg-transparent"
                            >
                                <option value="extension">Deep Scan (Local)</option>
                                <option value="cloud">Cloud Engine</option>
                            </select>
                        </div>
                        <button
                            onClick={runScan}
                            disabled={loading}
                            className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95
                                ${loading ? 'bg-gray-800 cursor-wait' : 'bg-black hover:bg-gray-900 hover:shadow-xl'}
                            `}
                        >
                            {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Scan'}
                        </button>
                    </div>
                </div>


                {/* PROGRESS BAR */}
                {status === 'SCANNING' && (
                    <div className="mt-8 max-w-lg mx-auto bg-white p-4 rounded-xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            <span>{scanStatus}</span>
                            <span>{Math.round(scanProgress)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300 ease-out"
                                style={{ width: `${scanProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 inline-flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-full text-sm font-medium">
                        <X className="w-4 h-4" /> {error}
                    </div>
                )}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="max-w-7xl mx-auto px-4 pb-32">

                {/* LIVE SESSION HEADER */}
                {scannedImages.length > 0 && (
                    <div className="flex items-end justify-between mb-8 border-b border-gray-200 pb-4 animate-in fade-in duration-500">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                Live Session
                                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-mono">
                                    {scannedImages.length}
                                </span>
                            </h2>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleLocalDedupe}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-700 transition-colors"
                            >
                                <Zap className="w-4 h-4" /> AI Clean
                            </button>
                            <button
                                onClick={() => setIsPdfModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                <FileText className="w-4 h-4" /> PDF
                            </button>
                            <button
                                onClick={handleSaveToCloud}
                                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 shadow-md transition-all"
                            >
                                <Save className="w-4 h-4" /> Save Cloud
                            </button>
                            <button
                                onClick={() => setScannedImages([])}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Clear Session"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* GRID */}
                {scannedImages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {scannedImages.map((img) => (
                            <div key={img.id} className="group relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                    <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="slide" />

                                    {/* Overlay Info */}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-between items-end">
                                        <span className="text-white text-xs font-mono font-medium">{img.ts}s</span>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleRemoveImage(img.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    !loading && (
                        <div className="text-center py-20 opacity-50">
                            <LayoutGrid className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-400">Ready to capture.</p>
                        </div>
                    )
                )}
            </div>

            {/* FLOATING STATUS BAR (Appears on Scroll) */}
            {status === 'SCANNING' && showFloatingStatus && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-white/90 backdrop-blur-md border border-gray-200 p-4 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            <span className="truncate">{scanStatus}</span>
                            <span>{Math.round(scanProgress)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
                        </div>
                    </div>
                    <div className="w-px h-8 bg-gray-200"></div>
                    <div className="flex items-center gap-3 shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer select-none group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={autoScrollEnabled}
                                    onChange={(e) => setAutoScrollEnabled(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <div className={`w-10 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
                            </div>
                            <span className="font-bold text-xs text-gray-500 uppercase">Auto-Scroll</span>
                        </label>
                    </div>
                </div>
            )}

            {/* SAVED SNAPS (BELOW) */}
            {snaps.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 border-t border-gray-200 pt-16 mt-16">
                    <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-8 flex items-center gap-4">
                        <CheckCircle className="w-5 h-5" /> Library Archive
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 opacity-70 hover:opacity-100 transition-opacity">
                        {snaps.map((snap) => (
                            <div key={snap.id} className="aspect-video bg-gray-200 rounded-lg overflow-hidden relative group">
                                <img src={snap.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-bold">{snap.title}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
