import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowRight, Tag, BookOpen, Cpu, Trophy, FlaskConical, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { blogPosts } from '../data/blogPosts';

const categories = [
    { id: 'all', label: 'All', icon: BookOpen },
    { id: 'Study Hacks', label: 'Study Hacks', icon: BookOpen },
    { id: 'Tech Trends', label: 'Tech & AI', icon: Cpu },
    { id: 'Sports Facts', label: 'Sports', icon: Trophy },
    { id: 'Science Facts', label: 'Science', icon: FlaskConical },
];

export const ContentDiscovery = () => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [visibleCount, setVisibleCount] = useState(9);
    const [selectedPost, setSelectedPost] = useState(null);

    const filteredPosts = useMemo(() => {
        if (activeCategory === 'all') return blogPosts;
        return blogPosts.filter(post => post.category === activeCategory);
    }, [activeCategory]);

    const displayPosts = filteredPosts.slice(0, visibleCount);

    return (
        <section className="relative z-20 bg-slate-100 dark:bg-black/50 border-t border-slate-200 dark:border-white/10 py-24 transition-colors duration-500">
            <div className="max-w-7xl mx-auto px-6">

                {/* Header */}
                <div className="mb-12 text-center">
                    <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
                        Knowledge Base
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-lg">
                        Curated insights for the modern student. Boost your productivity, stay ahead of tech trends, and learn something new.
                    </p>
                </div>

                {/* Sticky Filter Bar */}
                <div className="sticky top-20 z-40 mb-10 py-4 bg-slate-50/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md flex justify-center border-b border-transparent">
                    <div className="flex flex-wrap gap-2 justify-center p-1 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full shadow-sm">
                        {categories.map(cat => {
                            const Icon = cat.icon;
                            const isActive = activeCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setActiveCategory(cat.id);
                                        setVisibleCount(9); // Reset count on filter change
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 border border-transparent",
                                        isActive
                                            ? "bg-black text-white dark:bg-white dark:text-black shadow-lg scale-105"
                                            : "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Masonry Grid Layout */}
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                    <AnimatePresence mode='popLayout'>
                        {displayPosts.map((post, index) => (
                            <motion.article
                                key={post.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3 }}
                                className="break-inside-avoid mb-6"
                            >
                                <div
                                    onClick={() => setSelectedPost(post)}
                                    className="group relative bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-2xl hover:translate-y-[-4px] transition-all duration-300 cursor-pointer"
                                >

                                    {/* Image */}           <div className="h-48 overflow-hidden relative">
                                        <img
                                            src={post.image || `https://source.unsplash.com/random/800x600?${post.category}`}
                                            alt={post.title}
                                            loading="lazy"
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur text-white text-[10px] font-black uppercase px-2 py-1 rounded">
                                            {post.category}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-6">
                                        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-3">
                                            <Clock className="w-3 h-3" />
                                            <span>{post.readTime}</span>
                                        </div>

                                        <h3 className="text-xl font-bold leading-tight mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {post.title}
                                        </h3>

                                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4">
                                            {post.snippet}
                                        </p>

                                        <button className="flex items-center gap-1 text-sm font-bold text-black dark:text-white group-hover:gap-2 transition-all">
                                            Read Article <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.article>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Load More Trigger */}
                {visibleCount < filteredPosts.length && (
                    <div className="mt-20 text-center">
                        <button
                            onClick={() => setVisibleCount(prev => prev + 9)}
                            className="px-8 py-3 bg-white dark:bg-white/10 border border-black/10 dark:border-white/20 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
                        >
                            Load More Articles
                        </button>
                    </div>
                )}
            </div>
            {/* --- Reader Modal --- */}
            <AnimatePresence>
                {selectedPost && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
                        onClick={() => setSelectedPost(null)}
                    >
                        <motion.div
                            initial={{ y: 50, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 50, opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", bounce: 0.3 }}
                            className="bg-white dark:bg-[#0a0a0a] max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl relative border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-4 right-4 z-10">
                                <button
                                    onClick={() => setSelectedPost(null)}
                                    className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Hero Image */}
                            <div className="h-64 sm:h-80 w-full relative shrink-0">
                                <img
                                    src={selectedPost.image || `https://source.unsplash.com/random/1200x600?${selectedPost.category}`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute bottom-6 left-6 right-6">
                                    <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-black uppercase rounded mb-3 shadow-lg">
                                        {selectedPost.category}
                                    </span>
                                    <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                                        {selectedPost.title}
                                    </h2>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                <div className="prose dark:prose-invert prose-lg max-w-none prose-headings:font-black prose-p:text-slate-600 dark:prose-p:text-slate-400">
                                    <div dangerouslySetInnerHTML={{ __html: selectedPost.content || `<p class="italic text-gray-500">Generating full article content...</p>` }} />
                                </div>
                                <div className="mt-12 pt-8 border-t border-slate-200 dark:border-white/10 text-center">
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                        Thanks for reading!
                                    </p>
                                    <button
                                        onClick={() => setSelectedPost(null)}
                                        className="mt-4 px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-105 transition-transform"
                                    >
                                        Close Article
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section >
    );
};
