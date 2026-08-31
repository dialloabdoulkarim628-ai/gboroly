/**
 * Gboroly — Tailwind preset (design tokens)
 * Charte : Navy #071B45, Blue #1269D3, Light Blue #2D8CFF, Orange #FF6A00,
 * Yellow #FFB20D, Green #18A957, Text #17233A, Gray #64748B, Background #F4F7FB
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#071B45',
          900: '#071B45',
          800: '#0C2456',
          700: '#12316F',
        },
        brand: {
          DEFAULT: '#1269D3',
          light: '#2D8CFF',
          dark: '#0E52A6',
        },
        energy: {
          DEFAULT: '#FF6A00',
          light: '#FF8A33',
        },
        victory: '#FFB20D',
        field: '#18A957',
        danger: '#E1483C',
        ink: '#17233A',
        muted: '#64748B',
        canvas: '#F4F7FB',
      },
      fontFamily: {
        sans: ['Poppins', 'Montserrat', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(7, 27, 69, 0.08), 0 1px 2px rgba(7, 27, 69, 0.06)',
      },
    },
  },
  plugins: [],
};
