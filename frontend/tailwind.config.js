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
        // Core backgrounds — cyber noir
        bg: {
          void:      '#020617',   // deepest black
          primary:   '#020617',
          secondary: '#0f172a',   // slate-900
          tertiary:  '#1e293b',   // slate-800
          card:      '#0f172a',
          glass:     'rgba(15,23,42,0.8)',
        },
        // Ferrari Red — primary accent
        neon: {
          red:   '#dc143c',
          'red-dim':  'rgba(220,20,60,0.15)',
          'red-glow': 'rgba(220,20,60,0.4)',
        },
        ferrari: {
          50:  '#fff5f5',
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
        gold: {
          50:  '#fefdf8',
          100: '#fefcf0',
          300: '#fdf4cd',
          400: '#fce8a6',
          500: '#d4af37',
          600: '#c9a020',
          700: '#a68b1a',
        },
        // Severity
        critical: { 500: '#e8001c', 600: '#dc143c' },
        high:     { 500: '#d4af37', 600: '#c9a020' },
        medium:   { 500: '#f97316', 600: '#ea7316' },
        low:      { 500: '#22c55e', 600: '#16a34a' },
        info:     { 500: '#38bdf8', 600: '#0ea5e9' },
        // Text
        text: {
          primary:   '#f1f5f9',
          secondary: '#94a3b8',
          muted:     '#475569',
          dim:       '#334155',
          accent:    '#d4af37',
          neon:      '#dc143c',
        },
        // Borders
        border: {
          dim:    '#1e293b',
          subtle: '#334155',
          neon:   'rgba(220,20,60,0.3)',
        },
        // Surface
        surface: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
        code:    ['Fira Code', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        display: ['Bebas Neue', 'monospace'],
      },
      borderRadius: {
        sharp: '2px',
      },
      backgroundImage: {
        'grid-cyber':       'linear-gradient(rgba(220,20,60,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(220,20,60,0.03) 1px, transparent 1px)',
        'gradient-void':    'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)',
        'gradient-neon':    'linear-gradient(135deg, #dc143c 0%, #e8001c 100%)',
        'gradient-gold':    'linear-gradient(135deg, #d4af37 0%, #c9a020 100%)',
        'gradient-hero':    'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(220,20,60,0.12) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'neon':      '0 0 20px rgba(220,20,60,0.35), 0 0 60px rgba(220,20,60,0.12)',
        'neon-sm':   '0 0 10px rgba(220,20,60,0.25)',
        'neon-lg':   '0 0 40px rgba(220,20,60,0.5), 0 0 80px rgba(220,20,60,0.2)',
        'gold':      '0 0 15px rgba(212,175,55,0.25)',
        'card':      '0 4px 24px rgba(0,0,0,0.4)',
        'inset-neon':'inset 0 0 20px rgba(220,20,60,0.05)',
        'ferrari':   '0 0 20px rgba(220, 20, 60, 0.3)',
        'ferrari-lg':'0 0 40px rgba(220, 20, 60, 0.4)',
      },
      animation: {
        'scanline':    'scanline 8s linear infinite',
        'pulse-neon':  'pulse-neon 2.5s ease-in-out infinite',
        'flicker':     'flicker 4s linear infinite',
        'typewriter':  'typewriter 0.05s steps(1) infinite',
      },
      keyframes: {
        scanline: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(220,20,60,0.35)' },
          '50%':      { boxShadow: '0 0 40px rgba(220,20,60,0.7)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%':      { opacity: '1' },
          '93%':      { opacity: '0.8' },
          '94%':      { opacity: '1' },
          '96%':      { opacity: '0.9' },
          '97%':      { opacity: '1' },
        },
      },
      dropShadow: {
        'neon': '0 0 8px rgba(220,20,60,0.8)',
        'gold': '0 0 8px rgba(212,175,55,0.6)',
      },
    },
  },
  plugins: [],
}
