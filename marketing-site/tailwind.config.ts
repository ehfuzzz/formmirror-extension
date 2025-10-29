import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx,mdx,md}'],
  theme: {
    extend: {
      colors: {
        page: '#FFFFFF',
        subtle: '#F8FAFD',
        card: '#FFFFFF',
        ink: '#0A142F',
        steel: '#4B5B7C',
        blue: {
          50: '#EFF7FF',
          100: '#DFF0FF',
          200: '#B9DEFF',
          300: '#8CC7FF',
          400: '#5BAEFF',
          500: '#2A96FF',
          600: '#1E7ADF',
          700: '#175FB1',
          800: '#124A8A',
          900: '#0E3A6B',
        },
        gray: {
          50: '#F8FAFD',
          100: '#F2F6FA',
          200: '#E6EEF5',
          300: '#D5E0EA',
          400: '#B8C7D9',
          500: '#9AAAC0',
        },
        border: {
          DEFAULT: '#E6EEF5',
        },
      },
      boxShadow: {
        sm: '0 1px 2px rgba(12,37,82,0.06)',
        md: '0 6px 16px rgba(12,37,82,0.08)',
        lg: '0 12px 28px rgba(12,37,82,0.14)',
      },
      borderRadius: {
        xl: '16px',
        '2xl': '24px',
      },
      container: {
        center: true,
        padding: '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config
