// "brand" y "accent" apuntan a variables CSS generadas desde los colores corporativos configurables
// (Configuración → Empresa). Cambiar el color no requiere recompilar.
function withOpacity(variable) {
  return ({ opacityValue }) =>
    opacityValue !== undefined ? `rgb(var(${variable}) / ${opacityValue})` : `rgb(var(${variable}))`
}
const ramp = (prefix) =>
  Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [k, withOpacity(`--${prefix}-${k}`)]))

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: ramp('brand'),
        accent: ramp('accent'),
        ink: {
          950: '#06070d',
          900: '#0b0d17',
          850: '#10131f',
          800: '#151927',
          700: '#1e2333',
          600: '#2a3044',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 6px 24px -10px rgb(15 23 42 / 0.14)',
        lift: '0 18px 50px -20px rgb(15 23 42 / 0.35)',
        glow: '0 0 0 1px rgb(var(--brand-500) / 0.3), 0 10px 36px -12px rgb(var(--brand-600) / 0.6)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(.97)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { opacity: 0, transform: 'translateX(24px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.2,.8,.2,1) both',
        'scale-in': 'scale-in .18s ease-out both',
        'slide-in': 'slide-in .28s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
}

