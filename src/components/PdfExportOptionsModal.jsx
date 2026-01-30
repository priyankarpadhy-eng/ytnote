import React from 'react';
import { LayoutTemplate, Layers, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

export function PdfExportOptionsModal({ isOpen, onClose, onConfirm, action, fileName }) {
    const [layout, setLayout] = React.useState('single'); // 'single' or 'double'

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">PDF Layout</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Choose how your notes appear in the {action === 'view' ? 'preview' : 'export'}.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-4">
                    <div
                        onClick={() => setLayout('single')}
                        className={cn(
                            "cursor-pointer relative p-4 rounded-xl border-2 transition-all flex items-start gap-4 hover:shadow-md",
                            layout === 'single'
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
                        )}
                    >
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 shrink-0">
                            <LayoutTemplate className={cn("w-6 h-6", layout === 'single' ? "text-blue-500" : "text-gray-400")} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className={cn("font-bold text-base", layout === 'single' ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300")}>Standard Layout</h3>
                                {layout === 'single' && <div className="bg-blue-500 rounded-full p-1"><Check className="w-3 h-3 text-white" /></div>}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                1 Screenshot per page.
                                <br />Best for detailed notes and readability.
                            </p>
                        </div>
                    </div>

                    <div
                        onClick={() => setLayout('double')}
                        className={cn(
                            "cursor-pointer relative p-4 rounded-xl border-2 transition-all flex items-start gap-4 hover:shadow-md",
                            layout === 'double'
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
                        )}
                    >
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 shrink-0">
                            <Layers className={cn("w-6 h-6", layout === 'double' ? "text-blue-500" : "text-gray-400")} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className={cn("font-bold text-base", layout === 'double' ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300")}>Compact Layout</h3>
                                {layout === 'double' && <div className="bg-blue-500 rounded-full p-1"><Check className="w-3 h-3 text-white" /></div>}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                2 Screenshots per page.
                                <br />Best for slides and visual overviews.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-2">
                    <button
                        onClick={() => onConfirm(layout)}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {action === 'view' ? 'Generate & View PDF' : 'Generate & Download PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
}
