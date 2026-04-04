import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bb: {
          black: "#000000",
          orange: "#FF6600",
          amber: "#FFB800",
          white: "#FFFFFF",
          gray: "#666666",
          darkgray: "#1a1a1a",
          border: "#333333",
          green: "#00CC00",
          red: "#CC0000",
          rowHover: "#111111"
        }
      },
      fontFamily: {
        sans: ['"Bloomberg Terminal"', 'Consolas', '"SF Mono"', '"JetBrains Mono"', 'monospace'],
        mono: ['"Bloomberg Terminal"', 'Consolas', '"SF Mono"', '"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'none': '0px',
        'sm': '0px',
        DEFAULT: '0px',
        'md': '0px',
        'lg': '0px',
        'xl': '0px',
        '2xl': '0px',
        '3xl': '0px',
        'full': '0px',
      }
    },
  },
  plugins: [],
};
export default config;
