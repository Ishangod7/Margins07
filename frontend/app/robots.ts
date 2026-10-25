import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/intro", "/privacy", "/terms"],
        disallow: [
          "/notices",
          "/resources",
          "/doubts",
          "/people",
          "/settings",
          "/activity",
          "/saved",
          "/deadlines",
          "/subjects",
          "/revision",
          "/timetable",
          "/api/",
        ],
      },
    ],
    sitemap: "https://frontend-nine-kohl-79.vercel.app/sitemap.xml",
  };
}
