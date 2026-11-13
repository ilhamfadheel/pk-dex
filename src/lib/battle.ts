// Battle simulator, following the game program (6RAH.APP, ARM code, VA base 0x10000000).
// Plain TypeScript, no React: runs in the browser for the Party page.
//
// From the game's code (addresses are where each rule lives):
//   field        x is kept between 20 and 332 on the 352 px battlefield        0x100225d8
//   walking      units step toward their target 2 px a frame (a few kinds 3-4)  0x10022f44
//   reach        they stop at reach + own half-width + target half-width;
//                half-widths by body size: mover 15/20/25, target 8/15/20       0x10022f58
//   next action  after acting, wait 30 - min(5, Lv/3) - AGI/10 frames           0x100221a4
//   stagger      a hit unit is pushed back 2 px a frame for 4 frames and
//                can't act for 25 - AGI/5 frames                                0x100228e0 / 0x10022674
//   hit roll     rand%100 < ACC + min(15, 3*Lv) - target AGI/4                  0x1000e1f4
//   guard        rand%100 < target AGI/4 halves the damage (not while asleep
//                or paralysed)                                                  0x1000e700
//   physical     ATK - DEF; x2 vs flyers for anti-air attackers                 0x1000e5c0
//   magic        INT - target INT                                               0x1000e538
//   reductions   Physical Reduction x0.8/0.6/0.5, Magic Reduction x0.75         0x1000e7e4 / 0x1000e77c
//   minimum      every hit does at least 1                                      0x1000e8b0
// Stats are the game's own (unit.dat -> src/data/unit-battle.json), at level 1, unequipped.
// Not pinned down in the code yet, so modelled: archer/caster reach, healing amount and
// the area/status abilities (see AOE / STATUS below).
import battleStats from "../data/unit-battle.json" with { type: "json" };
import type { UnitLite } from "./types";

export type Side = 0 | 1;
export const FIELD_W = 352;
export const FIELD_H = 124;
const X_MIN = 20, X_MAX = 332;
const GROUND_TOP = 78; // feet y of the back lane
const LANE = 11;
const LEVEL = 1;

interface GameStats { size: number; hp: number; atk: number; def: number; agi: number; dex: number; wis: number; int: number; acc: number }
const STATS = battleStats as Record<string, GameStats>;

export interface Fighter {
  key: string; // "0-2" = side 0, position 2
  side: Side;
  pos: number;
  unit: UnitLite;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  agi: number;
  dex: number;
  wis: number;
  int: number;
  acc: number;
  size: "small" | "medium" | "large";
  role: "melee" | "ranged" | "mage" | "healer";
  x: number;
  y: number;
  speed: number;
  reach: number;
  wait: number; // frames until it can act again
  knock: number; // knock-back frames left
  knockDir: number;
  actions: number;
  sleep: number;
  stun: number;
  silence: number;
  confuse: number;
}

export type EventKind = "attack" | "skill" | "magic" | "heal" | "counter" | "regen" | "status" | "ko" | "revive";
export interface Hit {
  to: string;
  dmg: number; // negative = healing
  miss?: boolean;
  crit?: boolean;
  guard?: boolean;
  hpAfter: number;
}
export interface BattleEvent {
  tick: number;
  kind: EventKind;
  from: string;
  hits: Hit[];
  text: string;
}
export interface Frame {
  tick: number;
  units: Record<string, { x: number; y: number; moving: boolean }>;
}
export interface BattleResult {
  winner: Side | null;
  ticks: number;
  events: BattleEvent[];
  frames: Frame[];
  start: Fighter[];
}
export const FRAME_EVERY = 2;
export const FPS = 30;

const AOE = new Set([
  "Dragon Breath", "Tidal Wave", "Earthquake", "Meteor Strike", "Thunder Storm", "Angry Wind",
  "Judgment of Heaven", "Flame Formation", "Collapse", "Turmoil", "Spirit Banquet", "Lost Soul", "Shout", "Skull Summon",
]);
// status abilities; cure each action at WIS/2 % (sleep) or INT/2 % (others) as in the game (0x1000a5f8)
const STATUS: Record<string, { kind: "sleep" | "stun" | "silence" | "confuse"; chance: number }> = {
  "Siren's Lullaby": { kind: "sleep", chance: 35 },
  "Eternal Rest": { kind: "sleep", chance: 30 },
  Paralysis: { kind: "stun", chance: 35 },
  Adhesion: { kind: "stun", chance: 35 },
  Bash: { kind: "stun", chance: 30 },
  Silence: { kind: "silence", chance: 40 },
  Confusion: { kind: "confuse", chance: 30 },
  Charm: { kind: "confuse", chance: 30 },
  "Lure of the Dead": { kind: "confuse", chance: 30 },
};
const MAX_TICKS = FPS * 180;
const HALF_SELF = { small: 15, medium: 20, large: 25 } as const;
const HALF_TARGET = { small: 8, medium: 15, large: 20 } as const;

/** Small seeded RNG (mulberry32) so a battle can be replayed exactly. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function role(u: UnitLite, s: GameStats): Fighter["role"] {
  if (u.ability === "Restore" || u.race === "Priest") return "healer";
  if (s.int > s.atk * 1.15) return "mage";
  if (u.race === "Archer" || u.ability === "Antiaircraft") return "ranged";
  return "melee";
}

function fighter(u: UnitLite, side: Side, pos: number, count: number): Fighter {
  const s = STATS[u.name] ?? { size: u.slots >= 3 ? 4 : u.slots, hp: u.hp, atk: u.atk, def: u.def, agi: u.agi, dex: u.dex, wis: u.wis, int: u.int, acc: u.hit };
  const r = role(u, s);
  const back = r === "melee" ? 0 : 30;
  const lane = count <= 1 ? 1.5 : (pos * 3) / (count - 1);
  const size = s.size >= 4 ? "large" : s.size === 2 ? "medium" : "small";
  return {
    key: `${side}-${pos}`, side, pos, unit: u, maxHp: s.hp, hp: s.hp,
    atk: s.atk, def: s.def, agi: s.agi, dex: s.dex, wis: s.wis, int: s.int, acc: s.acc, size, role: r,
    x: side === 0 ? 60 - back : FIELD_W - 60 + back,
    y: GROUND_TOP + lane * LANE,
    speed: u.move === "Fly" ? 3 : 2,
    // melee reach: the most common value in the game's unit routines (25); ranged/casters modelled
    reach: r === "melee" ? 25 : r === "ranged" ? 140 : 110,
    wait: 0, knock: 0, knockDir: 0, actions: 0, sleep: 0, stun: 0, silence: 0, confuse: 0,
  };
}

const gap = (a: Fighter, b: Fighter) => Math.abs(a.x - b.x);
const stopAt = (f: Fighter, t: Fighter) => f.reach + HALF_SELF[f.size] + HALF_TARGET[t.size];
const inReach = (f: Fighter, t: Fighter) => gap(f, t) <= stopAt(f, t) && Math.abs(f.y - t.y) <= (f.role === "melee" ? 22 : 60);
const nextWait = (f: Fighter) => 30 - Math.min(5, Math.floor(LEVEL / 3)) - Math.floor(f.agi / 10);

export function simulate(a: UnitLite[], b: UnitLite[], seed = 1, record = true): BattleResult {
  const r = rng(seed);
  const roll = () => Math.floor(r() * 100); // rand() % 100
  const all = [...a.map((u, i) => fighter(u, 0, i, a.length)), ...b.map((u, i) => fighter(u, 1, i, b.length))];
  const start = all.map((f) => ({ ...f }));
  const events: BattleEvent[] = [];
  const frames: Frame[] = [];
  const alive = (s: Side) => all.filter((f) => f.side === s && f.hp > 0);
  for (const f of all) f.wait = Math.floor(r() * 10); // opening stagger

  const ko = (to: Fighter, tick: number) => {
    if (to.hp <= 0) events.push({ tick, kind: "ko", from: to.key, hits: [], text: `${to.unit.name} is knocked out.` });
  };
  const stagger = (to: Fighter, from: Fighter) => {
    to.knock = 4;
    to.knockDir = to.x >= from.x ? 1 : -1;
    to.wait = Math.max(to.wait, 25 - Math.floor(to.agi / 5));
  };

  /** One attack resolved the way the game's damage routine does it. */
  const strike = (f: Fighter, to: Fighter, tick: number, kind: EventKind, magic: boolean) => {
    const evade = to.unit.ability === "Evade" ? 20 : 0;
    const chance = f.acc + Math.min(15, 3 * LEVEL) - Math.floor(to.agi / 4) - evade;
    if (to.sleep === 0 && roll() >= chance) {
      events.push({ tick, kind, from: f.key, hits: [{ to: to.key, dmg: 0, miss: true, hpAfter: to.hp }], text: `${f.unit.name} misses ${to.unit.name}.` });
      return;
    }
    let d = magic ? f.int - to.int : f.atk - to.def;
    if (!magic && f.unit.ability === "Antiaircraft" && to.unit.move === "Fly") d *= 2;
    const crit = !magic && f.unit.ability === "Critical" && roll() < 20;
    if (crit) d *= 2;
    const guard = to.sleep === 0 && to.stun === 0 && roll() < Math.floor(to.agi / 4);
    if (guard) d = Math.trunc(d / 2);
    if (magic && (to.unit.ability === "Magic Reduction" || to.unit.ability === "Magic Reflection")) d -= Math.trunc(d / 4);
    if (!magic && to.unit.ability === "Physical Reduction") d = Math.trunc((d * 3) / 5);
    d = Math.max(1, d);
    to.hp = Math.max(0, to.hp - d);
    to.sleep = 0;
    stagger(to, f);
    const hits: Hit[] = [{ to: to.key, dmg: d, crit, guard, hpAfter: to.hp }];
    const verb = kind === "counter" ? "counters" : magic ? "casts at" : "hits";
    let text = `${f.unit.name} ${verb} ${to.unit.name} for ${d}${crit ? " (critical!)" : ""}${guard ? " (guarded)" : ""}.`;
    if (f.unit.ability === "HP Drain") {
      const heal = Math.min(f.maxHp - f.hp, Math.trunc(Math.max(3, f.atk - to.def) / 3));
      if (heal > 0) { f.hp += heal; hits.push({ to: f.key, dmg: -heal, hpAfter: f.hp }); text += ` Drains ${heal} HP.`; }
    }
    if (f.unit.ability === "Death Touch" && to.hp > 0 && roll() < 5) { hits[0].dmg += to.hp; to.hp = 0; hits[0].hpAfter = 0; text += " Death Touch!"; }
    events.push({ tick, kind, from: f.key, hits, text });
    const st = STATUS[f.unit.ability];
    if (st && to.hp > 0 && roll() < st.chance) {
      to[st.kind] = Math.max(to[st.kind], 3);
      const word = { sleep: "falls asleep", stun: "is paralysed", silence: "is silenced", confuse: "is confused" }[st.kind];
      events.push({ tick, kind: "status", from: f.key, hits: [{ to: to.key, dmg: 0, hpAfter: to.hp }], text: `${to.unit.name} ${word}.` });
    }
    ko(to, tick);
    // Counter: melee hit from within 40 px in front (0x10022a70)
    if (kind === "attack" && !magic && to.hp > 0 && f.hp > 0 && to.unit.ability === "Counter" && to.stun === 0 && to.sleep === 0 && gap(f, to) <= 40 + HALF_TARGET[f.size] && roll() < 40) {
      strike(to, f, tick, "counter", false);
    }
  };

  let tick = 0;
  for (; tick < MAX_TICKS; tick++) {
    const sides = [alive(0), alive(1)];
    if (!sides[0].length || !sides[1].length) break;
    const moving = new Set<string>();

    // Auto HP Restore: every 33 ticks (0x10022384), 5 HP
    if (tick % 33 === 0 && tick > 0)
      for (const f of all)
        if (f.hp > 0 && f.unit.ability === "Automatic HP Restore" && f.hp < f.maxHp) {
          const h = Math.min(5, f.maxHp - f.hp);
          f.hp += h;
          events.push({ tick, kind: "regen", from: f.key, hits: [{ to: f.key, dmg: -h, hpAfter: f.hp }], text: `${f.unit.name} restores ${h} HP.` });
        }

    for (const f of all) {
      if (f.hp <= 0) continue;
      // knock-back: 2 px a frame for 4 frames
      if (f.knock > 0) { f.knock--; f.x = Math.min(X_MAX, Math.max(X_MIN, f.x + 2 * f.knockDir)); }
      if (f.wait > 0) { f.wait--; continue; }
      if (f.sleep > 0 || f.stun > 0) {
        // natural cure roll once per would-be action: WIS/2 % for sleep, INT/2 % for paralysis
        const cure = f.sleep > 0 ? f.wis / 2 : f.int / 2;
        if (roll() < cure) { f.sleep = 0; f.stun = 0; } else { if (f.sleep) f.sleep--; if (f.stun) f.stun--; }
        f.wait = nextWait(f);
        continue;
      }
      const own = sides[f.side];
      let foes = sides[1 - f.side].filter((x) => x.hp > 0);
      if (!foes.length) break;
      if (f.confuse > 0 && own.length > 1) foes = own.filter((x) => x !== f && x.hp > 0);

      // healer: heal the most hurt ally in reach below 70%
      if (f.role === "healer" && f.silence === 0 && f.confuse === 0) {
        const hurt = own.filter((x) => x.hp > 0 && x.hp < x.maxHp * 0.7 && gap(f, x) <= f.reach).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
        if (hurt) {
          const h = Math.min(hurt.maxHp - hurt.hp, Math.max(1, Math.floor(f.wis / 2)));
          hurt.hp += h;
          f.actions++;
          f.wait = nextWait(f) + 10;
          events.push({ tick, kind: "heal", from: f.key, hits: [{ to: hurt.key, dmg: -h, hpAfter: hurt.hp }], text: `${f.unit.name} heals ${hurt.unit.name} for ${h}.` });
          continue;
        }
      }

      // target: nearest enemy (melee); ranged and casters pick the weakest in reach
      let t = foes[0];
      for (const x of foes) if (gap(f, x) < gap(f, t)) t = x;
      if (f.role !== "melee") {
        const near = foes.filter((x) => inReach(f, x));
        if (near.length) t = near.reduce((m, x) => (x.hp < m.hp ? x : m), near[0]);
      }

      if (!inReach(f, t)) {
        // walk toward the target at the unit's speed; drift into its lane
        const dir = t.x > f.x ? 1 : -1;
        const room = gap(f, t) - stopAt(f, t);
        f.x = Math.min(X_MAX, Math.max(X_MIN, f.x + dir * (room > 0 ? Math.min(f.speed, room) : f.speed)));
        if (Math.abs(t.y - f.y) > 2) f.y += Math.sign(t.y - f.y);
        moving.add(f.key);
        continue;
      }

      f.actions++;
      f.wait = nextWait(f) + 8; // + attack animation
      if (f.silence > 0) f.silence--;
      if (f.confuse > 0) f.confuse--;

      if (AOE.has(f.unit.ability) && f.actions % 3 === 0 && f.silence === 0) {
        const magic = f.int >= f.atk;
        const area = foes.filter((x) => gap(t, x) <= 60);
        const hits = area.map((x) => {
          const d = Math.max(1, magic ? f.int - x.int : f.atk - x.def);
          x.hp = Math.max(0, x.hp - d);
          stagger(x, f);
          return { to: x.key, dmg: d, hpAfter: x.hp };
        });
        events.push({ tick, kind: "skill", from: f.key, hits, text: `${f.unit.name} uses ${f.unit.ability}!` });
        area.forEach((x) => ko(x, tick));
        continue;
      }
      const magic = (f.role === "mage" || (f.role === "healer" && f.int > f.atk)) && f.silence === 0;
      strike(f, t, tick, magic ? "magic" : "attack", magic);
    }

    if (record && tick % FRAME_EVERY === 0)
      frames.push({ tick, units: Object.fromEntries(all.map((f) => [f.key, { x: f.x, y: f.y, moving: moving.has(f.key) }])) });
  }
  if (record) frames.push({ tick, units: Object.fromEntries(all.map((f) => [f.key, { x: f.x, y: f.y, moving: false }])) });
  const w0 = alive(0).length > 0, w1 = alive(1).length > 0;
  return { winner: w0 && !w1 ? 0 : w1 && !w0 ? 1 : null, ticks: tick, events, frames, start };
}

/** Run many battles with different seeds: how often side 0 wins. */
export function winRate(a: UnitLite[], b: UnitLite[], runs = 100, seed = 1) {
  let wins = 0, losses = 0;
  for (let i = 0; i < runs; i++) {
    const w = simulate(a, b, seed + i * 7919, false).winner;
    if (w === 0) wins++;
    else if (w === 1) losses++;
  }
  return { wins, losses, draws: runs - wins - losses, runs, rate: wins / runs };
}
