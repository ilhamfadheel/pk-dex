import type { Metadata } from "next";

/** Public site address (GitHub Pages project site). Override with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ilhamfadheel.github.io/pk-dex").replace(/\/$/, "");
export const SITE_NAME = "Pocket Kingdom Dex";
export const GAME = "Pocket Kingdom: Own the World";

/** Absolute URL for a site path ("/unit/paladin" -> ".../unit/paladin/"); pages use trailing slashes. */
export const abs = (path: string) => {
  if (/^https?:/.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  const withSlash = p === "/" || p.endsWith("/") || /\.[a-z0-9]+$/i.test(p) ? p : `${p}/`;
  return `${SITE_URL}${withSlash}`;
};

const clip = (s: string, n = 158) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/[\s,;·–-]+\S*$/, "")}…`);

/**
 * Per-page metadata: title, description, canonical URL and social cards.
 * `image` is a site path; `large` uses the wide banner card layout.
 */
export function pageMeta({
  title,
  description,
  path,
  image = "/og/site.png",
  imageAlt,
  large = true,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  large?: boolean;
  absoluteTitle?: boolean;
}): Metadata {
  const desc = clip(description);
  const url = abs(path);
  const img = { url: abs(image), alt: imageAlt ?? title };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", url, title, description: desc, images: [img] },
    twitter: { card: large ? "summary_large_image" : "summary", title, description: desc, images: [img] },
  };
}

/** JSON-LD BreadcrumbList for detail pages. */
export const breadcrumbs = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
});
