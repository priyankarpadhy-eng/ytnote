/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      colors: {
        dark: {
          bg: '#121212',
          surface: '#1E1E1E',
          accent: '#3B82F6',
        },
        light: {
          bg: '#F9FAFB',
          surface: '#FFFFFF',
          text: '#111827',
        }
      }
    },
  },
  plugins: [],
}
