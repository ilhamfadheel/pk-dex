// Generates the site icons from a unit portrait (pixel art, scaled with nearest-neighbour).
// Usage: node scripts/make-icons.mjs [faceNNN.gif]   (default: face014 = Knight)
import sharp from "sharp";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "public/img/units", process.argv[2] ?? "face014.gif");
const BG = "#8a2d1f"; // site accent

// Trim to the sprite's opaque pixels, then take a square around the head/shoulders.
const trimmed = await sharp(src).ensureAlpha().trim({ threshold: 1 }).png().toBuffer();
const { width: w, height: h } = await sharp(trimmed).metadata();
const side = Math.min(w, h);
const left = Math.max(0, Math.round((w - side) / 2));
const bust = await sharp(trimmed).extract({ left, top: 0, width: side, height: side }).png().toBuffer();

async function icon(size, file, { pad = 0.12, radius = 0.22 } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const sprite = await sharp(bust).resize(inner, inner, { kernel: "nearest", fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const r = Math.round(size * radius);
  const tile = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="${BG}"/></svg>`,
  );
  const off = Math.round((size - inner) / 2);
  await sharp(tile).composite([{ input: sprite, left: off, top: off }]).png().toFile(path.join(root, file));
  console.log("wrote", file, `${size}x${size}`);
}

console.log("source", path.basename(src), `${w}x${h} trimmed`);
await icon(64, "src/app/icon.png", { pad: 0.06, radius: 0.2 });
await icon(180, "src/app/apple-icon.png", { pad: 0.1, radius: 0 }); // iOS rounds corners itself
await icon(64, "public/img/logo.png", { pad: 0.06, radius: 0.2 });
