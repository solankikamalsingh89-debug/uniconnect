import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(240, 10%, 4%)", // Deep tech-noir dark
        foreground: "hsl(210, 40%, 98%)",
        neonCyan: "hsl(180, 100%, 50%)",
        neonPurple: "hsl(280, 100%, 65%)",
        panel: "rgba(20, 20, 30, 0.7)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        neonCyan: "0 0 10px hsl(180, 100%, 50%), 0 0 20px hsl(180, 100%, 50%)",
        neonPurple: "0 0 10px hsl(280, 100%, 65%), 0 0 20px hsl(280, 100%, 65%)",
      }
    },
  },
  plugins: [],
};
export default config;
