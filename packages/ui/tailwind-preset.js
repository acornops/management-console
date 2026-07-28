/** @type {import('tailwindcss').Config} */
const preset = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-brown': 'rgb(var(--ao-logo-brown-rgb) / <alpha-value>)',
        'brand-cream': 'rgb(var(--ao-logo-cream-rgb) / <alpha-value>)',
        'brand-brown-dark': 'oklch(0.278 0.03 250)',
        'brand-orange': 'rgb(var(--ao-brand-orange-rgb) / <alpha-value>)',
        'brand-orange-strong':
          'rgb(var(--ao-brand-orange-strong-rgb) / <alpha-value>)',
        'brand-orange-bright':
          'rgb(var(--ao-brand-orange-bright-rgb) / <alpha-value>)',
        'brand-orange-readable':
          'rgb(var(--ao-brand-orange-readable-rgb) / <alpha-value>)',
        'brand-orange-soft':
          'rgb(var(--ao-brand-orange-soft-rgb) / <alpha-value>)',
        accent: 'rgb(var(--ao-brand-orange-rgb) / <alpha-value>)',
        'accent-bright':
          'rgb(var(--ao-brand-orange-bright-rgb) / <alpha-value>)',
        'accent-strong':
          'rgb(var(--ao-brand-orange-strong-rgb) / <alpha-value>)',
        'accent-readable':
          'rgb(var(--ao-brand-orange-readable-rgb) / <alpha-value>)',
        'accent-soft':
          'rgb(var(--ao-brand-orange-soft-rgb) / <alpha-value>)',
        'ui-bg': 'rgb(var(--ao-bg-rgb) / <alpha-value>)',
        'ui-surface': 'rgb(var(--ao-surface-rgb) / <alpha-value>)',
        'ui-surface-strong':
          'rgb(var(--ao-surface-strong-rgb) / <alpha-value>)',
        'ui-border': 'rgb(var(--ao-border-rgb) / <alpha-value>)',
        'ui-text': 'rgb(var(--ao-text-rgb) / <alpha-value>)',
        'ui-text-muted': 'rgb(var(--ao-text-muted-rgb) / <alpha-value>)',
        'control-primary':
          'rgb(var(--ao-control-primary-bg-rgb) / <alpha-value>)',
        'control-primary-hover':
          'rgb(var(--ao-control-primary-hover-rgb) / <alpha-value>)',
        'control-primary-fg':
          'rgb(var(--ao-control-primary-fg-rgb) / <alpha-value>)',
        'control-secondary':
          'rgb(var(--ao-control-secondary-bg-rgb) / <alpha-value>)',
        'control-secondary-hover':
          'rgb(var(--ao-control-secondary-hover-rgb) / <alpha-value>)',
        'control-secondary-fg':
          'rgb(var(--ao-control-secondary-fg-rgb) / <alpha-value>)',
        'control-activation':
          'rgb(var(--ao-control-activation-bg-rgb) / <alpha-value>)',
        'control-activation-hover':
          'rgb(var(--ao-control-activation-hover-rgb) / <alpha-value>)',
        'control-activation-fg':
          'rgb(var(--ao-control-activation-fg-rgb) / <alpha-value>)',
        'control-danger':
          'rgb(var(--ao-control-danger-bg-rgb) / <alpha-value>)',
        'control-danger-hover':
          'rgb(var(--ao-control-danger-hover-rgb) / <alpha-value>)',
        'control-danger-fg':
          'rgb(var(--ao-control-danger-fg-rgb) / <alpha-value>)',
        'control-boundary':
          'rgb(var(--ao-control-boundary-rgb) / <alpha-value>)',
        'status-success':
          'rgb(var(--ao-status-success-rgb) / <alpha-value>)',
        'status-success-soft':
          'rgb(var(--ao-status-success-soft-rgb) / <alpha-value>)',
        'status-success-text':
          'rgb(var(--ao-status-success-text-rgb) / <alpha-value>)',
        'status-warning':
          'rgb(var(--ao-status-warning-rgb) / <alpha-value>)',
        'status-warning-soft':
          'rgb(var(--ao-status-warning-soft-rgb) / <alpha-value>)',
        'status-warning-text':
          'rgb(var(--ao-status-warning-text-rgb) / <alpha-value>)',
        'status-danger':
          'rgb(var(--ao-status-danger-rgb) / <alpha-value>)',
        'status-danger-soft':
          'rgb(var(--ao-status-danger-soft-rgb) / <alpha-value>)',
        'status-danger-text':
          'rgb(var(--ao-status-danger-text-rgb) / <alpha-value>)',
        'metric-blue': 'rgb(var(--ao-metric-blue-rgb) / <alpha-value>)',
        'code-bg': 'rgb(var(--ao-code-bg-rgb) / <alpha-value>)',
        'code-text': 'rgb(var(--ao-code-text-rgb) / <alpha-value>)'
      },
      fontFamily: {
        sans: [
          'Outfit',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif'
        ],
        mono: [
          'Ubuntu Mono',
          'SFMono-Regular',
          'Consolas',
          'Liberation Mono',
          'monospace'
        ]
      },
      spacing: {
        'route-x': 'var(--ao-route-padding-x)',
        'route-y': 'var(--ao-route-padding-y)',
        'header-content': 'var(--ao-header-content-gap)',
        section: 'var(--ao-section-gap)',
        surface: 'var(--ao-surface-padding)',
        'row-y': 'var(--ao-table-row-padding-y)',
        'control-sm': 'var(--ao-control-height-compact)',
        control: 'var(--ao-control-height-default)',
        'overlay-x': 'var(--ao-overlay-padding-x)',
        'overlay-y': 'var(--ao-overlay-padding-y)'
      },
      borderRadius: {
        'ao-sm': 'var(--ao-radius-sm)',
        ao: 'var(--ao-radius-md)',
        'ao-lg': 'var(--ao-radius-lg)',
        'ao-xl': 'var(--ao-radius-xl)'
      }
    }
  }
};

export default preset;
