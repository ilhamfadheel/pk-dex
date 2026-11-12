// Social preview images (Open Graph / Twitter, 1200x630):
//   public/og/site.png            site banner
//   public/og/units/<slug>.png    one card per unit: pixel-art portrait + name + key stats
// Usage: node scripts/make-og.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const units = JSON.parse(fs.readFileSync(path.join(root, "src/data/units.json"), "utf8"));
const out = path.join(root, "public/og");
fs.mkdirSync(path.join(out, "units"), { recursive: true });

const W = 1200, H = 630;
const BG = "#14130f", PANEL = "#1d1b16", ACCENT = "#e0745f", GOLD = "#e0b45c", INK = "#ece6d8", MUTED = "#a39b8a";
const slugify = (s) => s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FONT = "Segoe UI, Helvetica, Arial, sans-serif";

function portraitFile(u) {
  const face = path.join(root, "public/img/units", `face${String(u.id).padStart(3, "0")}.gif`);
  if (fs.existsSync(face)) return face;
  const sprite = path.join(root, "public/img/sprite-face", `${slugify(u.name)}.png`);
  return fs.existsSync(sprite) ? sprite : null;
}

// pixel art scaled with nearest-neighbour to fit a box
async function pixel(file, box) {
  const img = sharp(file).ensureAlpha().trim({ threshold: 0 });
  const { width, height } = await img.clone().png().toBuffer({ resolveWithObject: true }).then((r) => r.info);
  const k = Math.max(1, Math.floor(Math.min(box / width, box / height)));
  return img.resize(width * k, height * k, { kernel: "nearest" }).png().toBuffer();
}

async function card(svgText, art, file) {
  const base = Buffer.from(svgText);
  const layers = [];
  if (art) {
    const meta = await sharp(art.buf).metadata();
    layers.push({ input: art.buf, left: Math.round(art.cx - meta.width / 2), top: Math.round(art.cy - meta.height / 2) });
  }
  await sharp(base).composite(layers).png({ palette: true, colours: 128, effort: 10 }).toFile(file);
}

// ---- site banner: a row of portraits behind the title ----
{
  const picks = ["Soldier", "Knight", "Dragon", "Luna", "Lord Redrick", "Gargoyle", "Succubus", "Behemoth"]
    .map((n) => units.find((u) => u.name === n)).filter(Boolean);
  const arts = [];
  for (const [i, u] of picks.entries()) {
    const f = portraitFile(u);
    if (f) arts.push({ buf: await pixel(f, 120), x: 40 + i * 140 });
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${BG}"/>
    <rect x="0" y="380" width="${W}" height="250" fill="${PANEL}"/>
    <rect x="0" y="376" width="${W}" height="4" fill="${ACCENT}"/>
    <text x="60" y="465" font-family="${FONT}" font-size="64" font-weight="700" fill="${INK}">Pocket Kingdom Dex</text>
    <text x="60" y="520" font-family="${FONT}" font-size="30" fill="${GOLD}">Own the World (N-Gage) unit guide &amp; database</text>
    <text x="60" y="572" font-family="${FONT}" font-size="24" fill="${MUTED}">115 units · evolution trees · rank-up emblems · crafting · city shops</text>
  </svg>`;
  const layers = [];
  for (const a of arts) {
    const m = await sharp(a.buf).metadata();
    layers.push({ input: a.buf, left: Math.round(a.x + 60 - m.width / 2), top: Math.round(350 - m.height) });
  }
  await sharp(Buffer.from(svg)).composite(layers).png({ palette: true, colours: 128, effort: 10 }).toFile(path.join(out, "site.png"));
  console.log("wrote og/site.png");
}

// ---- unit cards ----
let n = 0;
for (const u of units) {
  const f = portraitFile(u);
  const stats = [["HP", u.hp], ["ATK", u.atk], ["DEF", u.def], ["AGI", u.agi], ["DEX", u.dex], ["WIS", u.wis], ["INT", u.int]];
  const statSvg = stats
    .map(([k, v], i) => {
      const x = 560 + (i % 4) * 150, y = 400 + Math.floor(i / 4) * 80;
      return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="22" fill="${MUTED}">${k}</text>
              <text x="${x}" y="${y + 38}" font-family="${FONT}" font-size="38" font-weight="700" fill="${INK}">${v}</text>`;
    })
    .join("");
  const name = u.name.length > 16 ? 60 : 76;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${BG}"/>
    <rect x="60" y="75" width="440" height="480" rx="24" fill="${PANEL}" stroke="#36322a" stroke-width="2"/>
    <text x="560" y="120" font-family="${FONT}" font-size="26" fill="${GOLD}">Pocket Kingdom: Own the World</text>
    <text x="560" y="${120 + name + 10}" font-family="${FONT}" font-size="${name}" font-weight="700" fill="${INK}">${esc(u.name)}</text>
    <text x="560" y="300" font-family="${FONT}" font-size="30" fill="${ACCENT}">${esc(u.race)} · Rank ${u.rank} · ${u.slots} slot${u.slots > 1 ? "s" : ""}${u.ability ? ` · ${esc(u.ability)}` : ""}</text>
    ${statSvg}
    <text x="${W - 60}" y="${H - 30}" text-anchor="end" font-family="${FONT}" font-size="22" fill="${MUTED}">Pocket Kingdom Dex</text>
  </svg>`;
  await card(svg, f ? { buf: await pixel(f, 400), cx: 280, cy: 315 } : null, path.join(out, "units", `${slugify(u.name)}.png`));
  n++;
}
console.log(`wrote ${n} unit cards`);
