import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#003B95",
          blueDark: "#00265E",
          accent: "#0071C2",
          amber: "#FFB700",
          amberDark: "#E6A400",
          bg: "#F5F7FB",
          ink: "#1A1A1A",
          muted: "#5B6B82",
          border: "#E3E8EF",
          success: "#008009",
          successBg: "#E7F7E8",
          warning: "#FFB700",
        },
      },
      borderRadius: {
        card: "1rem",
      },
      boxShadow: {
        card: "0 2px 8px rgba(15, 35, 75, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
