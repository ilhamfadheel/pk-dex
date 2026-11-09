// Builds 16x16 race icons (head busts, like the archived ones) for races whose
// icon was never archived, by cropping the head out of a unit portrait.
// Usage: node scripts/make-race-icons.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const units = JSON.parse(fs.readFileSync(path.join(root, "src/data/units.json"), "utf8"));
const raceDir = path.join(root, "public/img/races");
const unitDir = path.join(root, "public/img/units");

// Which portrait represents a race best (otherwise: first unit of the race with a portrait).
const PREFER = { Orc: 3, Troll: 90 };

const races = new Map();
for (const u of units) if (!races.has(u.race_icon)) races.set(u.race_icon, u.race);

for (const [icon, race] of races) {
  if (fs.existsSync(path.join(raceDir, `${icon}.gif`)) || fs.existsSync(path.join(raceDir, `${icon}.png`))) continue;
  const candidates = [PREFER[race], ...units.filter((u) => u.race_icon === icon).map((u) => u.id)].filter((x) => x != null);
  const id = candidates.find((i) => fs.existsSync(path.join(unitDir, `face${String(i).padStart(3, "0")}.gif`)));
  if (id == null) { console.log(`skip ${race} (#${icon}): no portrait`); continue; }

  const src = path.join(unitDir, `face${String(id).padStart(3, "0")}.gif`);
  const trimmed = await sharp(src).ensureAlpha().trim({ threshold: 1 }).png().toBuffer();
  const { data, info } = await sharp(trimmed).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;

  // Head = the widest opaque run in the top ~30% (weapons poke up as thin lines).
  const side = Math.min(w, h, Math.round(h * 0.42));
  let best = { len: 0, mid: w / 2 };
  for (let y = 2; y < Math.ceil(h * 0.3); y++) {
    let start = -1;
    for (let x = 0; x <= w; x++) {
      const on = x < w && data[(y * w + x) * c + 3] > 0;
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        if (x - start > best.len) best = { len: x - start, mid: (start + x) / 2 };
        start = -1;
      }
    }
  }
  const left = Math.max(0, Math.min(w - side, Math.round(best.mid - side / 2)));
  const top = 0;

  const out = path.join(raceDir, `${icon}.png`);
  await sharp(trimmed)
    .extract({ left, top, width: side, height: side })
    .resize(16, 16, { kernel: "lanczos3", fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ palette: true, colours: 32 })
    .toFile(out);
  // Bigger preview copy for checking by eye (not served).
  await sharp(out).resize(64, 64, { kernel: "nearest" }).toFile(path.join(root, ".next", `race-preview-${icon}.png`)).catch(() => {});
  console.log(`made ${race} (#${icon}) from face${String(id).padStart(3, "0")} -> ${path.relative(root, out)}`);
}
