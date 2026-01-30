import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

// 1 day in seconds = 86400. If we receive a huge number, it's milliseconds from epoch.
export const formatTime = (timeValue) => {
    // If it's a timestamp (huge number), format as time of day
    if (timeValue > 86400000) { // > 1 day in ms
        return new Date(timeValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Otherwise treat as video seconds
    const date = new Date(timeValue * 1000)
    const hh = date.getUTCHours()
    const mm = date.getUTCMinutes()
    const ss = String(date.getUTCSeconds()).padStart(2, "0")
    if (hh) {
        return `${hh}:${String(mm).padStart(2, "0")}:${ss}`
    }
    return `${mm}:${ss}`
}
