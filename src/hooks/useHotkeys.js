import { useEffect, useRef, useCallback } from 'react';

export function useHotkeys(handlers) {
    // Keep track of held keys for complex chords if needed
    // But for standard Ctrl+Shift+S, event.shiftKey etc work fine.

    useEffect(() => {
        const handleKeyDown = (event) => {
            const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;

            // 1. Sidebar Toggle: Ctrl + Shift + S
            if (event.ctrlKey && event.shiftKey && event.code === 'KeyS') {
                console.log("Hotkeys: Sidebar Toggle");
                event.preventDefault();
                handlers.toggleSidebar && handlers.toggleSidebar();
                return;
            }

            // 2. Capture: Shift + S (only if not typing)
            if (event.shiftKey && event.code === 'KeyS' && !event.ctrlKey && !isInput) {
                console.log("Hotkeys: Capture Triggered");
                event.preventDefault();
                handlers.capture && handlers.capture();
                return;
            }

            // Other shortcuts need to respect input focus
            if (isInput) return;

            // 2. Alt + P (Play/Pause)
            if (event.altKey && event.code === 'KeyP') {
                event.preventDefault();
                handlers.togglePlay && handlers.togglePlay();
            }

            // 3. Alt + Arrows (Seek)
            if (event.altKey && event.code === 'ArrowLeft') {
                event.preventDefault();
                handlers.seekBackward && handlers.seekBackward();
            }
            if (event.altKey && event.code === 'ArrowRight') {
                event.preventDefault();
                handlers.seekForward && handlers.seekForward();
            }

            // 4. Ctrl + Enter (Focus Note)
            if (event.ctrlKey && event.code === 'Enter') {
                event.preventDefault();
                handlers.focusNote && handlers.focusNote();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlers]);
}
