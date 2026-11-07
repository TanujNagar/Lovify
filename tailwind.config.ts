import type { Config } from 'tailwindcss'

/**
 * Every colour token below is copied from the Stitch design system.
 * Values live as RGB channels in src/styles/tokens.css so the rose-tinted
 * light theme can override them while Tailwind opacity modifiers keep working.
 */
const tokenNames = [
  'on-primary-container',
  'on-error-container',
  'surface-bright',
  'outline-variant',
  'tertiary-fixed',
  'on-surface-variant',
  'tertiary',
  'background',
  'error',
  'on-error',
  'secondary-container',
  'surface-tint',
  'surface-container-high',
  'secondary-fixed',
  'inverse-on-surface',
  'surface-container',
  'inverse-primary',
  'secondary',
  'outline',
  'surface-container-highest',
  'primary',
  'on-background',
  'on-tertiary-fixed-variant',
  'primary-container',
  'on-tertiary-fixed',
  'on-secondary-container',
  'inverse-surface',
  'on-primary-fixed-variant',
  'on-tertiary',
  'on-secondary-fixed-variant',
  'surface-variant',
  'on-secondary-fixed',
  'surface',
  'tertiary-container',
  'on-primary',
  'on-surface',
  'tertiary-fixed-dim',
  'error-container',
  'on-primary-fixed',
  'surface-container-low',
  'secondary-fixed-dim',
  'on-secondary',
  'on-tertiary-container',
  'primary-fixed-dim',
  'primary-fixed',
  'surface-container-lowest',
  'surface-dim',
] as const

const colors = Object.fromEntries(
  tokenNames.map((name) => [
    name,
    `rgb(var(--c-${name}) / <alpha-value>)`,
  ]),
)

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors,
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        margin: '1.25rem',
        'space-xs': '0.25rem',
        gutter: '1rem',
        'space-xl': '2rem',
        'space-lg': '1.5rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'title-md': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'title-lg': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'headline-md': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'body-lg': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'headline-lg': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'label-md': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'display-lg-mobile': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'label-lg': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'body-md': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        caption: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'display-lg': ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'title-md': ['16px', { lineHeight: '22px', fontWeight: '600' }],
        'title-lg': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'headline-md': ['22px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['15px', { lineHeight: '22px', fontWeight: '500' }],
        'headline-lg': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'label-md': ['11px', { lineHeight: '14px', fontWeight: '600' }],
        'display-lg-mobile': [
          '32px',
          { lineHeight: '40px', fontWeight: '700' },
        ],
        'label-lg': ['13px', { lineHeight: '18px', fontWeight: '600' }],
        'body-md': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        caption: ['10px', { lineHeight: '12px', fontWeight: '500' }],
        'display-lg': ['40px', { lineHeight: '48px', fontWeight: '700' }],
      },
      keyframes: {
        'eq-1': {
          '0%, 100%': { height: '0.5rem' },
          '50%': { height: '1rem' },
        },
        'eq-2': {
          '0%, 100%': { height: '0.75rem' },
          '50%': { height: '1.25rem' },
        },
        'eq-3': {
          '0%, 100%': { height: '0.375rem' },
          '50%': { height: '0.875rem' },
        },
        'sheet-in': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'eq-1': 'eq-1 0.6s ease-in-out infinite',
        'eq-2': 'eq-2 0.8s ease-in-out 0.15s infinite',
        'eq-3': 'eq-3 0.5s ease-in-out 0.3s infinite',
        'sheet-in': 'sheet-in 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 200ms ease-out',
        'rise-in': 'rise-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
} satisfies Config
