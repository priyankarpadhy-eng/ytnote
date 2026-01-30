import React from 'react';
import { X, Download } from 'lucide-react';

export function PdfViewerModal({ url, onClose, fileName }) {
    if (!url) return null;

    // We use an iframe. Most modern browsers have a very good native PDF viewer.
    // However, to ensure it looks "app-like" and "Google-like", we wrap it nicely.
    // Note: We cannot easily control the iframe's internal zoom/scroll via external buttons 
    // without using a library like react-pdf or pdf.js directly.
    // But standard iframe viewers (Chrome) DO have these buttons.
    // We will trust the browser's native viewer for the heavy lifting (zoom/scroll) 
    // as it provides the most robust "PDF View" experience.

    return (
        <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
            {/* Floating Title (Top Left) */}
            <div className="absolute top-0 left-0 p-4 flex items-center gap-3 opacity-0 hover:opacity-100 transition-opacity duration-300 z-50">
                <span className="text-white/80 font-medium text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                    {fileName || 'Document.pdf'}
                </span>
            </div>

            {/* Floating Close Button (Top Right) - Always visible or on hover? Better always visible but subtle */}
            <button
                onClick={onClose}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 p-2 bg-black/50 hover:bg-white/20 text-white/70 hover:text-white rounded-full backdrop-blur-md transition-all border border-white/10 shadow-lg group"
                title="Close Viewer"
            >
                <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            {/* Viewer Content */}
            <div className="w-full h-full relative bg-white rounded-lg overflow-hidden shadow-2xl">
                <iframe
                    src={url}
                    className="w-full h-full rounded-lg shadow-2xl border border-gray-700 bg-white"
                    title="PDF Viewer"
                />
            </div>
        </div>
    );
}
