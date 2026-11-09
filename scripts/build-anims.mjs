// Turns sliced sprite strips into per-unit animation files for the site.
//   - matches each recoloured sheet to a unit by comparing colours with the unit
//     portraits (best overall assignment per family)
//   - crops each strip to the frames the labels use and writes public/img/anim/<slug>.png
//   - writes src/data/anims.json
// Usage: node scripts/build-anims.mjs <sliced dir from slice-sprites.mjs>
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { FAMILIES, LABELS } from "./anim-families.mjs";

const root = path.resolve(import.meta.dirname, "..");
const [slicedDir] = process.argv.slice(2);
const index = JSON.parse(fs.readFileSync(path.join(slicedDir, "index.json"), "utf8"));
const units = JSON.parse(fs.readFileSync(path.join(root, "src/data/units.json"), "utf8"));
const byName = new Map(units.map((u) => [u.name, u]));
const slugify = (s) => s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const outImg = path.join(root, "public/img/anim");
fs.mkdirSync(outImg, { recursive: true });

// Colour fingerprint: hue histogram of coloured pixels + 3 grey levels, normalised.
async function fingerprint(input, extract) {
  let img = sharp(input).ensureAlpha();
  if (extract) img = img.extract(extract);
  const { data } = await img.raw().toBuffer({ resolveWithObject: true });
  const h = new Float64Array(15);
  let n = 0;
  for (let p = 0; p < data.length; p += 4) {
    if (data[p + 3] < 128) continue;
    const r = data[p] / 255, g = data[p + 1] / 255, b = data[p + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), v = max, s = max ? (max - min) / max : 0;
    if (v < 0.12) continue; // outlines / shadows
    // skip the portraits' magenta/green backdrops if any
    if ((r > 0.9 && b > 0.9 && g < 0.2) || (g > 0.9 && r < 0.2 && b < 0.2)) continue;
    if (s < 0.18) h[12 + Math.min(2, Math.floor(v * 3))] += 1;
    else {
      let hue = max === r ? (g - b) / (max - min) : max === g ? 2 + (b - r) / (max - min) : 4 + (r - g) / (max - min);
      hue = ((hue * 60) + 360) % 360;
      h[Math.floor(hue / 30) % 12] += s;
    }
    n++;
  }
  const sum = h.reduce((a, b) => a + b, 0) || 1;
  return Array.from(h, (x) => x / sum);
}
const dist = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);
function* perms(xs) {
  if (xs.length <= 1) { yield xs; return; }
  for (let i = 0; i < xs.length; i++) for (const p of perms([...xs.slice(0, i), ...xs.slice(i + 1)])) yield [xs[i], ...p];
}

const anims = {};
const report = [];
for (const [fam, names] of Object.entries(FAMILIES)) {
  const sheets = Object.keys(index).filter((k) => k === fam || (k.startsWith(fam + "-") && !Object.keys(FAMILIES).some((f) => f !== fam && f.startsWith(fam + "-") && k.startsWith(f))));
  if (sheets.length !== names.length) throw new Error(`${fam}: ${sheets.length} sheets for ${names.length} units (${sheets.join(", ")})`);
  const labels = LABELS[fam];
  if (!labels) throw new Error(`no labels for ${fam}`);
  const maxFrame = Math.max(...Object.values(labels).flat());

  // fingerprints
  const sheetFp = {};
  for (const s of sheets) {
    const { cw, ch } = index[s];
    sheetFp[s] = await fingerprint(path.join(slicedDir, `${s}.png`), { left: 0, top: 0, width: cw * (maxFrame + 1), height: ch });
  }
  const portraitFp = {};
  for (const n of names) {
    const u = byName.get(n);
    if (!u) throw new Error(`unknown unit ${n}`);
    const f = path.join(root, "public/img/units", `face${String(u.id).padStart(3, "0")}.gif`);
    if (fs.existsSync(f)) portraitFp[n] = await fingerprint(f);
  }

  // best assignment (names[i] -> perm[i])
  let best = null, bestCost = Infinity, second = Infinity;
  for (const p of perms(sheets)) {
    let c = 0;
    names.forEach((n, i) => { if (portraitFp[n]) c += dist(portraitFp[n], sheetFp[p[i]]); });
    if (c < bestCost) { second = bestCost; bestCost = c; best = p; } else if (c < second) second = c;
  }
  const withPortrait = names.filter((n) => portraitFp[n]).length;
  names.forEach((n, i) => {
    const sheet = best[i];
    const u = byName.get(n);
    // confidence: single-sheet families are certain; otherwise the unit needs a portrait,
    // or be the only one without (then it's decided by elimination)
    const how = names.length === 1 ? "only sheet" : portraitFp[n] ? "colour match" : withPortrait === names.length - 1 ? "elimination" : "guess";
    anims[slugify(n)] = { sheet, family: fam, cw: index[sheet].cw, ch: index[sheet].ch, n: maxFrame + 1, anims: labels, match: how };
    report.push(`${fam.padEnd(14)} ${n.padEnd(16)} -> ${sheet.padEnd(22)} ${how}`);
    void u;
  });
  if (names.length > 1) report.push(`${"".padEnd(14)} (cost ${bestCost.toFixed(2)}, next best ${second.toFixed(2)})`);
}

// write cropped strips, plus a still (first idle frame, trimmed) used as the unit
// picture for units with no archived portrait
const outFace = path.join(root, "public/img/sprite-face");
fs.mkdirSync(outFace, { recursive: true });
for (const [slug, a] of Object.entries(anims)) {
  await sharp(path.join(slicedDir, `${a.sheet}.png`))
    .extract({ left: 0, top: 0, width: a.cw * a.n, height: a.ch })
    .png({ palette: true, colours: 128, effort: 10 })
    .toFile(path.join(outImg, `${slug}.png`));
  const first = (a.anims.idle ?? [0])[0];
  const frame = await sharp(path.join(slicedDir, `${a.sheet}.png`))
    .extract({ left: first * a.cw, top: 0, width: a.cw, height: a.ch })
    .png()
    .toBuffer();
  await sharp(frame).trim({ threshold: 0 }).png({ palette: true, colours: 128 }).toFile(path.join(outFace, `${slug}.png`));
}
const data = Object.fromEntries(Object.entries(anims).map(([k, a]) => [k, { cw: a.cw, ch: a.ch, n: a.n, anims: a.anims, match: a.match }]));
fs.writeFileSync(path.join(root, "src/data/anims.json"), JSON.stringify(data));
console.log(report.join("\n"));
console.log(`\n${Object.keys(anims).length} units written`);
