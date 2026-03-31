const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'neutral-950':  '#0a0a0a',
        'neutral-900':  '#171717',
        'muay-red':     '#DC2626',
        'muay-red-bright': '#EF4444',
        'red-900':      '#7F1D1D',
        'neutral-500':  '#737373',
        'muay-border':  'rgba(220,38,38,0.22)',
      },
      fontFamily: {
        display: ['var(--font-banditos)', 'Impact', 'sans-serif'],
        teko:    ['var(--font-teko)', 'sans-serif'],
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 }
        },
        marquee: {
          '0%':   { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' }
        },
        blink: {
          '0%':   { opacity: 0.2 },
          '20%':  { opacity: 1 },
          '100%': { opacity: 0.2 }
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        fadeIn:   'fadeIn .3s ease-in-out',
        carousel: 'marquee 60s linear infinite',
        blink:    'blink 1.4s both infinite',
        shimmer:  'shimmer 2s linear infinite'
      }
    }
  },
  future: {
    hoverOnlyWhenSupported: true
  },
  plugins: [
    require('@tailwindcss/container-queries'),
    require('@tailwindcss/typography'),
    plugin(({ matchUtilities, theme }) => {
      matchUtilities(
        {
          'animation-delay': (value) => ({ 'animation-delay': value })
        },
        { values: theme('transitionDelay') }
      );
    })
  ]
};
