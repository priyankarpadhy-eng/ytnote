import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Camera, Trash2, Save, X, Plus, Clock, Monitor, Folder } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNoteStore } from '../hooks/useNoteStore';
import { formatTime, cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { SidebarBreakModal } from '../components/SidebarBreakModal';
import { rewardUserCredits } from '../lib/credit-manager';
import { useLocalStorage } from '../hooks/useLocalStorage';
{/* --- Footer Controls --- */ }

export default function ExtensionSidebar() {
    const [noteText, setNoteText] = useState("");
    const [lastCapture, setLastCapture] = useState(null);
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const {
        addNote, notes, activeFolderId, setActiveFolderId,
        activeFileId, setActiveFileId, folders, files, updateNote, incrementStudyTime
    } = useNoteStore();
    const { currentUser } = useAuth();
    const latestNoteRef = useRef(null);

    // Break/Hydration Logic (40 min for production)
    const BREAK_INTERVAL = 40 * 60 * 1000; // 40 MINUTES
    const [lastBreakTime, setLastBreakTime] = useLocalStorage('lecturesnap-last-break', Date.now());
    const [isBreakOpen, setIsBreakOpen] = useState(false);

    // Memoized sorted notes with safety checks
    const recentNotes = useMemo(() => {
        return [...(notes || [])].sort((a, b) => {
            if (a.timestamp && b.timestamp) return b.timestamp - a.timestamp;
            return String(b.id || '').localeCompare(String(a.id || ''));
        }).slice(0, 20);
    }, [notes]);

    const [lastCaptureId, setLastCaptureId] = useState(null);

    // Cross-window sync for location changes
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'lecturesnap-active-folder') {
                // Another window changed the folder - refresh from localStorage
                const newFolderId = JSON.parse(e.newValue);
                if (newFolderId !== activeFolderId) {
                    setActiveFolderId(newFolderId);
                }
            }
            if (e.key === 'lecturesnap-active-file') {
                const newFileId = JSON.parse(e.newValue);
                if (newFileId !== activeFileId) {
                    setActiveFileId(newFileId);
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [activeFolderId, activeFileId, setActiveFolderId, setActiveFileId]);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && event.data.type === "EXTENSION_CAPTURE") {
                const { data: image, timestamp, captureId } = event.data;

                // Block captures if break is needed
                const timeSinceLastBreak = Date.now() - lastBreakTime;
                if (timeSinceLastBreak > BREAK_INTERVAL) {
                    setIsBreakOpen(true);
                    return;
                }

                // Deduplicate if we just saw this ID
                if (captureId && captureId === lastCaptureId) return;

                handleNewCapture(image, timestamp, captureId);
                setLastCaptureId(captureId);
            }

            // Sync location from parent window (dashboard)
            if (event.data && event.data.type === "SYNC_LOCATION") {
                if (event.data.folderId) setActiveFolderId(event.data.folderId);
                if (event.data.fileId !== undefined) setActiveFileId(event.data.fileId);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [lastCaptureId, lastBreakTime]);

    // Timer check for idle users
    useEffect(() => {
        const interval = setInterval(() => {
            const timeSinceLastBreak = Date.now() - lastBreakTime;
            if (timeSinceLastBreak > BREAK_INTERVAL && !isBreakOpen) {
                setIsBreakOpen(true);
            }
            // Increment study time by 30s every heartbeat
            incrementStudyTime(30);
        }, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [lastBreakTime, isBreakOpen, incrementStudyTime]);

    const handleNewCapture = (image, timestamp, captureId) => {
        // Use extension's captureId if available, fallback for safety
        const newNoteId = captureId || `sidebar-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        const newNote = {
            id: newNoteId,
            timestamp: timestamp || 0,
            formattedTime: formatTime(timestamp || 0),
            thumbnail: image,
            text: '',
            folderId: activeFolderId || 'default',
            fileId: activeFileId || null
        };

        // Add to store
        addNote(newNote);

        // Update local preview
        setLastCapture(newNote);
        setNoteText("");
    };

    const handleSaveNote = () => {
        if (lastCapture && noteText) {
            updateNote(lastCapture.id, { text: noteText });
        }
        // Maybe show toast?
    };

    return (
        <div className="h-screen bg-gray-50 dark:bg-[#121212] flex flex-col text-gray-900 dark:text-gray-100 overflow-hidden">

            <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#1a1a1a] shrink-0">
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <img src="/logo.png" className="w-6 h-6 rounded-full" />
                    <span className="font-bold text-sm">LectureSnap</span>
                </Link>

                <button
                    onClick={() => setIsLocationPickerOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-blue-500/30 transition-all text-left max-w-[140px]"
                >
                    <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-[10px] font-black truncate text-gray-600 dark:text-gray-300 uppercase tracking-tight">
                        {(files || []).find(f => f.id === activeFileId)?.name || (folders || []).find(f => f.id === activeFolderId)?.name || 'General'}
                    </span>
                </button>
            </div>

            {/* --- Main Active Capture --- */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

                {lastCapture ? (
                    <div className="w-full">
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-300 dark:border-white/20 shadow-lg mb-3 group">
                            <img src={lastCapture.thumbnail} className="w-full h-full object-contain" />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1 bg-red-600 text-white rounded shadow" title="Delete">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <textarea
                                className="w-full p-2 text-sm bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg resize-none focus:ring-2 ring-blue-500 outline-none transition-all placeholder:text-gray-400"
                                rows={3}
                                placeholder="Add a note to this snap..."
                                value={noteText}
                                onChange={(e) => {
                                    setNoteText(e.target.value);
                                    handleSaveNote(); // Auto-save logic effectively
                                    // Debounce could be better but this is fine for now
                                    updateNote(lastCapture.id, { text: e.target.value });
                                }}
                            />
                            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                                <span>{lastCapture.formattedTime}</span>
                                <span className="text-green-500 flex items-center gap-1"><Save className="w-3 h-3" /> Saved</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400 opacity-60">
                        <Monitor className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
                        <h3 className="font-bold text-sm mb-1">Ready to Capture</h3>
                        <p className="text-xs">Press <b>Alt+S</b> or <b>Ctrl+Shift+S</b> to snap a slide.</p>
                    </div>
                )}

                {/* --- Recent History Grid --- */}
                {recentNotes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/5">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Snaps</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {recentNotes.map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => {
                                        setLastCapture(note);
                                        setNoteText(note.text || "");
                                    }}
                                    className={cn(
                                        "relative aspect-video rounded bg-gray-200 dark:bg-white/5 overflow-hidden border cursor-pointer hover:opacity-80 transition-all",
                                        lastCapture?.id === note.id ? "ring-2 ring-blue-500 border-transparent" : "border-transparent"
                                    )}
                                >
                                    {note.thumbnail ? (
                                        <img src={note.thumbnail} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs">Note</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>




            <div className="p-3 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-white/10 flex gap-2">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
                    onClick={() => {
                        // Manual Trigger
                        // Since we are in iframe, we can't directly capture parent tab pixels easily without extension help.
                        // But we CAN ask extension background to do it.
                        // However, standard web-page sending message to extension is:
                        // window.postMessage({ type: "EXTENSION_RequestCapture" }, "*") -> content script hears -> background -> capture
                        // Wait, our Content Script listens to:
                        // chrome.runtime.onMessage from background
                        // AND window 'message' event?
                        // Let's rely on the shortcut for now or assume the user uses the extension popup/shortcut?
                        // The User wants "show only active screenshot".
                        // Let's give a button that *simulates* a snap if possible, but actually 
                        // the easiest way is asking the user to press the key.
                        // BUT, we can try to communicate with parent window.
                        alert("Please use Alt+S or the Extension Icon to snap!");
                    }}
                >
                    <Camera className="w-4 h-4" />
                    Snap Slide
                </button>
            </div>

            {isLocationPickerOpen && (
                <LocationPickerModal
                    isOpen={isLocationPickerOpen}
                    onClose={() => setIsLocationPickerOpen(false)}
                    folders={folders}
                    files={files}
                    activeFolderId={activeFolderId}
                    activeFileId={activeFileId}
                    onSelectFile={(file) => {
                        setActiveFileId(file.id);
                        setActiveFolderId(file.folderId);
                        setIsLocationPickerOpen(false);
                    }}
                    onSelectFolder={id => {
                        setActiveFileId(null);
                        setActiveFolderId(id);
                        setIsLocationPickerOpen(false);
                    }}
                />
            )}

            <SidebarBreakModal
                isOpen={isBreakOpen}
                onClose={() => {
                    setIsBreakOpen(false);
                    setLastBreakTime(Date.now());
                }}
                onReward={() => {
                    if (currentUser?.uid) rewardUserCredits(currentUser.uid, 1);
                }}
            />
        </div>
    );
}
