/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1240px' },
    },
    extend: {
      screens: {
        // Layout lado a lado do topo: só em telas largas E deitadas (tablet em pé usa o layout empilhado)
        wide: { raw: '(min-width: 768px) and (min-aspect-ratio: 1/1)' },
        'wide-lg': { raw: '(min-width: 1024px) and (min-aspect-ratio: 1/1)' },
      },
      colors: {
        obsidian: '#020203',
        // Superfícies opacas (modais, campos)
        canvas: {
          DEFAULT: '#040406',
          raised: '#0a0a10',
          card: '#0d0d15',
          hover: '#13131d',
        },
        ink: {
          DEFAULT: '#f4f5fb',
          muted: '#a1a3b8',
          subtle: '#686a82',
        },
        // Paleta neon
        electric: '#3b9eff',
        neon: {
          cyan: '#22d3ee',
          violet: '#8b5cf6',
          pink: '#d946ef',
          emerald: '#10d9a0',
        },
        accent: {
          DEFAULT: '#5aa9ff',
          soft: '#a5cfff',
          deep: '#2563eb',
        },
        line: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.16)',
        },
      },
      fontFamily: {
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        mega: ['clamp(3.5rem, 8.6vw, 8rem)', { lineHeight: '0.92', letterSpacing: '-0.055em' }],
        h2: ['clamp(2.25rem, 5.2vw, 4.25rem)', { lineHeight: '1', letterSpacing: '-0.045em' }],
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
