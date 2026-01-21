const colors = require('tailwindcss/colors')

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic Colors
        primary: colors.indigo,
        success: colors.emerald,
        warning: colors.amber,
        danger: colors.rose,
        // Neutral (optional alias if we want to enforce specific gray)
        gray: colors.gray, 
      }
    },
  },
  plugins: [],
}
