/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#000000",
        cyan: {
          glow: "#6ef6ff",
        },
        magenta: {
          glow: "#ff6ad5",
        },
      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      boxShadow: {
        holocore:
          "0 0 24px rgba(110, 246, 255, 0.35), 0 0 80px rgba(255, 106, 213, 0.22)",
        holoring:
          "0 0 0 1px rgba(110, 246, 255, 0.28), 0 0 40px rgba(255, 106, 213, 0.12)",
      },
      backgroundImage: {
        holo: "linear-gradient(120deg, #6ef6ff 0%, #d7f9ff 42%, #ff6ad5 100%)",
      },
    },
  },
  plugins: [],
};
