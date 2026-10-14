import type { MetadataRoute } from "next";
import { baseURL } from "@/resources";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Longest match wins: the generated social cards stay reachable for link previews.
        allow: ["/", "/api/og/"],
        disallow: ["/api/", "/admin", "/dashboard", "/profile", "/submit", "/login"],
      },
    ],
    sitemap: `${baseURL}/sitemap.xml`,
  };
}
