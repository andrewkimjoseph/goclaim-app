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
        background: "#FFFFFF",
        surface: "#FFFFFF",
        foreground: "#000000",
        shell: "#085020",
        primary: "#F83028",
        accent: "#80B040",
        fleshLight: "#FF7878",
        cream: "#D0C098",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        brutal: "4px 4px 0 0 #000000",
        "brutal-sm": "3px 3px 0 0 #000000",
      },
      borderRadius: {
        brutal: "2px",
      },
      keyframes: {
        modalFadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        modalSlideUp: {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        modalFadeOut: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        modalSlideDown: {
          from: { transform: "translateY(0)", opacity: "1" },
          to: { transform: "translateY(100%)", opacity: "0" },
        },
      },
      animation: {
        modalFadeIn: "modalFadeIn 220ms ease-out forwards",
        modalSlideUp: "modalSlideUp 320ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        modalFadeOut: "modalFadeOut 220ms ease-in forwards",
        modalSlideDown: "modalSlideDown 320ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};
export default config;
