// Checks the static export (./out) for SEO basics on every page:
// title, description (unique, sensible length), canonical, Open Graph image,
// JSON-LD validity, and that the sitemap lists every page.
// Usage: node scripts/check-seo.mjs [out dir]
import fs from "node:fs";
import path from "node:path";

const out = path.resolve(process.argv[2] ?? "out");
const pages = [];
const walk = (d) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    // 404 / not-found pages aren't meant to be indexed
    else if (f.name === "index.html" && !/(^|[\\/])(404|_not-found)([\\/]|$)/.test(path.relative(out, p))) pages.push(p);
  }
};
walk(out);

const attr = (html, re) => (html.match(re) ?? [])[1];
const decode = (s) => s?.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');
const problems = [];
const titles = new Map(), descs = new Map(), canon = new Set();
let ldBlocks = 0;
for (const file of pages) {
  const rel = "/" + path.relative(out, path.dirname(file)).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");
  const title = decode(attr(html, /<title>([^<]*)<\/title>/));
  const desc = decode(attr(html, /<meta name="description" content="([^"]*)"/));
  const can = attr(html, /<link rel="canonical" href="([^"]*)"/);
  const og = attr(html, /<meta property="og:image" content="([^"]*)"/);
  if (!title) problems.push(`${rel}: no title`);
  else if (title.length > 70) problems.push(`${rel}: title ${title.length} chars`);
  if (!desc) problems.push(`${rel}: no description`);
  else if (desc.length < 70 || desc.length > 160) problems.push(`${rel}: description ${desc.length} chars`);
  if (!can) problems.push(`${rel}: no canonical`);
  else if (!can.startsWith("https://")) problems.push(`${rel}: canonical not absolute`);
  if (!og || !og.startsWith("https://")) problems.push(`${rel}: og:image missing/relative`);
  else {
    const local = path.join(out, og.replace(/^https:\/\/[^/]+\/pk-dex\//, ""));
    if (!fs.existsSync(local)) problems.push(`${rel}: og:image file missing (${og})`);
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    ldBlocks++;
    try { JSON.parse(m[1]); } catch { problems.push(`${rel}: invalid JSON-LD`); }
  }
  if (title) titles.set(title, [...(titles.get(title) ?? []), rel]);
  if (desc) descs.set(desc, [...(descs.get(desc) ?? []), rel]);
  if (can) canon.add(can);
}
for (const [t, ps] of titles) if (ps.length > 1 && !ps.every((p) => p.includes("404"))) problems.push(`duplicate title "${t}": ${ps.join(", ")}`);
for (const [d, ps] of descs) if (ps.length > 1 && !ps.every((p) => p.includes("404"))) problems.push(`duplicate description on ${ps.join(", ")}`);

const sitemap = fs.readFileSync(path.join(out, "sitemap.xml"), "utf8");
const locs = new Set([...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]));
for (const c of canon) if (!locs.has(c)) problems.push(`not in sitemap: ${c}`);
for (const l of locs) if (!canon.has(l)) problems.push(`sitemap URL with no page: ${l}`);

console.log(`${pages.length} pages, ${locs.size} sitemap URLs, ${ldBlocks} JSON-LD blocks, ${problems.length} problems`);
for (const p of problems.slice(0, 40)) console.log("  " + p);
process.exit(problems.length ? 1 : 0);
