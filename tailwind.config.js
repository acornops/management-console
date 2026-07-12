/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-brown': 'rgb(var(--logo-brown-rgb) / <alpha-value>)',
        'brand-cream': 'rgb(var(--logo-cream-rgb) / <alpha-value>)',
        'brand-brown-dark': 'oklch(0.278 0.03 250)',
        'brand-orange': 'rgb(var(--brand-orange-rgb) / <alpha-value>)',
        'brand-orange-strong': 'rgb(var(--brand-orange-strong-rgb) / <alpha-value>)',
        'brand-orange-bright': 'rgb(var(--brand-orange-bright-rgb) / <alpha-value>)',
        'brand-orange-readable': 'rgb(var(--brand-orange-readable-rgb) / <alpha-value>)',
        'brand-orange-soft': 'rgb(var(--brand-orange-soft-rgb) / <alpha-value>)',
        accent: 'rgb(var(--brand-orange-rgb) / <alpha-value>)',
        'accent-bright': 'rgb(var(--brand-orange-bright-rgb) / <alpha-value>)',
        'accent-strong': 'rgb(var(--brand-orange-strong-rgb) / <alpha-value>)',
        'accent-readable': 'rgb(var(--brand-orange-readable-rgb) / <alpha-value>)',
        'accent-soft': 'rgb(var(--brand-orange-soft-rgb) / <alpha-value>)',
        'ui-bg': 'rgb(var(--bg-rgb) / <alpha-value>)',
        'ui-surface': 'rgb(var(--surface-rgb) / <alpha-value>)',
        'ui-surface-strong': 'rgb(var(--surface-strong-rgb) / <alpha-value>)',
        'ui-border': 'rgb(var(--border-rgb) / <alpha-value>)',
        'ui-text': 'rgb(var(--text-rgb) / <alpha-value>)',
        'ui-text-muted': 'rgb(var(--text-muted-rgb) / <alpha-value>)',
        'status-success': 'rgb(var(--status-success-rgb) / <alpha-value>)',
        'status-success-soft': 'rgb(var(--status-success-soft-rgb) / <alpha-value>)',
        'status-success-text': 'rgb(var(--status-success-text-rgb) / <alpha-value>)',
        'status-warning': 'rgb(var(--status-warning-rgb) / <alpha-value>)',
        'status-warning-soft': 'rgb(var(--status-warning-soft-rgb) / <alpha-value>)',
        'status-warning-text': 'rgb(var(--status-warning-text-rgb) / <alpha-value>)',
        'status-danger': 'rgb(var(--status-danger-rgb) / <alpha-value>)',
        'status-danger-soft': 'rgb(var(--status-danger-soft-rgb) / <alpha-value>)',
        'status-danger-text': 'rgb(var(--status-danger-text-rgb) / <alpha-value>)',
        'metric-blue': 'rgb(var(--metric-blue-rgb) / <alpha-value>)',
        'code-bg': 'rgb(var(--code-bg-rgb) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Ubuntu Mono', 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'monospace']
      },
      spacing: {
        'route-x': 'var(--route-padding-x)',
        'route-y': 'var(--route-padding-y)',
        'header-content': 'var(--header-content-gap)',
        'section': 'var(--section-gap)',
        'surface': 'var(--surface-padding)',
        'row-y': 'var(--table-row-padding-y)',
        'control-sm': 'var(--control-height-compact)',
        'control': 'var(--control-height-default)',
        'overlay-x': 'var(--overlay-padding-x)',
        'overlay-y': 'var(--overlay-padding-y)'
      }
    }
  },
  plugins: []
};
