// Public address of the website. It is used for canonical links, the sitemap and social previews.
const baseURL = process.env.NEXT_PUBLIC_SITE_URL || "https://amelia.hitomihiumi.xyz";

// metadata for the landing page
const meta = {
  home: {
    path: "/",
    title: "Amelia – Multipurpose Discord Bot for Moderation & Economy",
    description:
      "Amelia is a free, open source Discord bot: moderation, economy, leveling, audit log, reports and a visual scenario editor. Configure everything from the web dashboard.",
    keywords: [
      "Amelia",
      "Discord bot",
      "Discord moderation bot",
      "Discord economy bot",
      "Discord leveling bot",
      "Discord audit log",
      "Discord dashboard",
      "open source Discord bot",
      "multipurpose Discord bot",
    ],
  },
};

// default schema data
const schema = {
  logo: "/images/avatar.jpg",
  type: "Website",
  name: "Amelia",
  description: meta.home.description,
  email: "",
  locale: "en-US",
  author: { name: "hitomihiumi", url: "https://hitomihiumi.xyz" },
  sameAs: ["https://github.com/hitomihiumi/Amelia"],
};

export { meta, schema, baseURL };
