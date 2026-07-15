/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#20291F',
        paper: '#FAF6EC',
        'paper-line': '#E4DBC4',
        green: {
          DEFAULT: '#163A2E',
          dark: '#0E271F',
        },
        gold: '#C9A227',
        red: {
          DEFAULT: '#B33A3A',
          bg: '#F6E7E5',
        },
        teal: {
          DEFAULT: '#2F6F62',
          bg: '#E7F0EC',
        },
        'card-border': '#DAD2BC',
        'sidebar-text': '#D9D4C2',
        'sidebar-active': '#F2EFE4',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
