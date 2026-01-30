import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Folder, FileText, X, Search, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function LocationPickerModal({ isOpen, onClose, folders, files, onSelectFile, onSelectFolder, activeFolderId, activeFileId }) {
    if (!isOpen) return null;

    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    const toggleFolder = (folderId) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    const filteredFolders = (folders || []).filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white dark:bg-[#121212] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10 flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wider text-gray-500">Choose Save Location</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search folders..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {/* OPTION: GENERAL (Root) */}
                    <div
                        onClick={() => onSelectFolder('default')}
                        className={cn(
                            "p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between transition-colors group",
                            activeFolderId === 'default' && !activeFileId && "bg-blue-500/10 border border-blue-500/20"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                <Folder className="w-4 h-4" />
                            </div>
                            <span className={cn("text-sm font-bold", activeFolderId === 'default' && !activeFileId && "text-blue-500")}>General (No File)</span>
                        </div>
                        {activeFolderId === 'default' && !activeFileId && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-white/5 my-2 mx-2" />

                    {filteredFolders?.map(folder => {
                        const folderFiles = (files || []).filter(file => file.folderId === folder.id);
                        const isExpanded = expandedFolders.has(folder.id) || searchTerm.length > 0;

                        return (
                            <div key={folder.id} className="overflow-hidden rounded-xl border border-transparent dark:border-transparent hover:border-gray-100 dark:hover:border-white/5">
                                <div
                                    onClick={() => onSelectFolder(folder.id)}
                                    className={cn(
                                        "p-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between group transition-colors select-none",
                                        activeFolderId === folder.id && !activeFileId && "bg-blue-500/5"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"
                                            style={{ backgroundColor: `${folder.color}20`, color: folder.color }}
                                        >
                                            <Folder className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={cn("text-sm font-bold", activeFolderId === folder.id && !activeFileId && "text-blue-500")}>{folder.name}</span>
                                            {activeFolderId === folder.id && !activeFileId && <span className="text-[8px] font-black text-blue-500 uppercase">Current Target</span>}
                                        </div>
                                        <span className="text-[10px] bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-400 font-mono">
                                            {folderFiles.length}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {activeFolderId === folder.id && !activeFileId && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                                        {folderFiles.length > 0 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
                                                className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md transition-colors"
                                            >
                                                <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", !isExpanded && "-rotate-90")} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && folderFiles.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5"
                                        >
                                            {folderFiles.map(file => (
                                                <div
                                                    key={file.id}
                                                    onClick={() => onSelectFile(file, folder)}
                                                    className={cn(
                                                        "pl-14 pr-4 py-2 hover:bg-blue-500/10 hover:text-blue-500 cursor-pointer flex items-center justify-between text-sm font-medium transition-all",
                                                        activeFileId === file.id ? "bg-blue-500/10 text-blue-500 border-l-2 border-blue-500" : "text-gray-600 dark:text-gray-400 border-l-2 border-transparent"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        {file.name}
                                                    </div>
                                                    {activeFileId === file.id && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                                                </div>
                                            ))}
                                            <div className="h-1" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}

                    {filteredFolders.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            No folders found.
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20 text-[10px] text-gray-400 text-center">
                    Select a file to automatically save new screenshots there.
                </div>
            </div>
        </div>
    );
}
