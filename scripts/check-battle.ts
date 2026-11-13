// Sanity checks for the battle simulator: node scripts/check-battle.ts
import fs from "node:fs";
import { simulate, winRate } from "../src/lib/battle.ts";

const raw = JSON.parse(fs.readFileSync("src/data/units.json", "utf8"));
const u = (n: string) => {
  const x = raw.find((r: { name: string }) => r.name === n);
  return { ...x, ability: x.ability || "", slug: n.toLowerCase(), img: "", raceImg: null, next: [], prev: [], needs: [], drops: [] };
};
const enemies = JSON.parse(fs.readFileSync("src/data/enemies.json", "utf8"));
let problems = 0;
const check = (ok: boolean, msg: string) => { if (!ok) { problems++; console.log("FAIL", msg); } };

const r = simulate([u("Soldier"), u("Soldier"), u("Archer"), u("Noble")], [u("Soldier"), u("Primitive Cell")], 3);
console.log(r.events.slice(0, 8).map((e) => `${e.tick}: ${e.text}`).join("\n"), `\n... ${r.events.length} events, winner ${r.winner}, ${r.ticks} ticks`);
check(simulate([u("Soldier")], [u("Soldier")], 5).events.length === simulate([u("Soldier")], [u("Soldier")], 5).events.length, "same seed replays the same battle");
check(winRate([u("Khazad's Ghost")], [u("Soldier")], 50).rate === 1, "rank 9 beats a Soldier every time");
check(winRate([u("Soldier")], [u("Khazad's Ghost")], 50).rate === 0, "a Soldier never beats a rank 9");
// every enemy party in the game must resolve
let t = Date.now(), n = 0, draws = 0;
for (const a of enemies) for (const p of a.parties) if (p.length) {
  const w = simulate([u("Warrior"), u("Archer"), u("Priest"), u("Knight")], p.map(u), n).winner; n++; if (w === null) draws++;
}
console.log(`${n} battles vs every enemy party in ${Date.now() - t} ms, ${draws} timed out`);
check(draws < n * 0.05, "few battles time out");
console.log(problems ? `${problems} problems` : "0 problems");
process.exit(problems ? 1 : 0);
