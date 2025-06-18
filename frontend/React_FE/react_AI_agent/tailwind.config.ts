import type { Config } from 'tailwindcss';

const config: Config = {
  // safelist: [
  //   {
  //     pattern: /(bg|to|border|text)-(green|blue|purple|amber)-(400|500)/,
  //   },
  //   {
  //     pattern: /(bg|to|border|text)-(green|blue|purple|amber)-(500)\/(10|20|30)/,
  //   }
  // ],
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
        // We only keep the non-conflicting animations here.
        'connector-draw': 'dataStream 2s linear infinite',
        'schema-pulse': 'schemaPulse 4s ease-in-out infinite',
      },
      keyframes: {
        dataStream: {
          'from': { strokeDashoffset: '20' },
          'to': { strokeDashoffset: '0' }
        },
        schemaPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
};

export default config;