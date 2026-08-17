/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        m3: {
          surface: '#f8fafc',
          'surface-variant': '#f1f5f9',
          'surface-container': '#ffffff',
          'surface-container-high': '#f8fafc',
          primary: '#4f46e5', // Vibrant indigo
          'primary-container': '#e0e7ff',
          'on-primary-container': '#312e81',
          secondary: '#0284c7', // Sky blue
          'secondary-container': '#e0f2fe',
          tertiary: '#059669', // Emerald
          'tertiary-container': '#d1fae5',
          outline: '#cbd5e1',
          'outline-variant': '#e2e8f0',
          dark: '#0f172a',
          'dark-surface': '#1e293b',
          'dark-container': '#334155',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'm3-1': '0px 1px 3px 0px rgba(0, 0, 0, 0.05), 0px 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'm3-2': '0px 4px 6px -1px rgba(0, 0, 0, 0.07), 0px 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'm3-3': '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.05)',
        'm3-4': '0px 20px 25px -5px rgba(0, 0, 0, 0.12), 0px 8px 10px -6px rgba(0, 0, 0, 0.05)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
