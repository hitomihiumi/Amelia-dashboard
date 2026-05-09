// IMPORTANT: Replace with your own domain address - it's used for SEO in meta tags and schema
const baseURL = "https://amelia.hitomihiumi.xyz";

// metadata for pages
const meta = {
  home: {
    path: "/",
    title: "Amelia",
    description: "Multipurpose bot for your guild!",
    image: "/images/og/home.png",
    canonical: baseURL,
    robots: "index,follow",
    alternates: [{ href: baseURL, hrefLang: "en" }],
  },
  // add more routes and reference them in page.tsx
};

// default schema data
const schema = {
  logo: "",
  type: "Website",
  name: "Amelia",
  description: meta.home.description,
  email: "",
  locale: "en-US",
};

export { meta, schema, baseURL };
