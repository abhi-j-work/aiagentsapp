/** @type {import('tailwindcss').Config} */
export default {
  safelist: [
    {
      pattern: /(bg|to|border|text)-(green|blue|purple|amber)-(400|500)/,
    },
    {
      pattern: /(bg|to|border|text)-(green|blue|purple|amber)-(500)\/(10|20|30)/,
    }
  ],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        geist: ['Geist', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        manrope: ['Manrope', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'connector-draw': 'connector-draw 2s linear infinite',
        'schema-pulse': 'schemaPulse 4s ease-in-out infinite',
        'icon-float-1': 'float 4s ease-in-out infinite -1s',
        'icon-float-2': 'float 4s ease-in-out infinite -2s',
        'icon-float-3': 'float 4s ease-in-out infinite -3s',
        'icon-float-4': 'float 4s ease-in-out infinite -4s',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        connector-draw: {
          'from': { strokeDashoffset: 20 },
          'to': { strokeDashoffset: 0 }
        },
        schemaPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: 0.8 },
          '50%': { transform: 'scale(1.05)', opacity: 1 }
        }
      }
    },
  },
  plugins: [],
}