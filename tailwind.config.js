/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"],   // <-- default sans
        display: ["Poppins", "sans-serif"],      // optional custom
      },
      colors: {
        darknavy: "#0e141d",
        tealgreen: "#00b081",
        lightgray: "#e7ebee",
        mintgreen: "#d9f1e0",
      },
    },
  },
  plugins: [],
}
