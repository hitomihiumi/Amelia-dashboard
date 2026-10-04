// Import and set font for each variant
import { Inter, Lexend, Manrope, Onest, Sora } from "next/font/google";
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

// Sora and Lexend have no Cyrillic glyphs, so Russian and Ukrainian text would drop to the
// browser's serif. These companions only declare the Cyrillic subsets, which means the browser
// takes Latin letters from the faces above and Cyrillic ones from these.
const headingCyrillic = Manrope({
  variable: "--font-heading-cyrillic",
  subsets: ["cyrillic", "cyrillic-ext"],
  display: "swap",
});

const bodyCyrillic = Onest({
  variable: "--font-body-cyrillic",
  subsets: ["cyrillic", "cyrillic-ext"],
  display: "swap",
});

// `'Font', 'Font Fallback'` -> the font itself and its metric-adjusted system fallback. The
// Cyrillic companion has to sit between them, otherwise the fallback (Arial) answers first.
const withCompanion = (main, companion) => {
  const [first, ...rest] = main.style.fontFamily.split(/,\s*/);
  return [first, companion.style.fontFamily.split(/,\s*/)[0], ...rest].join(", ");
};

const fonts = {
  heading: heading,
  body: body,
  label: label,
  code: code,
  headingCyrillic: headingCyrillic,
  bodyCyrillic: bodyCyrillic,
};

/** Values for the `--font-*` variables once the Cyrillic companions are in the stack. */
const fontStacks = {
  heading: withCompanion(heading, headingCyrillic),
  body: withCompanion(body, bodyCyrillic),
};

// default customization applied to the HTML in the main layout.tsx
const style = {
  theme: "dark",
  brand: "custom",
  accent: "aqua",
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

const layout = {
  // units are set in REM
  header: {
    width: 200, // max-width of the content inside the header
  },
  body: {
    width: 200, // max-width of the body
  },
  sidebar: {
    width: 17, // width of the sidebar
    collapsible: false, // accordion or static render
  },
  content: {
    width: 44, // width of the main content block
  },
  sideNav: {
    width: 17, // width of the sideNav on document pages
  },
  footer: {
    width: 72, // width of the content inside the footer
  },
};

export { fonts, fontStacks, style, dataStyle, layout };
