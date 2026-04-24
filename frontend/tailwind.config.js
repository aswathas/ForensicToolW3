/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Ferrari Red - Primary accent (high severity)
        ferrari: {
          50: '#fff5f5',
          100: '#ffe6e6',
          200: '#ffcccc',
          300: '#ff9999',
          400: '#ff6666',
          500: '#e8001c',
          600: '#dc143c',
          700: '#b91c1c',
          800: '#8b0000',
          900: '#660000',
        },
        // Gold/Brass - Premium accent (medium/warning)
        gold: {
          50: '#fefdf8',
          100: '#fefcf0',
          200: '#fef9e7',
          300: '#fdf4cd',
          400: '#fce8a6',
          500: '#d4af37',
          600: '#c9a020',
          700: '#a68b1a',
          800: '#7a6414',
          900: '#4a3c0f',
        },
        // Critical - Ferrari Red tones
        critical: {
          50: '#fff5f5',
          100: '#ffe6e6',
          500: '#e8001c',
          600: '#dc143c',
          700: '#b91c1c',
          900: '#660000',
        },
        high: {
          50: '#fef9f0',
          100: '#fdf4cd',
          500: '#d4af37',
          600: '#c9a020',
          700: '#a68b1a',
        },
        medium: {
          50: '#fffbf0',
          100: '#fff8e6',
          500: '#ffa500',
          600: '#ff9500',
          700: '#cc7700',
        },
        low: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        info: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
        surface: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        bg: {
          primary: '#0a0a0a',     // Deep black
          secondary: '#1a1a1a',   // Dark charcoal
          tertiary: '#2d2d2d',    // Charcoal
          accent: '#dc143c',      // Ferrari red
        },
        text: {
          primary: '#f5f5f5',     // Off-white
          secondary: '#d1d5db',   // Light gray
          muted: '#9ca3af',       // Medium gray
          accent: '#d4af37',      // Gold
        },
        accent: {
          primary: '#dc143c',     // Ferrari red
          success: '#10b981',     // Emerald
          warning: '#d4af37',     // Gold
          danger: '#e8001c',      // Deep ferrari red
        },
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        'gradient-ferrari': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2d2d2d 100%)',
        'gradient-red': 'linear-gradient(135deg, #dc143c 0%, #e8001c 100%)',
        'gradient-gold': 'linear-gradient(135deg, #d4af37 0%, #c9a020 100%)',
      },
      boxShadow: {
        'ferrari': '0 0 20px rgba(220, 20, 60, 0.3)',
        'ferrari-lg': '0 0 40px rgba(220, 20, 60, 0.4)',
        'gold': '0 0 15px rgba(212, 175, 55, 0.2)',
      },
    },
  },
  plugins: [],
};
