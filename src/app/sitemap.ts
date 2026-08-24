import type { MetadataRoute } from "next";
import { CAFES } from "@/data/cafes";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cafes`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/map`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/about`, changeFrequency: "yearly", priority: 0.3 },
    ...CAFES.map((cafe) => ({
      url: `${base}/cafes/${cafe.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
