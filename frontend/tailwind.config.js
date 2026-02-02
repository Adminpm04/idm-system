/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#16306C',
          50: '#E8EDF5',
          100: '#C5D1E8',
          200: '#9FB3D9',
          300: '#7895CA',
          400: '#5277BB',
          500: '#16306C',
          600: '#122858',
          700: '#0E1F44',
          800: '#0A1730',
          900: '#060E1C',
          dark: '#1E3A5F', // Lighter version for dark mode
        },
        secondary: {
          DEFAULT: '#F9BF3F',
          50: '#FEF7E6',
          100: '#FDECC0',
          200: '#FCE099',
          300: '#FBD473',
          400: '#FAC84C',
          500: '#F9BF3F',
          600: '#E8A80A',
          700: '#B38208',
          800: '#7E5C06',
          900: '#493503',
        },
        dark: {
          bg: '#0f172a',        // Main background
          card: '#1e293b',      // Card background
          border: '#334155',    // Borders
          hover: '#334155',     // Hover states
          text: '#f1f5f9',      // Primary text
          muted: '#94a3b8',     // Muted text
          accent: '#3b82f6',    // Accent color
        }
      },
      boxShadow: {
        'dark-sm': '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        'dark-md': '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
        'dark-lg': '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
        'dark-glow': '0 0 20px rgba(59, 130, 246, 0.3)',
      },
      animation: {
        'theme-transition': 'theme-fade 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
}
