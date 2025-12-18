/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#8B0000',    // Dark Red
          secondary: '#F5F5DC',  // Beige
          accent: '#D4AF37',     // Gold
          dark: '#1a1a1a',
          light: '#FAF8F0',
        },
      },
      fontFamily: {
        heading: ['Georgia', 'serif'],
        body: ['Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
