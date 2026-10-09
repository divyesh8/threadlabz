/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: {
          light: "#F7F7F6",
          dark: "#0F1012",
          subtle: "#181A1E",
          card: "#121316",
          border: "#25282F",
        },
        brand: {
          lime: "#CCFF00",
          "lime-hover": "#B3E600",
          dark: "#0B0C0E",
          gray: "#737887",
          light: "#F4F4F2",
          accent: "#FF462D",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(204, 255, 0, 0.25)",
        subtle: "0 4px 20px -2px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};
