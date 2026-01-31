import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Download, Monitor, Moon, Sun, Video, ArrowLeft, Folder, Plus, ChevronDown, Check,
    LogIn, LogOut, Cloud, Menu, LayoutGrid, List as ListIcon, Trash2, Globe, Users,
    Hash, Share2, FileText, ChevronRight, Sparkles, MousePointer2, Move, Palette,
    CheckCircle2, X, Layout, Zap, MoreHorizontal, ExternalLink, FileDown, Brain, RefreshCw, CheckCircle, Layers, Camera
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Link } from 'react-router-dom';
import { useHotkeys } from '../hooks/useHotkeys';
import { NoteCard } from '../components/NoteCard';
import { cn, formatTime } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useNoteStore } from '../hooks/useNoteStore';
import { useActivePresence } from '../hooks/useActivePresence';
import { useStudyRooms } from '../hooks/useStudyRooms';
import { RoomManager, ShareDialog } from '../components/RoomManager';
import { TutorialProvider, useTutorial } from '../components/WalkthroughTutorial';
import { LocationPickerModal } from '../components/LocationPickerModal';
import { generateDHash, compareHashes, checkEdgeDensity } from '../lib/capture-engine';
import { ContentDiscovery } from '../components/ContentDiscovery';
import { AdBanner } from '../components/ads/AdBanner';
import { uploadToR2 } from '../lib/r2';
import { RewardedVideoGate } from '../components/ads/RewardedVideoGate';
import { AuthModal } from '../components/AuthModal';
import { SidebarBreakModal } from '../components/SidebarBreakModal';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { PdfExportOptionsModal } from '../components/PdfExportOptionsModal';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { consumeUserCredits, rewardUserCredits, CREDIT_COSTS } from '../lib/credit-manager';

function NoteAppContent() {
    // 1. ALL HOOKS AT THE TOP
    const { currentUser, logout, isEmailVerified } = useAuth();
    const {
        notes: storeNotes = [], folders: storeFolders = [], files: storeFiles = [], activeFolderId, activeFileId,
        localNotes = [], localFolders = [], localFiles = [],
        addNote: storeAddNote,
        updateNote: storeUpdateNote,
        deleteNote: storeDeleteNote,
        deleteLocalNote, deleteLocalFolder, deleteLocalFile,
        createFolder: storeCreateFolder,
        updateFolder: storeUpdateFolder,
        createFile: storeCreateFile,
        updateFile: storeUpdateFile,
        deleteFile: storeDeleteFile,
        setActiveFolderId,
        setActiveFileId,
        removeNoteImage,
        incrementStudyTime,
        loading,
        isCloud
    } = useNoteStore();
    const { isDarkMode, themeMode, setTheme, toggleTheme } = useTheme();
    const { triggerAction } = useTutorial();
    const { onlineCount } = useActivePresence();
    const {
        rooms, activeRoomId, setActiveRoomId, roomNotes, createRoom, joinRoom, deleteRoom, shareSpecificNotesToRoom
    } = useStudyRooms();

    // 2. ALL STATE DEFINITIONS
    const [userCredits, setUserCredits] = useState(0);
    const [isSavingToDrive, setIsSavingToDrive] = useState(false);
    const [snapStatus, setSnapStatus] = useState(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [streamActive, setStreamActive] = useState(false);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const [isAdGateOpen, setIsAdGateOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [isAutoCaptureOn, setIsAutoCaptureOn] = useState(false);
    const [lastScreenshotHash, setLastScreenshotHash] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [lasso, setLasso] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isRoomManagerOpen, setIsRoomManagerOpen] = useState(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
    const [shareInitialFolderId, setShareInitialFolderId] = useState('');
    const [folderContextMenu, setFolderContextMenu] = useState(null); // { x, y, folder }
    const [fileContextMenu, setFileContextMenu] = useState(null); // { x, y, file }
    const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const [pdfPreview, setPdfPreview] = useState(null);
    const [pdfExportOptions, setPdfExportOptions] = useState({ isOpen: false, scope: null, target: null, action: null });

    // 3. ALL REFS
    const autoTimerRef = useRef(null);
    const gridRef = useRef(null);
    const streamVideoRef = useRef(null);
    const streamRef = useRef(null);

    // 4. DERIVED / SAFE VALUES
    const notes = storeNotes || [];
    const folders = storeFolders || [];
    const files = storeFiles || [];

    // Study Time Heartbeat (Every 30s)
    useEffect(() => {
        if (!streamActive || isBreakModalOpen) return;
        const interval = setInterval(() => {
            incrementStudyTime(30);
            setSessionSeconds(prev => {
                const next = prev + 30;
                // 40 minutes = 2400 seconds
                if (next >= 2400) {
                    setIsBreakModalOpen(true);
                    return 0; // Reset session counter after showing modal
                }
                return next;
            });
        }, 30000);
        return () => clearInterval(interval);
    }, [streamActive, incrementStudyTime, isBreakModalOpen]);

    // 5. CALLBACKS (Ordered to avoid TDZ within themselves)
    const showToast = useCallback((message, type = 'success') => {
        setSnapStatus({ message, type });
        setTimeout(() => setSnapStatus(null), 3000);
    }, []);

    const addNote = useCallback(async (thumbnail = null, currentTime = 0, externalId = null) => {
        const deterministicId = externalId || `snap-${currentTime}-${thumbnail ? thumbnail.length : '0'}`;
        let targetFolderId = activeFolderId === 'all' ? 'default' : activeFolderId;
        let targetFileId = activeFileId || null;

        if (targetFileId) {
            const targetFile = (files || []).find(f => f.id === targetFileId);
            if (targetFile) targetFolderId = targetFile.folderId;
        }

        const newNote = {
            id: deterministicId,
            timestamp: currentTime,
            formattedTime: formatTime(currentTime),
            thumbnail: thumbnail,
            text: '',
            folderId: targetFolderId,
            fileId: targetFileId,
            storageStatus: 'local'
        };

        storeAddNote(newNote);
        setActiveNoteId(newNote.id);
    }, [activeFolderId, activeFileId, files, storeAddNote]);

    const manualSnap = useCallback(async () => {
        if (!streamVideoRef.current || isCapturing) return;
        setIsCapturing(true);
        try {
            const video = streamVideoRef.current;
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0);
            const imageUrl = canvas.toDataURL("image/jpeg", 0.9);
            await addNote(imageUrl, video.currentTime || 0);
            showToast("Snap saved!");
        } catch (err) {
            console.error(err);
            showToast("Snap failed", 'error');
        } finally {
            setIsCapturing(false);
        }
    }, [isCapturing, addNote, showToast]);

    const performAutoCapture = useCallback(async () => {
        if (!streamVideoRef.current || isCapturing || !isAutoCaptureOn) return;
        if (userCredits <= 0) {
            setIsAutoCaptureOn(false);
            showToast("Out of credits!", 'error');
            setIsAdGateOpen(true);
            return;
        }
        setIsCapturing(true);
        try {
            const video = streamVideoRef.current;
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0);
            const { density, isBlank } = checkEdgeDensity(canvas);
            if (isBlank) {
                setIsCapturing(false);
                return;
            }
            const currentHash = generateDHash(canvas);
            const distance = compareHashes(currentHash, lastScreenshotHash);
            if (distance < 5) {
                setIsCapturing(false);
                return;
            }
            const hasCredit = await consumeCredit(currentUser?.uid, CREDIT_COSTS.AUTO_CAPTURE);
            if (hasCredit) {
                const imageUrl = canvas.toDataURL("image/jpeg", 0.8);
                await addNote(imageUrl, video.currentTime || 0);
                setLastScreenshotHash(currentHash);
            } else {
                setIsAutoCaptureOn(false);
                showToast("No credits!", 'error');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsCapturing(false);
        }
    }, [isAutoCaptureOn, isCapturing, userCredits, lastScreenshotHash, currentUser, addNote, showToast]);

    const startCapture = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "never" }, audio: false });
            if (streamVideoRef.current) {
                streamVideoRef.current.srcObject = mediaStream;
                streamVideoRef.current.play();
                setStreamActive(true);
                streamRef.current = mediaStream;
                showToast("Connected!", 'success');
            }
        } catch (err) {
            showToast("Failed stream", 'error');
        }
    };

    const stopCapture = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            setStreamActive(false);
            setIsAutoCaptureOn(false);
        }
    };

    const handleSyncToCloud = async () => {
        if (!currentUser) return;
        const pendingNotes = localNotes || [];
        const pendingFolders = (localFolders || []).filter(f => f.id !== 'default');
        const pendingFiles = localFiles || [];
        const totalItems = pendingNotes.length + pendingFolders.length + pendingFiles.length;
        if (totalItems === 0) return showToast("Nothing to sync", 'info');
        if (!confirm(`Sync ${totalItems} items?`)) return;

        setIsSyncing(true);
        try {
            for (const folder of pendingFolders) {
                await setDoc(doc(db, `users/${currentUser.uid}/folders`, folder.id), { name: folder.name, color: folder.color });
                deleteLocalFolder(folder.id);
            }
            for (const file of pendingFiles) {
                await setDoc(doc(db, `users/${currentUser.uid}/files`, file.id), { folderId: file.folderId, name: file.name, color: file.color, createdAt: serverTimestamp() });
                deleteLocalFile(file.id);
            }
            for (const note of pendingNotes) {
                let publicUrl = note.thumbnail;
                if (note.thumbnail && note.thumbnail.startsWith('data:')) {
                    publicUrl = await uploadToR2(note.thumbnail, `snaps/${currentUser.uid}/${note.id}.jpg`);
                }
                await storeAddNote({ ...note, thumbnail: publicUrl, storageStatus: 'synced' });
                deleteLocalNote(note.id);
            }
            showToast("Synced!", 'success');
        } catch (err) {
            showToast("Sync fail", 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleAdReward = async () => {
        if (!currentUser) return setIsAuthModalOpen(true);
        await rewardUserCredits(currentUser.uid, 5);
        showToast("Credits Added!", 'success');
        setIsAdGateOpen(false);
    };

    const handleShareFiles = async (roomId, noteIds) => {
        const notesToShare = (notes || []).filter(n => noteIds.includes(n.id));
        await shareSpecificNotesToRoom(roomId, notesToShare);
        showToast("Shared!", 'success');
    };

    const handleExportToNotion = async (ids) => {
        if (!currentUser) return setIsAuthModalOpen(true);
        if (ids.size === 0) return showToast("Select notes!", "error");
        const folderName = activeFolder ? activeFolder.name : "Selection";
        try {
            showToast("Exporting...", "info");
            const integrationSnap = await getDoc(doc(db, `users/${currentUser.uid}/integrations/notion`));
            if (!integrationSnap.exists() || !integrationSnap.data().access_token) throw new Error("Notion not connected");
            const { access_token } = integrationSnap.data();
            const notesToExport = (notes || []).filter(n => ids.has(n.id));
            const blocks = [{ object: "block", type: "heading_1", heading_1: { rich_text: [{ type: "text", text: { content: `LectureSnap: ${folderName}` } }] } }];
            notesToExport.forEach(note => {
                if (note.thumbnail) blocks.push({ object: "block", type: "image", image: { type: "external", external: { url: note.thumbnail } } });
                if (note.text) blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: note.text } }] } });
                blocks.push({ object: 'block', type: 'divider', divider: {} });
            });
            const response = await fetch(import.meta.env.VITE_AI_WORKER_URL + '/exportToNotion', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token, title: `LectureSnap: ${folderName}`, blocks })
            });
            if (!response.ok) throw new Error("Export failed");
            showToast("Exported!", "success");
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    // 6. UI HELPERS
    const toggleNoteSelection = id => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const unselectAll = () => {
        setSelectedIds(new Set());
        setContextMenu(null);
    };

    const updateNoteText = (id, text) => storeUpdateNote(id, { text });
    const updateNoteTitle = (id, title) => storeUpdateNote(id, { title });

    const handleGridMouseDown = e => {
        if (e.button !== 0 || e.target !== gridRef.current) return;
        setLasso({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY });
        setSelectedIds(new Set());
        setContextMenu(null);
    };

    const handleGridMouseMove = e => {
        if (!lasso) return;
        setLasso(prev => ({ ...prev, endX: e.clientX, endY: e.clientY }));
        const lassoRect = { left: Math.min(lasso.startX, e.clientX), top: Math.min(lasso.startY, e.clientY), right: Math.max(lasso.startX, e.clientX), bottom: Math.max(lasso.startY, e.clientY) };
        const newSelected = new Set();
        const items = gridRef.current?.querySelectorAll('[data-note-id]') || [];
        items.forEach(item => {
            const rect = item.getBoundingClientRect();
            if (rect.left < lassoRect.right && rect.right > lassoRect.left && rect.top < lassoRect.bottom && rect.bottom > lassoRect.top) newSelected.add(item.getAttribute('data-note-id'));
        });
        setSelectedIds(newSelected);
    };

    const handleGridMouseUp = e => {
        if (!lasso) return;
        if (selectedIds.size > 1) setContextMenu({ x: e.clientX, y: e.clientY, type: 'selection' });
        setLasso(null);
    };

    const moveNoteToFolder = (noteId, targetFolderId) => {
        storeUpdateNote(noteId, { folderId: targetFolderId, fileId: null });
        showToast("Moved", 'success');
    };

    const moveNotesToFolder = (ids, targetFolderId) => {
        ids.forEach(id => storeUpdateNote(id, { folderId: targetFolderId, fileId: null }));
        setSelectedIds(new Set());
        setContextMenu(null);
        showToast(`Moved ${ids.length} items`, 'success');
    };

    const moveNotesToFile = (ids, targetFileId) => {
        ids.forEach(id => storeUpdateNote(id, { fileId: targetFileId }));
        setSelectedIds(new Set());
        setContextMenu(null);
        showToast(`Moved ${ids.length} items to File`, 'success');
    };

    const deleteSelectedNotes = () => {
        selectedIds.forEach(id => storeDeleteNote(id));
        setSelectedIds(new Set());
        setContextMenu(null);
        showToast(`Deleted`, 'info');
    };

    const createNewFile = () => {
        if (!activeFolderId || activeFolderId === 'all') return showToast("Select folder", 'error');
        const name = prompt("File Name:");
        if (name) {
            storeCreateFile(activeFolderId, name);
            showToast("Created", 'success');
            triggerAction('file_created');
        }
    };

    // Folder Actions
    const handleDeleteFolder = (folder) => {
        if (!confirm(`Delete "${folder.name}" and all its contents?`)) return;
        // Delete all files in folder
        const folderFileIds = (files || []).filter(f => f.folderId === folder.id).map(f => f.id);
        folderFileIds.forEach(fileId => storeDeleteFile(fileId));
        // Delete all notes in folder
        const folderNoteIds = (notes || []).filter(n => n.folderId === folder.id).map(n => n.id);
        folderNoteIds.forEach(noteId => storeDeleteNote(noteId));
        // Delete the folder itself
        storeUpdateFolder(folder.id, { deleted: true }); // Soft delete or use actual delete
        setFolderContextMenu(null);
        showToast(`Deleted "${folder.name}"`, 'info');
    };

    const handleShareFolderToRoom = (folder) => {
        setShareInitialFolderId(folder.id);
        setIsShareDialogOpen(true);
        setFolderContextMenu(null);
    };

    const handleExportFolderPDF = (folder) => {
        setFolderContextMenu(null);
        setPdfExportOptions({ isOpen: true, scope: 'folder', target: folder, action: 'download' });
    };

    // File Actions
    const handleDeleteFile = (file) => {
        if (!confirm(`Delete "${file.name}"?`)) return;
        // Delete all notes in file
        const fileNoteIds = (notes || []).filter(n => n.fileId === file.id).map(n => n.id);
        fileNoteIds.forEach(noteId => storeDeleteNote(noteId));
        storeDeleteFile(file.id);
        setFileContextMenu(null);
        showToast(`Deleted "${file.name}"`, 'info');
    };

    const handleShareFileToRoom = (file) => {
        // Get all note IDs in this file
        const fileNoteIds = (notes || []).filter(n => n.fileId === file.id).map(n => n.id);
        if (fileNoteIds.length === 0) return showToast("No notes to share", 'error');
        setSelectedIds(new Set(fileNoteIds));
        setIsShareDialogOpen(true);
        setFileContextMenu(null);
    };

    const handleExportFilePdf = (file) => {
        setFileContextMenu(null);
        setPdfExportOptions({ isOpen: true, scope: 'file', target: file, action: 'download' });
    };

    const handleViewFolderPDF = (folder) => {
        setFolderContextMenu(null);
        setPdfExportOptions({ isOpen: true, scope: 'folder', target: folder, action: 'view' });
    };

    const handleViewFilePdf = (file) => {
        setFileContextMenu(null);
        setPdfExportOptions({ isOpen: true, scope: 'file', target: file, action: 'view' });
    };

    const exportStudyGuide = async (scope = 'selection', target = null, action = 'download', layout = 'single') => {
        if (!currentUser) return setIsAuthModalOpen(true);
        const hasCredit = await consumeCredit(currentUser.uid, CREDIT_COSTS.EXPORT_PDF);
        if (!hasCredit) return setIsAdGateOpen(true);

        showToast("Generating Smart Study Guide...", "info");

        // 1. Identify Notes to Export
        let studyNotes = [];
        let title = "My LectureSnap Notes";

        if (scope === 'selection') {
            studyNotes = (notes || []).filter(n => selectedIds.has(n.id));
            title = "Custom Selection";
        } else if (scope === 'file') {
            studyNotes = (notes || []).filter(n => n.fileId === target.id);
            title = target.name;
        } else if (scope === 'folder') {
            // Get all file IDs in this folder
            const folderFileIds = (files || []).filter(f => f.folderId === target.id).map(f => f.id);
            // Get notes directly in folder OR in any file within the folder
            studyNotes = (notes || []).filter(n =>
                n.folderId === target.id || folderFileIds.includes(n.fileId)
            );
            title = target.name;
        }

        if (studyNotes.length === 0) return showToast("No notes found in this scope!", 'error');

        // Sort chronologically
        studyNotes.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        const docPDF = new jsPDF();

        // --- Page 1: Premium Cover ---
        docPDF.setFillColor(30, 41, 59); // Dark slate
        docPDF.rect(0, 0, 210, 297, "F");

        // Logo/Icon Circle
        docPDF.setFillColor(59, 130, 246);
        docPDF.circle(105, 45, 20, "F");
        docPDF.setTextColor(255, 255, 255);
        docPDF.setFontSize(32);
        docPDF.text("LS", 105, 50, { align: "center" });

        docPDF.setFontSize(36);
        docPDF.setFont("helvetica", "bold");
        docPDF.text("LectureSnap", 105, 85, { align: "center" });

        docPDF.setFontSize(12);
        docPDF.setFont("helvetica", "normal");
        docPDF.setTextColor(148, 163, 184);
        docPDF.text("Professional Study Repository", 105, 97, { align: "center" });

        // Content Box
        docPDF.setFillColor(255, 255, 255);
        docPDF.roundedRect(20, 110, 170, 80, 5, 5, "F");

        docPDF.setTextColor(59, 130, 246);
        docPDF.setFontSize(18);
        docPDF.setFont("helvetica", "bold");
        docPDF.text("STUDY GUIDE", 105, 128, { align: "center" });

        docPDF.setTextColor(71, 85, 105);
        docPDF.setFontSize(10);
        docPDF.setFont("helvetica", "bold");
        docPDF.text(`SOURCE: ${title.toUpperCase()}`, 30, 145);
        docPDF.setFont("helvetica", "normal");
        docPDF.text(`TOTAL CAPTURES: ${studyNotes.length}`, 30, 155);
        docPDF.text(`GENERATED: ${new Date().toLocaleString()}`, 30, 165);
        docPDF.text(`PREPARED FOR: ${currentUser.email}`, 30, 175);

        // --- Features Section ---
        docPDF.setFillColor(51, 65, 85);
        docPDF.roundedRect(20, 200, 170, 60, 5, 5, "F");

        docPDF.setTextColor(255, 255, 255);
        docPDF.setFontSize(11);
        docPDF.setFont("helvetica", "bold");
        docPDF.text("Why LectureSnap?", 30, 215);

        docPDF.setFontSize(9);
        docPDF.setFont("helvetica", "normal");
        docPDF.setTextColor(200, 200, 200);
        const features = [
            "• Auto-capture slides with AI change detection",
            "• Organize notes into folders & files",
            "• Export to PDF, Notion, and more",
            "• Extension for capturing from YouTube",
            "• Real-time study rooms & collaboration"
        ];
        let featureY = 225;
        features.forEach(f => {
            docPDF.text(f, 30, featureY);
            featureY += 7;
        });

        // --- Links Section ---
        docPDF.setFillColor(51, 65, 85);
        docPDF.roundedRect(20, 262, 170, 28, 3, 3, "F");

        docPDF.setTextColor(59, 130, 246);
        docPDF.setFontSize(9);
        docPDF.setFont("helvetica", "bold");
        docPDF.text("Website:", 30, 272);
        docPDF.setTextColor(255, 255, 255);
        docPDF.setFont("helvetica", "normal");
        docPDF.text("https://lecturesnap.online", 55, 272);

        docPDF.setTextColor(37, 211, 102);
        docPDF.setFont("helvetica", "bold");
        docPDF.text("WhatsApp:", 30, 282);
        docPDF.setTextColor(255, 255, 255);
        docPDF.setFont("helvetica", "normal");
        docPDF.text("https://whatsapp.com/channel/0029VbCDD9sLtOj8BCcSuj1T", 55, 282);

        // Footer
        docPDF.setTextColor(100, 100, 100);
        docPDF.setFontSize(8);
        docPDF.text("This document was generated by LectureSnap. Free, Fast, Secure.", 105, 295, { align: "center" });

        // --- Content Pages ---
        const renderNote = (note, startY, maxHeight, includeText = true) => {
            let y = startY;
            docPDF.setTextColor(15, 23, 42);
            docPDF.setFontSize(14);
            docPDF.setFont("helvetica", "bold");
            docPDF.text(note.title || "Annotated Capture", 20, y);
            y += 5;

            docPDF.setFontSize(9);
            docPDF.setTextColor(100, 116, 139);
            docPDF.text(`Captured at ${note.formattedTime || '00:00'}`, 20, y + 4);
            y += 10;

            // Image
            let imgHeight = 0;
            if (note.thumbnail) {
                try {
                    const desiredWidth = 170;
                    // If no text, give more space to image
                    const spaceBuffer = includeText ? 60 : 15;
                    const desiredHeight = maxHeight - spaceBuffer;
                    imgHeight = Math.min(includeText ? 95 : 120, desiredHeight);

                    docPDF.addImage(note.thumbnail, 'JPEG', 20, y, desiredWidth, imgHeight);
                    y += imgHeight + 5;
                } catch (e) {
                    y += 5;
                }
            }

            // Note Text
            if (includeText && note.text && note.text.trim()) {
                docPDF.setFillColor(248, 250, 252);
                // Calculate remaining height
                const textHeight = Math.min(40, (startY + maxHeight) - y - 5);

                docPDF.roundedRect(20, y, 170, textHeight, 2, 2, "F");
                docPDF.setTextColor(51, 65, 85);
                docPDF.setFontSize(10);
                docPDF.setFont("helvetica", "normal");
                const lines = docPDF.splitTextToSize(note.text, 160);
                // Truncate if too many lines for compact view
                const maxLines = Math.floor((textHeight - 10) / 4);
                const displayLines = lines.slice(0, Math.max(2, maxLines));

                docPDF.text(displayLines, 25, y + 7);
            }
        };

        if (layout === 'double') {
            for (let i = 0; i < studyNotes.length; i += 2) {
                docPDF.addPage();

                // Header Bar
                docPDF.setFillColor(59, 130, 246);
                docPDF.rect(0, 0, 210, 10, "F");
                docPDF.setTextColor(255, 255, 255);
                docPDF.setFontSize(8);
                docPDF.text(`LECTURESNAP | ${title.toUpperCase()} | PAGE ${docPDF.internal.getNumberOfPages() - 1}`, 20, 7);

                // Note 1 (Top Half: Y=20 to Y=145) - No Text
                renderNote(studyNotes[i], 20, 125, false);

                // Note 2 (Bottom Half: Y=155 to Y=280) - No Text
                if (i + 1 < studyNotes.length) {
                    renderNote(studyNotes[i + 1], 155, 125, false);
                }
            }
        } else {
            // Single Layout (Original)
            for (const note of studyNotes) {
                docPDF.addPage();
                let y = 20;

                // Branding Header on every page
                docPDF.setFillColor(59, 130, 246);
                docPDF.rect(0, 0, 210, 15, "F");
                docPDF.setTextColor(255, 255, 255);
                docPDF.setFontSize(10);
                docPDF.text(`LECTURESNAP STUDY SYSTEM | ${title.toUpperCase()}`, 20, 10);

                y = 35;
                docPDF.setTextColor(15, 23, 42);
                docPDF.setFontSize(20);
                docPDF.setFont("helvetica", "bold");
                docPDF.text(note.title || "Annotated Capture", 20, y);
                y += 5;

                docPDF.setFontSize(9);
                docPDF.setTextColor(100, 116, 139);
                docPDF.text(`Captured at ${note.formattedTime || '00:00'}`, 20, y + 5);
                y += 15;

                // Image
                if (note.thumbnail) {
                    try {
                        docPDF.addImage(note.thumbnail, 'JPEG', 20, y, 170, 95);
                        y += 105;
                    } catch (e) {
                        y += 10;
                    }
                }

                // Note Text
                docPDF.setFillColor(248, 250, 252);
                docPDF.roundedRect(20, y, 170, 40, 2, 2, "F");
                docPDF.setTextColor(51, 65, 85);
                docPDF.setFontSize(11);
                docPDF.setFont("helvetica", "normal");
                const lines = docPDF.splitTextToSize(note.text || "No annotations recorded for this capture.", 160);
                docPDF.text(lines, 25, y + 10);

                // Page Number
                docPDF.setFontSize(8);
                docPDF.setTextColor(200, 200, 200);
                const pageCount = docPDF.internal.getNumberOfPages();
                docPDF.text(`Page ${pageCount - 1} of ${studyNotes.length}`, 105, 285, { align: "center" });
            }
        }

        if (action === 'download') {
            docPDF.save(`LectureSnap_${title.replace(/\s+/g, '_')}.pdf`);
            showToast("Premium Study Guide Generated!", "success");
        } else {
            const blobUrl = docPDF.output('bloburl');
            setPdfPreview({ url: blobUrl, title: title });
            showToast("Opening PDF Viewer...", "success");
        }
    };

    const handleDropOnFolder = (e, folderId) => { e.preventDefault(); const noteId = e.dataTransfer.getData('noteId'); if (noteId) moveNoteToFolder(noteId, folderId); };
    const handleDropOnTargetFile = (e, targetFileId) => { e.preventDefault(); const noteId = e.dataTransfer.getData('noteId'); if (noteId) storeUpdateNote(noteId, { fileId: targetFileId }); };

    // 7. EFFECTS
    useEffect(() => {
        if (!currentUser) return;
        const syncProfile = async () => {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);

            const profileUpdate = {
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email.split('@')[0],
                lastLogin: serverTimestamp(),
            };

            if (!userSnap.exists() || !userSnap.data().joinedAt) {
                profileUpdate.joinedAt = serverTimestamp();
                profileUpdate.username = currentUser.displayName || currentUser.email.split('@')[0];
                profileUpdate.exp = 0;
                profileUpdate.streak = 1;
            }

            await setDoc(userRef, profileUpdate, { merge: true });
        };
        syncProfile();
        return onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
            if (doc.exists()) setUserCredits(doc.data().credits_remaining || 0);
        });
    }, [currentUser]);

    // Use Ref for instant deduplication without re-renders
    const lastCaptureIdRef = useRef(null);
    const lastCaptureTimeRef = useRef(0);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && event.data.type === "EXTENSION_CAPTURE") {
                const { data: image, timestamp, captureId } = event.data;
                const now = Date.now();

                // 1. Strict ID Deduplication
                if (captureId && lastCaptureIdRef.current === captureId) {
                    console.log("Ignoring duplicate capture ID:", captureId);
                    return;
                }

                // 2. Burst Protection (Throttle 500ms)
                if (now - lastCaptureTimeRef.current < 500) {
                    console.log("Ignoring burst capture");
                    return;
                }

                lastCaptureIdRef.current = captureId;
                lastCaptureTimeRef.current = now;

                addNote(image, timestamp, captureId);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [addNote]);

    useEffect(() => {
        if (isAutoCaptureOn && streamActive) {
            autoTimerRef.current = setInterval(performAutoCapture, 5000);
        } else {
            if (autoTimerRef.current) clearInterval(autoTimerRef.current);
        }
        return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
    }, [isAutoCaptureOn, streamActive, performAutoCapture]);

    useEffect(() => {
        const handleGlobalClick = () => {
            setContextMenu(null);
            setFolderContextMenu(null);
            setFileContextMenu(null);
        };
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    useHotkeys({
        toggleSidebar: () => setIsSidebarOpen(prev => !prev),
        capture: () => addNote(),
    });

    // 8. RENDER VARIABLES
    const allNotesMatch = activeFolderId === 'all';
    const filteredNotes = (notes || []).filter(n => {
        if (allNotesMatch) return true;
        if (activeFileId) return n.fileId === activeFileId;
        return (n.folderId || 'default') === activeFolderId && !n.fileId;
    });
    const activeFolder = (folders || []).find(f => f.id === activeFolderId) || (folders || [])[0] || { name: 'General', id: 'default', color: '#3b82f6' };
    const folderFiles = (files || []).filter(f => f.folderId === activeFolderId);
    const displayNotes = activeRoomId ? (roomNotes || []) : (filteredNotes || []);

    return (
        <div className="flex h-screen bg-white dark:bg-[#080808] text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
            {lasso && <div className="selection-lasso" style={{ left: Math.min(lasso.startX, lasso.endX), top: Math.min(lasso.startY, lasso.endY), width: Math.abs(lasso.startX - lasso.endX), height: Math.abs(lasso.startY - lasso.endY) }} />}

            {contextMenu && (
                <div className="fixed z-[1000] glass-card p-1.5 shadow-2xl border min-w-[200px] animate-in fade-in zoom-in-95" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
                    <div className="px-3 py-2 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b mb-1 flex items-center justify-between">
                        <span>{selectedIds.size} Items</span><Sparkles className="w-3 h-3 text-purple-500" />
                    </div>
                    {folders.map(f => (
                        <button key={f.id} onClick={() => moveNotesToFolder(Array.from(selectedIds), f.id)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                            <Folder className="w-4 h-4" style={{ color: f.color }} /> {f.name}
                        </button>
                    ))}
                    <button onClick={deleteSelectedNotes} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /> Delete All</button>
                </div>
            )}

            {/* Folder Context Menu */}
            {folderContextMenu && (
                <div
                    className="fixed z-[1000] glass-card p-1.5 shadow-2xl border min-w-[180px] animate-in fade-in zoom-in-95"
                    style={{ left: folderContextMenu.x, top: folderContextMenu.y }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="px-3 py-2 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b mb-1 flex items-center gap-2">
                        <Folder className="w-3 h-3" style={{ color: folderContextMenu.folder.color }} />
                        <span className="truncate">{folderContextMenu.folder.name}</span>
                    </div>
                    <button
                        onClick={() => handleViewFolderPDF(folderContextMenu.folder)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <Monitor className="w-4 h-4 text-blue-500" /> View as PDF
                    </button>
                    <button
                        onClick={() => handleExportFolderPDF(folderContextMenu.folder)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <FileDown className="w-4 h-4 text-emerald-500" /> Export PDF
                    </button>
                    <button
                        onClick={() => handleShareFolderToRoom(folderContextMenu.folder)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <Share2 className="w-4 h-4 text-purple-500" /> Share to Room
                    </button>
                    <div className="h-px bg-gray-100 dark:bg-white/10 my-1" />
                    <button
                        onClick={() => handleDeleteFolder(folderContextMenu.folder)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>
            )}

            {/* File Context Menu */}
            {fileContextMenu && (
                <div
                    className="fixed z-[1000] glass-card p-1.5 shadow-2xl border min-w-[180px] animate-in fade-in zoom-in-95"
                    style={{ left: fileContextMenu.x, top: fileContextMenu.y }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="px-3 py-2 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b mb-1 flex items-center gap-2">
                        <FileText className="w-3 h-3 text-blue-500" />
                        <span className="truncate">{fileContextMenu.file.name}</span>
                    </div>
                    <button
                        onClick={() => handleViewFilePdf(fileContextMenu.file)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <Monitor className="w-4 h-4 text-blue-500" /> View as PDF
                    </button>
                    <button
                        onClick={() => handleExportFilePdf(fileContextMenu.file)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <FileDown className="w-4 h-4 text-emerald-500" /> Export PDF
                    </button>
                    <button
                        onClick={() => handleShareFileToRoom(fileContextMenu.file)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <Share2 className="w-4 h-4 text-purple-500" /> Share to Room
                    </button>
                    <div className="h-px bg-gray-100 dark:bg-white/10 my-1" />
                    <button
                        onClick={() => handleDeleteFile(fileContextMenu.file)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>
            )}

            <aside className={cn("glass-card border-none rounded-none w-72 h-full flex flex-col transition-all duration-300 z-50", !isSidebarOpen && "-ml-72")}>
                <div className="p-6 flex items-center justify-between border-b">
                    <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg shadow-lg" />
                        <span className="font-black tracking-tighter text-lg">LectureSnap</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-2 px-2">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Library</span>
                            <button id="create-folder-btn" onClick={() => { const name = prompt("Name:"); if (name) { storeCreateFolder(name); triggerAction('folder_created'); } }} className="p-1 hover:bg-blue-500/10 rounded-lg text-blue-500"><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-1">
                            <div className={cn("flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold cursor-pointer", activeFolderId === 'all' ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "hover:bg-gray-100 dark:hover:bg-white/5")} onClick={() => setActiveFolderId('all')}><LayoutGrid className="w-4 h-4" /><span>All Screenshots</span></div>
                            {folders.map(f => (
                                <div
                                    key={f.id}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => handleDropOnFolder(e, f.id)}
                                    onClick={() => setActiveFolderId(f.id)}
                                    onContextMenu={e => {
                                        e.preventDefault();
                                        setFolderContextMenu({ x: e.clientX, y: e.clientY, folder: f });
                                    }}
                                    className={cn("group flex items-center justify-between p-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer", activeFolderId === f.id ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "hover:bg-gray-100 dark:hover:bg-white/5")}
                                >
                                    <div className="flex items-center gap-3"><Folder className="w-4 h-4" style={{ fill: activeFolderId === f.id ? 'white' : f.color }} /><span>{f.name}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="h-px bg-gray-100 dark:bg-white/5 mx-2" />
                    <div>
                        <div className="flex items-center justify-between mb-2 px-2">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Study Rooms</span>
                            <button onClick={() => setIsRoomManagerOpen(true)} className="p-1 hover:bg-purple-500/10 rounded-lg text-purple-500"><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-1">
                            {rooms.map(room => (
                                <div key={room.id} onClick={() => setActiveRoomId(room.id)} className={cn("flex items-center justify-between p-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all", activeRoomId === room.id ? "bg-purple-600 text-white shadow-xl" : "hover:bg-purple-50 dark:hover:bg-purple-900/10")}>
                                    <div className="flex items-center gap-3"><Users className="w-4 h-4" /><span>{room.name}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div id="tutorial-user-profile" className="p-4 border-t space-y-2">
                    {currentUser ? (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-white/5">
                            <Link to="/profile" className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-all">
                                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">{currentUser.email[0].toUpperCase()}</div>
                                <div className="flex flex-col"><span className="text-xs font-black">{currentUser.displayName || 'User'}</span><span className="text-[10px] text-gray-400">{isCloud ? 'Cloud Sync ON' : 'Local Only'}</span></div>
                            </Link>
                            <button onClick={logout} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500"><LogOut className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <button onClick={() => setIsAuthModalOpen(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-all shadow-lg"><LogIn className="w-4 h-4" />Sign In to Sync</button>
                    )}
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#080808] relative">
                <header className="h-20 border-b flex items-center justify-between px-8 shrink-0 z-40 bg-white/80 dark:bg-[#080808]/80 backdrop-blur-xl">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"><Menu className="w-6 h-6" /></button>
                        <div className="flex flex-col">
                            <h1 className="font-black text-xl tracking-tighter flex items-center gap-2">{activeFolder?.name || 'All Highlights'}{activeRoomId && <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px]">ROOM</span>}</h1>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{onlineCount} Users Studying Now</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsLocationPickerOpen(true)}
                            className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-blue-500/30 transition-all group"
                        >
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                                <Folder className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">Save Location</span>
                                <span className="text-xs font-black text-gray-700 dark:text-gray-200">
                                    {files.find(f => f.id === activeFileId)?.name || folders.find(f => f.id === activeFolderId)?.name || 'General'}
                                </span>
                            </div>
                        </button>

                        {!streamActive && <button id="tutorial-start-session" onClick={startCapture} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-all shadow-lg active:scale-95"><Video className="w-4 h-4" />START STUDY SESSION</button>}

                        <Link to="/capture" className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-black hover:opacity-80 transition-all shadow-lg active:scale-95 border-2 border-white/10">
                            <Camera className="w-4 h-4" />
                            <span className="hidden md:inline">SERVER SNAP</span>
                        </Link>

                        <button onClick={handleSyncToCloud} disabled={isSyncing} className={cn("p-2.5 rounded-xl transition-all", isSyncing ? "animate-spin text-blue-500" : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500")}>{isSyncing ? <RefreshCw className="w-5 h-5" /> : <Cloud className="w-5 h-5" />}</button>

                        <button
                            id="tutorial-export-pdf"
                            onClick={() => {
                                if (selectedIds.size > 0) exportStudyGuide('selection');
                                else if (activeFileId) exportStudyGuide('file', files.find(f => f.id === activeFileId));
                                else exportStudyGuide('folder', activeFolder);
                            }}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95"
                        >
                            <FileDown className="w-4 h-4" />
                            <span className="text-xs">EXPORT STUDY GUIDE</span>
                        </button>

                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-white/5 rounded-2xl border border-blue-500/20">
                                <button onClick={() => handleExportToNotion(selectedIds)} className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-black dark:bg-white/10 text-white font-black hover:opacity-80 shadow-lg"><FileText className="w-3.5 h-3.5" />NOTION</button>
                            </div>
                        )}
                        <div id="tutorial-credits" className="px-4 py-2 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center gap-3">
                            <div className="flex flex-col"><span className="text-[8px] font-black uppercase text-blue-400">Credits</span><span className="text-sm font-black text-blue-600">{userCredits}</span></div>
                            <button onClick={() => setIsAdGateOpen(true)} className="p-1.5 rounded-lg bg-blue-600 text-white"><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                        <Link to="/integrations" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-500"><Layers className="w-5 h-5" /></Link>
                        <button onClick={toggleTheme} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl">{isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 scroll-smooth select-none" ref={gridRef} onMouseDown={handleGridMouseDown} onMouseMove={handleGridMouseMove} onMouseUp={handleGridMouseUp} onContextMenu={e => e.preventDefault()}>
                    {streamActive && (
                        <div className="mb-10 animate-in slide-in-from-top duration-500">
                            <div className="glass-card noise-bg p-2 max-w-4xl mx-auto">
                                <div className="aspect-video bg-black rounded-2xl overflow-hidden relative border">
                                    <video ref={streamVideoRef} className="w-full h-full object-contain" />
                                    <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                        <div className="flex gap-2">
                                            <button onClick={manualSnap} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-sm shadow-2xl active:scale-95 transition-all">SNAP SCREENSHOT</button>
                                            <button onClick={stopCapture} className="p-3 bg-red-600 text-white rounded-xl"><X className="w-5 h-5" /></button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button id="tutorial-auto-capture" onClick={() => setIsAutoCaptureOn(!isAutoCaptureOn)} className={cn("px-4 py-2 rounded-xl font-black text-[10px] transition-all flex items-center gap-2 border shadow-lg uppercase tracking-wider", isAutoCaptureOn ? "bg-green-600 text-white border-green-400" : "bg-white/10 backdrop-blur-md text-white border-white/20")}><div className={cn("w-2 h-2 rounded-full", isAutoCaptureOn ? "bg-white animate-pulse" : "bg-gray-400")} />{isAutoCaptureOn ? "Auto ON" : "Auto OFF"}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!activeFileId && activeFolderId !== 'all' && (
                        <div className="mb-12">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2"><FileText className="w-3 h-3" /> Files in this Folder</h2>
                                <button onClick={createNewFile} className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-500 rounded-xl text-xs font-black hover:bg-blue-600/20 transition-all"><Plus className="w-4 h-4" /> NEW FILE</button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {(folderFiles || []).map(file => (
                                    <div
                                        key={file.id}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => handleDropOnTargetFile(e, file.id)}
                                        onClick={() => setActiveFileId(file.id)}
                                        className={cn("glass-card p-4 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all relative group", activeFileId === file.id ? "ring-2 ring-blue-500 bg-blue-500/5" : "")}
                                    >
                                        {/* 3-dots menu button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFileContextMenu({ x: e.clientX, y: e.clientY, file });
                                            }}
                                            className="absolute top-2 right-2 p-1 rounded-lg bg-white/80 dark:bg-gray-800/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <MoreHorizontal className="w-4 h-4 text-gray-500" />
                                        </button>
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"><FileText className="w-6 h-6" /></div>
                                        <span className="text-xs font-black text-center line-clamp-2">{file.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-6 pt-6 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-4">
                            <h2 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2"><LayoutGrid className="w-3 h-3" /> NOTES</h2>
                        </div>
                        {activeFileId && <button onClick={() => setActiveFileId(null)} className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Back to Files</button>}
                    </div>

                    {displayNotes.length === 0 ? (
                        <div className="h-[40vh] flex flex-col items-center justify-center text-center opacity-30 grayscale pointer-events-none"><Layout className="w-20 h-20 mb-4" /><p className="font-bold text-lg">No notes found here.</p></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                            {displayNotes.map(note => (
                                <NoteCard key={note.id} note={note} isActive={selectedIds.has(note.id)} onToggleSelection={() => toggleNoteSelection(note.id)} onUpdateText={text => updateNoteText(note.id, text)} onUpdateTitle={title => updateNoteTitle(note.id, title)} onDelete={() => storeDeleteNote(note.id)} onRemoveImage={() => removeNoteImage(note.id)} />
                            ))}
                        </div>
                    )}

                    {/* --- Blog / Discovery Section --- */}
                    <div className="mt-20">
                        <ContentDiscovery />
                    </div>
                </div>
            </main>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
            <RoomManager isOpen={isRoomManagerOpen} onClose={() => setIsRoomManagerOpen(false)} onJoin={joinRoom} onCreate={createRoom} />
            <ShareDialog isOpen={isShareDialogOpen} onClose={() => setIsShareDialogOpen(false)} rooms={rooms} notes={notes} onShare={handleShareFiles} initialFolderId={shareInitialFolderId} />
            <RewardedVideoGate isOpen={isAdGateOpen} onClose={() => setIsAdGateOpen(false)} onReward={handleAdReward} userId={currentUser?.uid} />
            <SidebarBreakModal
                isOpen={isBreakModalOpen}
                onClose={() => setIsBreakModalOpen(false)}
                onReward={() => {
                    // Reward user with 1 credit for taking a health break?
                    if (currentUser) rewardUserCredits(currentUser.uid, 1);
                    showToast("Wellness Reward: +1 Credit!", "success");
                }}
            />
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
                        showToast(`Saving to: ${file.name}`);
                    }}
                    onSelectFolder={id => {
                        setActiveFileId(null);
                        setActiveFolderId(id);
                        setIsLocationPickerOpen(false);
                        showToast(`Saving to Folder`);
                    }}
                />
            )}
            {snapStatus && <div className={cn("fixed bottom-10 right-10 z-[1000] px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right flex items-center gap-3", snapStatus.type === 'error' ? "bg-red-500 text-white" : "bg-blue-600 text-white")}><CheckCircle2 className="w-5 h-5" /><span className="font-bold">{snapStatus.message}</span></div>}
            {pdfExportOptions.isOpen && (
                <PdfExportOptionsModal
                    isOpen={pdfExportOptions.isOpen}
                    action={pdfExportOptions.action}
                    file={pdfExportOptions.target}
                    onClose={() => setPdfExportOptions({ ...pdfExportOptions, isOpen: false })}
                    onConfirm={(layout) => {
                        exportStudyGuide(pdfExportOptions.scope, pdfExportOptions.target, pdfExportOptions.action, layout);
                        setPdfExportOptions({ ...pdfExportOptions, isOpen: false });
                    }}
                />
            )}
            {pdfPreview && (
                <PdfViewerModal
                    url={pdfPreview.url}
                    fileName={pdfPreview.title}
                    onClose={() => setPdfPreview(null)}
                />
            )}
        </div>
    );
}

export default function NoteApp() {
    return (
        <TutorialProvider>
            <NoteAppContent />
        </TutorialProvider>
    );
}
