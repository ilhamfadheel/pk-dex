import type { MetadataRoute } from "next";
import { cities, data, rawMaterials, slugify } from "@/lib/data";
import { abs } from "@/lib/seo";

export const dynamic = "force-static";

// Content comes from fixed game data, so one date (last data update) is honest for every page.
const UPDATED = new Date(process.env.NEXT_PUBLIC_DATA_UPDATED ?? "2026-11-12");

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, image?: string) => ({
    url: abs(path),
    lastModified: UPDATED,
    changeFrequency: "monthly" as const,
    priority,
    ...(image ? { images: [abs(image)] } : {}),
  });
  return [
    page("/", 1),
    ...["/planner", "/compare", "/party", "/emblems", "/equipment", "/crafting", "/materials", "/cities"].map((p) => page(p, 0.8)),
    ...data.units.map((u) => page(`/unit/${u.slug}`, 0.7, `/og/units/${u.slug}.png`)),
    ...rawMaterials.map((m) => page(`/materials/${slugify(m.name)}`, 0.6)),
    ...cities.map((c) => page(`/cities/${c.slug}`, 0.6)),
  ];
}
