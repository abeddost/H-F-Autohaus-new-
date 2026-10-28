/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.{ejs,html}",
    "./public/**/*.{html,js}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.25rem',
        md: '2rem',
        xl: '2.5rem',
      },
      screens: {
        '2xl': '1320px',
      },
    },
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a0a0b',
          900: '#0e0e10',
          800: '#141417',
          700: '#1b1b1f',
          600: '#26262b',
        },
        bone: '#f2f4f8',
        mute: '#9ca3af',
        faint: '#656b76',
        // Brand accent (blue). DEFAULT for icons/accent text, dark for buttons with white text.
        accent: {
          DEFAULT: '#4a86ff',
          light: '#8fb4ff',
          dark: '#2563eb',
          hover: '#2f6fed',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tightest: '-0.045em',
        eyebrow: '0.22em',
      },
      maxWidth: {
        prose: '68ch',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
