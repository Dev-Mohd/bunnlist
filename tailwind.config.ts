import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        espresso: "#140d09",
        coffee: "#3f2418",
        crema: "#c9a45d",
        oat: "#f4ead9",
        porcelain: "#fffaf2",
      },
      boxShadow: {
        glow: "0 24px 80px rgba(201, 164, 93, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
