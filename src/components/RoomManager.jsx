import React, { useState } from 'react';
import { Users, Plus, Hash, Share2, Copy, X, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function RoomManager({ isOpen, onClose, rooms, onCreateRoom, onJoinRoom, onDeleteRoom, activeRoomId, setActiveRoomId }) {
    const [mode, setMode] = useState('list'); // list, create, join, created
    const [inputName, setInputName] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [error, setError] = useState('');
    const [createdRoomCode, setCreatedRoomCode] = useState('');

    if (!isOpen) return null;

    const handleCreate = async () => {
        if (!inputName) return;
        try {
            const newRoom = await onCreateRoom(inputName);
            setCreatedRoomCode(newRoom.code);
            setMode('created');
            setInputName('');
        } catch (e) {
            setError('Failed to create room');
        }
    };

    const handleDelete = async (roomId, e) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this room? This cannot be undone.")) {
            try {
                await onDeleteRoom(roomId);
            } catch (e) {
                alert("Failed to delete room: " + e.message);
            }
        }
    };

    const handleJoin = async () => {
        if (!inputCode) return;
        try {
            const id = await onJoinRoom(inputCode);
            setActiveRoomId(id);
            setMode('list');
            setInputCode('');
            onClose(); // Auto close on successful join? or stay to confirm?
        } catch (e) {
            setError(e.message || 'Failed to join');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-2xl font-bold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        <div className="p-2 bg-blue-100 dark:bg-purple-900/30 rounded-lg">
                            <Users className="w-8 h-8 text-blue-600 dark:text-purple-400" />
                        </div>
                        Study Rooms
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    {mode === 'list' && (
                        <div className="space-y-4">
                            {rooms.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p>You haven't joined any rooms yet.</p>
                                    <p className="text-sm">Collaborate with friends by creating or joining a room.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {rooms.map(room => (
                                        <div
                                            key={room.id}
                                            onClick={() => { setActiveRoomId(room.id); onClose(); }}
                                            className={cn(
                                                "w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center group cursor-pointer",
                                                activeRoomId === room.id
                                                    ? "bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500"
                                                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-gray-50 dark:bg-white/5"
                                            )}
                                        >
                                            <div>
                                                <h3 className="font-bold">{room.name}</h3>
                                                <p className="text-xs text-gray-400">{Object.keys(room.members || {}).length} members</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-sm font-bold bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded font-mono select-all">
                                                        {room.code}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(room.code);
                                                        }}
                                                        className="p-1.5 hover:bg-gray-300 dark:hover:bg-white/20 rounded text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors"
                                                        title="Copy Code"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                {/* Delete Button - Only visible if owner or generally allowed (user requirement: "allow users to delete rooms") */}
                                                <button
                                                    onClick={(e) => handleDelete(room.id, e)}
                                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded transition-colors"
                                                    title="Delete Room"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-4">
                                <button
                                    onClick={() => setMode('create')}
                                    className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                                >
                                    <Plus className="w-4 h-4" /> Create Room
                                </button>
                                <button
                                    onClick={() => setMode('join')}
                                    className="flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-white/10 dark:text-white rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition"
                                >
                                    <Hash className="w-4 h-4" /> Join Room
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'created' && (
                        <div className="space-y-6 text-center">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Hash className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-1">Room Created!</h3>
                                <p className="text-gray-500 text-sm">Share this code with friends to join.</p>
                            </div>

                            <div className="bg-gray-100 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center gap-3">
                                <span className="text-3xl font-mono font-bold tracking-[0.2em] text-blue-600 dark:text-blue-400">
                                    {createdRoomCode}
                                </span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(createdRoomCode);
                                        alert("Code copied!");
                                    }}
                                    className="text-xs font-bold text-gray-500 flex items-center gap-1 hover:text-blue-500"
                                >
                                    <Copy className="w-3 h-3" /> COPY CODE
                                </button>
                            </div>

                            <button
                                onClick={() => setMode('list')}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                            >
                                Done
                            </button>
                        </div>
                    )}

                    {mode === 'create' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-center">Create New Room</h3>
                            <input
                                autoFocus
                                value={inputName}
                                onChange={e => setInputName(e.target.value)}
                                placeholder="Room Name (e.g. Physics Group)"
                                className="w-full p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-transparent focus:border-blue-500 outline-none"
                            />
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <div className="flex gap-2">
                                <button onClick={() => setMode('list')} className="flex-1 py-2 text-gray-500">Cancel</button>
                                <button onClick={handleCreate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold">Create</button>
                            </div>
                        </div>
                    )}

                    {mode === 'join' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-center">Join Existing Room</h3>
                            <input
                                autoFocus
                                value={inputCode}
                                onChange={e => setInputCode(e.target.value)}
                                placeholder="Enter 6-digit Code"
                                className="w-full p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-transparent focus:border-blue-500 outline-none font-mono text-center tracking-widest text-lg"
                                maxLength={6}
                            />
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <div className="flex gap-2">
                                <button onClick={() => setMode('list')} className="flex-1 py-2 text-gray-500">Cancel</button>
                                <button onClick={handleJoin} className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-bold">Join Room</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-component for Sharing Dialog
export function ShareDialog({ isOpen, onClose, folders, rooms, notes = [], onShare, initialFolderId = '' }) {
    const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [selectedNoteIds, setSelectedNoteIds] = useState(new Set());

    // Update state when initialFolderId changes (e.g. reopening dialog with different folder)
    React.useEffect(() => {
        if (isOpen && initialFolderId) {
            setSelectedFolderId(initialFolderId);
        }
    }, [isOpen, initialFolderId]);

    // Filter notes based on selected folder
    const folderNotes = notes.filter(n => n.folderId === selectedFolderId);

    // Reset filtering when folder changes
    React.useEffect(() => {
        // If we just opened with initialFolderId, we might want to auto-select all notes?
        // Let's keep it simple: Reset selection when folder changes manually.
        setSelectedNoteIds(new Set());
    }, [selectedFolderId]);

    if (!isOpen) return null;

    const handleShare = () => {
        if (selectedFolderId && selectedRoomId) {
            // If no notes selected, assume sharing ALL notes in folder (traditional behavior)
            // Or if specific notes selected, share only those.
            // But user requirement says "choose which files".
            const notesToShare = selectedNoteIds.size > 0
                ? Array.from(selectedNoteIds)
                : folderNotes.map(n => n.id); // Default to all if none selected? Or require selection?

            // Let's require selection if user is in "file selection mode", but maybe default to all for UX?
            // "can choose which files ... they can share the files to the room"

            onShare(selectedRoomId, notesToShare);
            onClose();
        }
    };

    const toggleNoteSelection = (noteId) => {
        const newSet = new Set(selectedNoteIds);
        if (newSet.has(noteId)) {
            newSet.delete(noteId);
        } else {
            newSet.add(noteId);
        }
        setSelectedNoteIds(newSet);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-2xl shadow-xl p-6 flex flex-col max-h-[80vh]">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 shrink-0">
                    <Share2 className="w-5 h-5 text-green-500" /> Share Files to Room
                </h2>

                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-500">1. Select Folder</label>
                        <select
                            className="w-full p-2 rounded bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500"
                            value={selectedFolderId}
                            onChange={e => setSelectedFolderId(e.target.value)}
                        >
                            <option value="">-- Choose Folder --</option>
                            {folders.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedFolderId && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <label className="block text-sm font-medium mb-1 text-gray-500">2. Select Files to Share ({folderNotes.length})</label>
                            <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-black/20">
                                {folderNotes.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">No files in this folder.</p>
                                ) : (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700 mb-1 pb-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedNoteIds.size === folderNotes.length && folderNotes.length > 0}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedNoteIds(new Set(folderNotes.map(n => n.id)));
                                                    else setSelectedNoteIds(new Set());
                                                }}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs font-bold uppercase text-gray-500">Select All</span>
                                        </div>
                                        {folderNotes.map(note => (
                                            <label key={note.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-white/5 rounded cursor-pointer transition-colors group">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedNoteIds.has(note.id)}
                                                    onChange={() => toggleNoteSelection(note.id)}
                                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                        {note.title || (note.thumbnail ? 'Image File' : 'Text File')}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {note.formattedTime || 'No Time'}
                                                    </p>
                                                </div>
                                                {note.thumbnail && (
                                                    <img src={note.thumbnail} alt="" className="w-8 h-8 rounded object-cover border border-gray-200 dark:border-gray-700" />
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-500">3. Select Room</label>
                        <select
                            className="w-full p-2 rounded bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-700 outline-none focus:border-blue-500"
                            value={selectedRoomId}
                            onChange={e => setSelectedRoomId(e.target.value)}
                        >
                            <option value="">-- Choose Room --</option>
                            {rooms.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 flex gap-2 shrink-0">
                        <button onClick={onClose} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">Cancel</button>
                        <button
                            disabled={!selectedFolderId || !selectedRoomId || selectedNoteIds.size === 0}
                            onClick={handleShare}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold disabled:opacity-50 hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20"
                        >
                            Share Files
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
