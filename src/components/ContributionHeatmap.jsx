import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Flame, TrendingUp, Calendar, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Premium GitHub-Style Contribution Heatmap
 * - Neubrutalist design with glassmorphism accents
 * - Full 12-month grid with proper weekday alignment
 * - 5 intensity levels with vibrant color scales
 * - Animated tooltips and hover states
 * - Mobile-responsive with horizontal scroll
 */

// Generate complete year data with proper alignment
function generateYearData(rawData = []) {
    const year = new Date().getFullYear();
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);

    // Create lookup map
    const dataMap = new Map();
    rawData.forEach(item => {
        const key = new Date(item.date).toISOString().split('T')[0];
        dataMap.set(key, item.count || 0);
    });

    // Start from the Sunday before Jan 1
    const startOffset = firstDay.getDay();
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startOffset);

    const days = [];
    const current = new Date(startDate);

    // Generate ~53 weeks of cells
    while (current <= lastDay || current.getDay() !== 0) {
        const dateStr = current.toISOString().split('T')[0];
        const count = dataMap.get(dateStr) || 0;
        const isCurrentYear = current.getFullYear() === year;
        const isToday = current.toDateString() === new Date().toDateString();

        days.push({
            date: new Date(current),
            dateString: dateStr,
            count,
            level: count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4,
            isCurrentYear,
            isToday,
            isEmpty: !isCurrentYear
        });

        current.setDate(current.getDate() + 1);
    }

    return days;
}

// Individual cell component
const Cell = React.memo(({ day, onHover, onClick }) => {
    const colors = [
        // Level 0 - Empty
        'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
        // Level 1 - Light
        'bg-emerald-200 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700',
        // Level 2 - Medium
        'bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600',
        // Level 3 - High
        'bg-emerald-500 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-400',
        // Level 4 - Peak
        'bg-emerald-600 dark:bg-emerald-400 border-emerald-700 dark:border-emerald-300'
    ];

    if (day.isEmpty) {
        return <div className="w-[13px] h-[13px] rounded-[3px]" />;
    }

    return (
        <motion.div
            whileHover={{ scale: 1.4, zIndex: 50 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={(e) => onHover(e, day)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick?.(day)}
            className={cn(
                "w-[13px] h-[13px] rounded-[3px] border cursor-pointer transition-shadow duration-200",
                colors[day.level],
                day.isToday && "ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900",
                day.level > 0 && "hover:shadow-lg hover:shadow-emerald-500/30"
            )}
        />
    );
});

// Stats summary component
const StatsBar = ({ data }) => {
    const stats = useMemo(() => {
        const currentYear = data.filter(d => d.isCurrentYear);
        const totalSnaps = currentYear.reduce((sum, d) => sum + d.count, 0);
        const activeDays = currentYear.filter(d => d.count > 0).length;
        const currentStreak = (() => {
            let streak = 0;
            const today = new Date().toISOString().split('T')[0];
            const sorted = [...currentYear].reverse();
            for (const day of sorted) {
                if (day.dateString <= today && day.count > 0) streak++;
                else if (day.dateString <= today && day.count === 0) break;
            }
            return streak;
        })();
        const bestDay = currentYear.reduce((best, d) => d.count > best.count ? d : best, { count: 0 });

        return { totalSnaps, activeDays, currentStreak, bestDay };
    }, [data]);

    return (
        <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl border border-emerald-500/20">
                <Zap className="w-4 h-4 text-emerald-500" />
                <div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">{stats.totalSnaps}</div>
                    <div className="text-[9px] font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest">Total Snaps</div>
                </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl border border-blue-500/20">
                <Calendar className="w-4 h-4 text-blue-500" />
                <div>
                    <div className="text-lg font-black text-blue-600 dark:text-blue-400 leading-none">{stats.activeDays}</div>
                    <div className="text-[9px] font-bold text-blue-600/60 dark:text-blue-400/60 uppercase tracking-widest">Active Days</div>
                </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl border border-orange-500/20">
                <Flame className="w-4 h-4 text-orange-500" />
                <div>
                    <div className="text-lg font-black text-orange-600 dark:text-orange-400 leading-none">{stats.currentStreak}</div>
                    <div className="text-[9px] font-bold text-orange-600/60 dark:text-orange-400/60 uppercase tracking-widest">Day Streak</div>
                </div>
            </div>

            {stats.bestDay.count > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl border border-purple-500/20">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    <div>
                        <div className="text-lg font-black text-purple-600 dark:text-purple-400 leading-none">{stats.bestDay.count}</div>
                        <div className="text-[9px] font-bold text-purple-600/60 dark:text-purple-400/60 uppercase tracking-widest">Best Day</div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Main Heatmap Component
export function ContributionHeatmap({ data = [], onCellClick, className }) {
    const [tooltip, setTooltip] = useState(null);

    const yearData = useMemo(() => generateYearData(data), [data]);

    // Group into weeks (columns)
    const weeks = useMemo(() => {
        const result = [];
        for (let i = 0; i < yearData.length; i += 7) {
            result.push(yearData.slice(i, i + 7));
        }
        return result;
    }, [yearData]);

    // Calculate month label positions
    const monthLabels = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const labels = [];
        let lastMonth = -1;

        weeks.forEach((week, idx) => {
            const validDay = week.find(d => d.isCurrentYear);
            if (validDay) {
                const month = validDay.date.getMonth();
                if (month !== lastMonth) {
                    labels.push({ name: months[month], weekIndex: idx });
                    lastMonth = month;
                }
            }
        });

        return labels;
    }, [weeks]);

    const handleHover = useCallback((e, day) => {
        if (!e || !day) return setTooltip(null);
        setTooltip({ x: e.clientX, y: e.clientY, day });
    }, []);

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className={cn(
            "relative p-6 md:p-8 rounded-3xl",
            "bg-white dark:bg-slate-900",
            "border border-slate-200 dark:border-slate-700/50",
            "shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50",
            className
        )}>
            {/* Floating Tooltip */}
            <AnimatePresence>
                {tooltip && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 8 }}
                        className="fixed z-[100] pointer-events-none"
                        style={{
                            left: tooltip.x,
                            top: tooltip.y - 10,
                            transform: 'translate(-50%, -100%)'
                        }}
                    >
                        <div className="px-4 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl border border-slate-700 dark:border-slate-200 min-w-[160px]">
                            <div className="text-center">
                                <div className="text-2xl font-black leading-none mb-1">
                                    <span className="text-emerald-400 dark:text-emerald-600">{tooltip.day.count}</span>
                                    <span className="text-slate-400 dark:text-slate-500 text-sm font-bold ml-1">snaps</span>
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    {formatDate(tooltip.day.date)}
                                </div>
                            </div>
                        </div>
                        <div className="w-3 h-3 bg-slate-900 dark:bg-white rotate-45 mx-auto -mt-1.5 border-r border-b border-slate-700 dark:border-slate-200" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                            Study Activity
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {new Date().getFullYear()} Contribution Graph
                        </p>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Less</span>
                    <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map((level) => (
                            <div
                                key={level}
                                className={cn(
                                    "w-3 h-3 rounded-[3px] border transition-transform hover:scale-125",
                                    level === 0 && "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",
                                    level === 1 && "bg-emerald-200 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700",
                                    level === 2 && "bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600",
                                    level === 3 && "bg-emerald-500 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-400",
                                    level === 4 && "bg-emerald-600 dark:bg-emerald-400 border-emerald-700 dark:border-emerald-300"
                                )}
                            />
                        ))}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">More</span>
                </div>
            </div>

            {/* Stats Bar */}
            <StatsBar data={yearData} />

            {/* Heatmap Grid */}
            <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                <div className="min-w-max">
                    {/* Month Labels Row */}
                    <div className="flex mb-2">
                        <div className="w-8 shrink-0" /> {/* Spacer for day labels */}
                        <div className="flex relative" style={{ width: weeks.length * 16 }}>
                            {monthLabels.map((label, idx) => (
                                <div
                                    key={idx}
                                    className="absolute text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                                    style={{ left: label.weekIndex * 16 }}
                                >
                                    {label.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Grid with Day Labels */}
                    <div className="flex">
                        {/* Weekday Labels */}
                        <div className="flex flex-col gap-[3px] pr-2 shrink-0 w-8">
                            {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, i) => (
                                <div key={i} className="h-[13px] flex items-center">
                                    <span className="text-[9px] font-bold text-slate-400">{day}</span>
                                </div>
                            ))}
                        </div>

                        {/* Weeks */}
                        <div className="flex gap-[3px]">
                            {weeks.map((week, weekIdx) => (
                                <div key={weekIdx} className="flex flex-col gap-[3px]">
                                    {week.map((day, dayIdx) => (
                                        <Cell
                                            key={dayIdx}
                                            day={day}
                                            onHover={handleHover}
                                            onClick={onCellClick}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>Click on a day to view snapshots</span>
                <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Updated just now
                </span>
            </div>
        </div>
    );
}

export default ContributionHeatmap;
