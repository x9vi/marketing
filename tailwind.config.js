/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07111f',
          900: '#0b1726',
          800: '#10243a'
        },
        gold: {
          400: '#f4c76e',
          500: '#e8b84f',
          600: '#d89e1f'
        },
        mint: {
          400: '#7ee0c5',
          500: '#46c9a3'
        }
      },
      boxShadow: {
        glow: '0 20px 60px rgba(8, 16, 31, 0.35)'
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'radial-grid': 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)',
        'hero-gradient': 'linear-gradient(135deg, rgba(13,25,43,1) 0%, rgba(16,36,58,1) 40%, rgba(7,17,31,1) 100%)'
      }
    }
  },
  plugins: []
};
