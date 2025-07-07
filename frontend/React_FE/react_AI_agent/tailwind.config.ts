// tailwind.config.js
module.exports = {
  theme: {
    extend: {
     keyframes: {
        'fade-in-slide-up': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'scan-pulse': { '0%, 100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(1.05)', opacity: '0.7' } },
        'shield-charge': { '0%, 100%': { filter: 'drop-shadow(0 0 2px #4ade80)' }, '50%': { filter: 'drop-shadow(0 0 10px #4ade80)' } },
        'pop-in': { '0%': { opacity: '0', transform: 'scale(0.5)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'line-draw': { to: { 'stroke-dashoffset': 0 } },
      },
      animation: {
        'fade-in-slide-up': 'fade-in-slide-up 0.5s ease-out forwards',
        'scan-pulse': 'scan-pulse 2.5s ease-in-out infinite',
        'shield-charge': 'shield-charge 2s ease-in-out infinite',
        'pop-in': 'pop-in 0.3s ease-out forwards',
        'line-draw': 'line-draw 1.5s ease-in-out forwards',
      },
    },
  },
  plugins: [],
};