// Cuts The Spriters Resource sheets (sprites on magenta, green background) into
// frames, groups them into rows, and writes one strip PNG per sheet plus an index.
//
// Frames are found from the sprite pixels themselves (the magenta boxes touch each
// other on most sheets, so they can't be used to separate frames):
//   1. every non-magenta, non-green pixel is "ink"
//   2. ink is dilated a little and grouped into clusters (weapon + body + shadow stay together)
//   3. small clusters (detached slash arcs, sparks) merge into the nearest big cluster
//   4. clusters sitting on green, not magenta (the credit text), are dropped
//
// Usage: node scripts/slice-sprites.mjs <folder with .gif sheets> <out dir> [--debug]
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const [srcDir, outDir, flag] = process.argv.slice(2);
const DEBUG = flag === "--debug";
fs.mkdirSync(outDir, { recursive: true });

const BG = 0, BOX = 1, INK = 2;
const DILATE = 0; // px: frames sit very close together, so no widening; gaps are merged in step 3

async function slice(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const N = W * H;

  const kind = new Uint8Array(N);
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    kind[i] = g > 200 && r < 60 && b < 60 ? BG : r > 200 && b > 200 && g < 60 ? BOX : INK;
  }

  // 2) dilated ink mask
  const grow = new Uint8Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (kind[y * W + x] !== INK) continue;
      for (let dy = -DILATE; dy <= DILATE; dy++)
        for (let dx = -DILATE; dx <= DILATE; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H) grow[yy * W + xx] = 1;
        }
    }

  // clusters on the dilated mask; stats from the real ink pixels
  const label = new Int32Array(N).fill(-1);
  const clusters = [];
  for (let s = 0; s < N; s++) {
    if (!grow[s] || label[s] >= 0) continue;
    const id = clusters.length;
    const c = { id, x0: W, y0: H, x1: -1, y1: -1, ink: 0, onBox: 0, onBg: 0 };
    const stack = [s];
    label[s] = id;
    while (stack.length) {
      const i = stack.pop();
      const x = i % W, y = (i / W) | 0;
      if (kind[i] === INK) {
        c.ink++;
        const p4 = i * 4, R = data[p4], G = data[p4 + 1], B = data[p4 + 2];
        // effect colours: near-white / pale blue slash arcs, yellow glows
        if ((R > 170 && G > 170 && B > 170) || (R > 200 && G > 170 && B < 130)) c.fx = (c.fx ?? 0) + 1;
        if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      } else if (kind[i] === BOX) c.onBox++;
      else c.onBg++;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j = yy * W + xx;
          if (grow[j] && label[j] < 0) { label[j] = id; stack.push(j); }
          else if (!grow[j]) { if (kind[j] === BOX) c.onBox++; else if (kind[j] === BG) c.onBg++; }
        }
    }
    if (c.ink > 0) clusters.push(c);
  }

  // 4) drop text: clusters whose surroundings are mostly green
  const sprites = clusters.filter((c) => c.onBox > c.onBg);

  // 3) merge small bits into the nearest big cluster
  const sizes = sprites.map((c) => c.ink).sort((a, b) => b - a);
  const big = sizes[Math.min(sizes.length - 1, Math.floor(sizes.length / 3))] ?? 0; // a typical frame
  // Slash arcs / sparks are big-ish but much lighter than a body; 45% keeps real
  // frames (same unit, similar size) and folds effects into their frame.
  // A cluster that is mostly effect colours (slash arc, glow) is never a frame on
  // its own: it always joins the nearest body.
  const isFx = (c) => (c.fx ?? 0) / c.ink > 0.55;
  const isBig = (c) => c.ink >= big * 0.45 && !isFx(c);
  const bigs = sprites.filter(isBig);
  const dist = (a, b) => {
    const dx = Math.max(0, a.x0 - b.x1, b.x0 - a.x1), dy = Math.max(0, a.y0 - b.y1, b.y0 - a.y1);
    return Math.hypot(dx, dy);
  };
  for (const c of sprites.filter((s) => !isBig(s))) {
    let best = null, bd = Infinity;
    for (const b of bigs) { const d = dist(c, b); if (d < bd) { bd = d; best = b; } }
    if (best && bd < (isFx(c) ? 70 : 40)) {
      best.x0 = Math.min(best.x0, c.x0); best.y0 = Math.min(best.y0, c.y0);
      best.x1 = Math.max(best.x1, c.x1); best.y1 = Math.max(best.y1, c.y1);
      best.merged = [...(best.merged ?? []), c.id];
    }
  }
  let frames = bigs.map((b) => ({ x: b.x0, y: b.y0, w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1, ids: new Set([b.id, ...(b.merged ?? [])]) }));

  // Frames that touch each other end up as one cluster: split anything much taller
  // or wider than a typical frame along its emptiest row/column.
  const med = (xs) => xs.slice().sort((a, b) => a - b)[xs.length >> 1] ?? 0;
  const inkAt = (f, x, y) => kind[y * W + x] === INK && f.ids.has(label[y * W + x]);
  const splitFrame = (f, depth = 0) => {
    const mh = med(frames.map((g) => g.h)), mw = med(frames.map((g) => g.w));
    const tall = f.h > mh * 1.6 && f.h > 40, wide = f.w > mw * 1.7 && f.w > 40;
    if (depth > 8 || (!tall && !wide)) return [f];
    const vertical = tall && (!wide || f.h / mh >= f.w / mw);
    const len = vertical ? f.h : f.w;
    // count ink per line, look in the middle 70% for the emptiest line
    let best = -1, bestN = Infinity;
    for (let a = Math.floor(len * 0.15); a < Math.ceil(len * 0.85); a++) {
      let n = 0;
      if (vertical) for (let x = 0; x < f.w; x++) n += inkAt(f, f.x + x, f.y + a) ? 1 : 0;
      else for (let y = 0; y < f.h; y++) n += inkAt(f, f.x + a, f.y + y) ? 1 : 0;
      if (n < bestN) { bestN = n; best = a; }
    }
    if (best <= 0 || best >= len) return [f];
    const A = vertical
      ? { ...f, h: best, ids: f.ids } : { ...f, w: best, ids: f.ids };
    const B = vertical
      ? { ...f, y: f.y + best, h: f.h - best, ids: f.ids } : { ...f, x: f.x + best, w: f.w - best, ids: f.ids };
    return [...splitFrame(A, depth + 1), ...splitFrame(B, depth + 1)];
  };
  frames = frames.flatMap((f) => splitFrame(f));
  // Shrink each frame to the ink it actually contains.
  frames = frames
    .map((f) => {
      let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
      for (let y = f.y; y < f.y + f.h; y++)
        for (let x = f.x; x < f.x + f.w; x++)
          if (inkAt(f, x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return x1 < 0 ? null : { ...f, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    })
    .filter((f) => f && f.w >= 8 && f.h >= 8);

  // rows: group frames whose vertical centres fall inside an existing row band
  frames.sort((a, b) => a.y - b.y || a.x - b.x);
  const rows = [];
  for (const f of frames) {
    const cy = f.y + f.h / 2;
    const row = rows.find((r) => cy >= r.y0 && cy <= r.y1);
    if (row) { row.frames.push(f); row.y0 = Math.min(row.y0, f.y); row.y1 = Math.max(row.y1, f.y + f.h); }
    else rows.push({ y0: f.y, y1: f.y + f.h, frames: [f] });
  }
  rows.sort((a, b) => a.y0 - b.y0);
  for (const r of rows) r.frames.sort((a, b) => a.x - b.x);
  const ordered = rows.flatMap((r) => r.frames);
  if (!ordered.length) throw new Error(`no frames found in ${path.basename(file)}`);

  // strip: frames on equal cells, anchored bottom-centre, only this frame's ink copied
  const cw = Math.max(...ordered.map((f) => f.w)), ch = Math.max(...ordered.map((f) => f.h));
  const SW = cw * ordered.length;
  const strip = Buffer.alloc(SW * ch * 4);
  ordered.forEach((f, k) => {
    const ox = k * cw + ((cw - f.w) >> 1), oy = ch - f.h;
    for (let y = 0; y < f.h; y++)
      for (let x = 0; x < f.w; x++) {
        const i = (f.y + y) * W + (f.x + x);
        if (kind[i] !== INK || !f.ids.has(label[i])) continue;
        const p = i * 4, q = ((oy + y) * SW + ox + x) * 4;
        strip[q] = data[p]; strip[q + 1] = data[p + 1]; strip[q + 2] = data[p + 2]; strip[q + 3] = 255;
      }
  });
  return { W, H, cw, ch, frames: ordered, rows: rows.map((r) => r.frames.length), strip, SW };
}

const files = fs.readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith(".gif"));
const index = {};
for (const f of files) {
  const key = f.replace(/\.gif$/i, "").toLowerCase().replace(/[()]/g, "").trim().replace(/\s+/g, "-");
  const r = await slice(path.join(srcDir, f));
  await sharp(r.strip, { raw: { width: r.SW, height: r.ch, channels: 4 } })
    .png({ palette: true, colours: 128, effort: 10 })
    .toFile(path.join(outDir, `${key}.png`));
  index[key] = { file: f, cw: r.cw, ch: r.ch, n: r.frames.length, rows: r.rows };
  if (DEBUG) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${r.W}" height="${r.H}">${r.frames
      .map((fr, i) => `<rect x="${fr.x}" y="${fr.y}" width="${fr.w}" height="${fr.h}" fill="none" stroke="#ff0" stroke-width="1"/><text x="${fr.x + 1}" y="${fr.y + 8}" font-size="8" font-family="monospace" fill="#fff" stroke="#000" stroke-width="2" paint-order="stroke">${i}</text>`)
      .join("")}</svg>`;
    await sharp(path.join(srcDir, f)).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(path.join(outDir, `_debug-${key}.png`));
  }
  console.log(`${key.padEnd(28)} ${String(r.frames.length).padStart(3)} frames  rows=[${r.rows.join(",")}]  cell ${r.cw}x${r.ch}`);
}
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index, null, 1));
