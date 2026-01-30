import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
    // 'light', 'dark', or 'system'
    const [themeMode, setThemeMode] = useState(() => {
        return localStorage.getItem('lecturesnap-theme-mode') || 'system';
    });

    const [isDarkMode, setIsDarkMode] = useState(() => {
        const mode = localStorage.getItem('lecturesnap-theme-mode') || 'system';
        if (mode === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return mode === 'dark';
    });

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            if (themeMode === 'system') {
                setIsDarkMode(e.matches);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [themeMode]);

    // Apply theme to document
    useEffect(() => {
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [isDarkMode]);

    // Save preference
    useEffect(() => {
        localStorage.setItem('lecturesnap-theme-mode', themeMode);
    }, [themeMode]);

    const setTheme = (mode) => {
        setThemeMode(mode);
        if (mode === 'system') {
            setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        } else {
            setIsDarkMode(mode === 'dark');
        }
    };

    const toggleTheme = () => {
        setTheme(isDarkMode ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, themeMode, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
