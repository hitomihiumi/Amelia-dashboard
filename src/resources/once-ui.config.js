// Import and set font for each variant
import { Inter, Lexend, Sora } from "next/font/google";
import { Geist_Mono } from "next/font/google";

const heading = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const body = Lexend({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const label = Inter({
  variable: "--font-label",
  subsets: ["latin"],
  display: "swap",
});

const code = Geist_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
});

const fonts = {
  heading: heading,
  body: body,
  label: label,
  code: code,
};

// default customization applied to the HTML in the main layout.tsx
const style = {
  theme: "dark",
  brand: "custom",
  accent: "red",
  neutral: "gray",
  border: "playful",
  solid: "color",
  solidStyle: "flat",
  surface: "filled",
  transition: "all",
  scaling: "100", // 90 | 95 | 100 | 105 | 110
};

const dataStyle = {
  variant: "gradient", // flat | gradient | outline
  mode: "categorical", // categorical | divergent | sequential
  height: 24, // default chart height
  axis: {
    stroke: "var(--neutral-alpha-weak)",
  },
  tick: {
    fill: "var(--neutral-on-background-weak)",
    fontSize: 11,
    line: false,
  },
};

export { fonts, style, dataStyle };
