/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#1d3eff",
        "brand-deep": "#1231db",
        "brand-soft": "#eef3ff",
        "brand-line": "#cfd8ff",
        urgency: "#f59e0b",
        ink: "#0e1320",
      },
      boxShadow: {
        panel: "0 24px 60px rgba(14, 19, 32, 0.08)",
        shell: "0 30px 80px rgba(29, 62, 255, 0.08)",
      },
      fontFamily: {
        sans: ["Avenir Next", "Avenir", "Helvetica Neue", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
