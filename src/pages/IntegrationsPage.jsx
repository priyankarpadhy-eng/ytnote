import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotionConnect } from '../components/integrations/NotionConnect';

export default function IntegrationsPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white p-8 font-sans">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" /> Back to App
                </button>

                <h1 className="text-4xl font-black tracking-tight mb-2">Integrations</h1>
                <p className="text-slate-500 dark:text-gray-400 mb-12 text-lg">
                    Supercharge your workflow by connecting your favorite tools.
                </p>

                {/* Grid of Integrations */}
                <div className="grid grid-cols-1 gap-6">
                    <NotionConnect />

                    {/* Placeholder for future integrations */}
                    <div className="p-6 bg-white dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl flex items-center justify-center text-slate-400">
                        <span className="text-sm font-bold uppercase tracking-widest">More Coming Soon</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
