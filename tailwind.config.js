/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        saffron: {
          50:  '#fff8f0',
          100: '#fff0d9',
          200: '#fddda3',
          300: '#fbc463',
          400: '#f9a52b',
          500: '#f78a0a',
          600: '#e06e05',
          700: '#ba5108',
          800: '#94400e',
          900: '#78360f',
        },
        ganesh: {
          orange: '#F97316',
          deep:   '#C2410C',
          gold:   '#F59E0B',
          green:  '#16A34A',
          red:    '#DC2626',
        }
      },
      fontFamily: {
        display: ['Georgia', 'Times New Roman', 'serif'],
        body:    ['system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-soft': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
      }
    },
  },
  plugins: [],
}
