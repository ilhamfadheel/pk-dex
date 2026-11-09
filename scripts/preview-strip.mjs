// Dev helper: lays out a sliced strip as a numbered grid (one sheet row per line).
// Usage: node scripts/preview-strip.mjs <sliced dir> <key> <out.png>
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const [dir, key, out, half] = process.argv.slice(2);
const idx = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"))[key];
const { cw, ch } = idx;
// "first": only the first half of the rows (sheets hold the unit facing both ways)
const rows = half === "first" ? idx.rows.slice(0, Math.ceil(idx.rows.length / 2)) : idx.rows;
const S = cw * ch > 6000 ? 1 : 2, PAD = 4, LBL = 10;
const cols = Math.max(...rows);
const width = cols * (cw * S + PAD), height = rows.length * (ch * S + PAD + LBL);
const comps = [];
let k = 0;
for (let r = 0; r < rows.length; r++)
  for (let c = 0; c < rows[r]; c++, k++) {
    const frame = await sharp(path.join(dir, `${key}.png`)).extract({ left: k * cw, top: 0, width: cw, height: ch }).resize(cw * S, ch * S, { kernel: "nearest" }).png().toBuffer();
    const left = c * (cw * S + PAD), top = r * (ch * S + PAD + LBL);
    comps.push({ input: frame, left, top: top + LBL });
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="${LBL}"><text x="0" y="9" font-size="10" font-family="monospace" fill="#000">${k}</text></svg>`), left, top });
  }
await sharp({ create: { width, height, channels: 4, background: "#d8d8d8" } }).composite(comps).png().toFile(out);
console.log(out, width, height);
