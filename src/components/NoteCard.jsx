import React, { useState } from 'react';
import { Trash2, FolderInput, Check, X, MoreVertical, Sparkles, Copy, Share2, Move, Clock, Scan, FileText } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn, formatTime } from '../lib/utils';

/**
 * Premium NoteCard component
 * Supports drag and drop, AI flashcard generation, and folder management.
 */
export const NoteCard = ({
    note,
    onDelete,
    onJump,
    isActive,
    onUpdateText,
    onUpdateTitle,
    folders = [],
    currentFolderId = 'default',
    onRemoveImage,
    onGenerateFlashcards,
    onToggleSelection,
    readOnly = false
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            draggable={!readOnly}
            onDragStart={(e) => {
                if (!readOnly) {
                    e.dataTransfer.setData('noteId', note.id);
                    e.dataTransfer.effectAllowed = 'move';
                }
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "group relative flex flex-col gap-4 rounded-3xl border p-5 transition-all duration-500 isolate glass-card",
                "bg-white/80 dark:bg-gray-900/40 border-gray-100/50 dark:border-white/5",
                "hover:shadow-[0_20px_50px_rgba(59,130,246,0.1)] dark:hover:shadow-[0_20px_50px_rgba(59,130,246,0.05)]",
                "hover:-translate-y-1 hover:border-blue-500/30",
                isActive ? "ring-2 ring-blue-500 border-transparent z-10" : "z-0",
                !readOnly && "cursor-pointer"
            )}
            onClick={(e) => {
                if (!readOnly && onToggleSelection) {
                    onToggleSelection(note.id);
                }
            }}
        >
            {/* Header Area */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                        {note.thumbnail ? <Scan className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <input
                            title="Rename"
                            className="bg-transparent font-black text-base text-slate-800 dark:text-white outline-none truncate placeholder-gray-400 focus:text-blue-500 transition-colors"
                            placeholder="Untitled Document"
                            value={note.title || ''}
                            readOnly={readOnly}
                            onChange={(e) => onUpdateTitle && onUpdateTitle(note.id, e.target.value)}
                        />
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                                <Clock className="w-3 h-3" />
                                {note.timestamp ? formatTime(note.timestamp) : 'DRAFT'}
                            </div>
                            {note.timestamp > 0 && onJump && (
                                <button
                                    onClick={() => onJump(note.timestamp)}
                                    className="text-[10px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest px-2"
                                >
                                    Jump
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button
                            className={cn(
                                "p-2 rounded-xl transition-all duration-300 outline-none ",
                                "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-gray-500 hover:text-blue-500",
                                isHovered ? "opacity-100" : "opacity-0"
                            )}
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                        <DropdownMenu.Content className="premium-blur min-w-[200px] p-2 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                            {note.thumbnail && onGenerateFlashcards && (
                                <DropdownMenu.Item
                                    onSelect={() => onGenerateFlashcards(note)}
                                    className="flex items-center gap-3 px-3 py-3 text-sm font-bold rounded-xl cursor-pointer outline-none text-purple-600 dark:text-purple-400 hover:bg-purple-100/50 dark:hover:bg-purple-900/30"
                                >
                                    <Sparkles className="w-4 h-4" /> AI Flashcards
                                </DropdownMenu.Item>
                            )}

                            <DropdownMenu.Item
                                onSelect={() => navigator.clipboard.writeText(note.text || '')}
                                className="flex items-center gap-3 px-3 py-3 text-sm font-bold rounded-xl cursor-pointer outline-none hover:bg-gray-100 dark:hover:bg-white/5"
                            >
                                <Copy className="w-4 h-4" /> Copy Content
                            </DropdownMenu.Item>

                            {!readOnly && (
                                <DropdownMenu.Item
                                    onSelect={() => onDelete(note.id)}
                                    className="flex items-center gap-3 px-3 py-3 text-sm font-bold rounded-xl cursor-pointer outline-none text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 className="w-4 h-4" /> Move to Trash
                                </DropdownMenu.Item>
                            )}
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </div>

            {/* Thumbnail Display */}
            {note.thumbnail && (
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-50 dark:bg-black/50 border border-gray-100 dark:border-white/5 noise-bg">
                    <img
                        src={note.thumbnail}
                        alt="Capture"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {!readOnly && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Remove image?")) onRemoveImage(note.id);
                            }}
                            className="absolute top-3 right-3 p-2.5 bg-black/60 hover:bg-red-500 text-white rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 flex flex-col gap-2">
                <textarea
                    className={cn(
                        "w-full bg-transparent resize-none text-sm leading-relaxed outline-none border-none p-0",
                        "text-slate-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-600",
                        "min-h-[60px]"
                    )}
                    placeholder="Enter notes or let AI analyze the slide..."
                    value={note.text}
                    readOnly={readOnly}
                    onChange={(e) => onUpdateText(note.id, e.target.value)}
                />
            </div>

            {/* Visual indicator for multi-selection */}
            {isActive && (
                <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-blue-600 border-2 border-white dark:border-black flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                    <Check className="w-3.5 h-3.5 text-white" />
                </div>
            )}
        </div>
    );
};
