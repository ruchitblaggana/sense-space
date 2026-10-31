/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F5EF',
        softwhite: '#FFFFFF',
        ink: {
          DEFAULT: '#252D32',
          soft: '#3A434A',
        },
        blue: {
          DEFAULT: '#567A92',
          deep: '#44667C',
          pale: '#A9BECB',
        },
        teal: {
          DEFAULT: '#75A99C',
          deep: '#5E8C7F',
          pale: '#BBD4CC',
        },
        clay: {
          DEFAULT: '#D98968',
          deep: '#BE7350',
          pale: '#ECC8B5',
        },
        sand: '#E8E0D1',
        sanddeep: '#D6CBB4',
        muted: '#68747A',
        mutedlight: '#9AA4A9',
        line: '#DAD4C4',
        lineSoft: '#E6E1D5',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Newsreader"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'dash-move': {
          '0%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '-16' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'pulse-soft': 'pulse-soft 1.5s ease-in-out infinite',
        'dash-move': 'dash-move 0.6s linear infinite',
      },
    },
  },
  plugins: [],
};
