/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ink: {
          black: '#1a1a2e',
          deep: '#0f0f1a',
        },
        vermilion: {
          DEFAULT: '#c0392b',
          light: '#e74c3c',
        },
        bamboo: {
          DEFAULT: '#2d6a4f',
          light: '#40916c',
        },
        paper: {
          DEFAULT: '#f5f0e8',
          dark: '#e8e0d0',
        },
        bronze: {
          DEFAULT: '#b8860b',
          light: '#daa520',
        },
        smoke: {
          DEFAULT: '#4a4a5a',
          light: '#6a6a7a',
        },
      },
      fontFamily: {
        calligraphy: ['"Ma Shan Zheng"', 'cursive'],
        serif: ['"Noto Serif SC"', 'serif'],
      },
    },
  },
  plugins: [],
};
