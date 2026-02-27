

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F5F3B',
          50: '#F0F7F2',
          100: '#D8EAD6',
          200: '#B8D9B7',
          300: '#92C492',
          400: '#6AAD6D',
          500: '#4CAF50',
          600: '#3D8B40',
          700: '#2F6A30',
          800: '#224920',
          900: '#172E15',
        },
        secondary: '#4CAF50',
        accent: '#D4AF37',
        background: '#FFF6E5',
        text: '#4A2C1D',
        cream: '#FFF6E5',
        brown: '#4A2C1D',
        deepgreen: '#1F5F3B',
        leafgreen: '#4CAF50',
        gold: '#D4AF37',
      },
      keyframes: {
        moveRight: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(20px)' },
        },
      },
      animation: {
        moveRight: 'moveRight 2s infinite',
      },
    },
  },
  plugins: [],
}