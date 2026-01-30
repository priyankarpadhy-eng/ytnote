import React from 'react';
import GlobalMap from '../components/GlobalMap';
import { ArrowLeft, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function GlobalStudyPage() {
    return (
        <div className="min-h-screen bg-[#121212] text-white flex flex-col">
            {/* Header */}
            <header className="h-16 px-6 border-b border-gray-800 flex items-center justify-between shrink-0 bg-[#0a0a0a]">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-500" />
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                            Global Study Map
                        </h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6 flex flex-col items-center">
                <div className="max-w-6xl w-full h-[80vh] flex flex-col gap-4">



                    <div className="flex-1 w-full min-h-0">
                        <GlobalMap />
                    </div>

                </div>
            </main>
        </div>
    );
}
