// Battle simulator. Plain TypeScript, no React: runs in the browser for the Party page.
//
// Battles in the game are real-time: every unit has an action gauge that fills with its
// AGI, and it acts when the gauge is full. This engine steps that clock one tick at a
// time and resolves each action with the units' own stats and abilities:
//   hit chance   50% + Hit / 2 + (its DEX - target AGI) / 2, between 20% and 98%
//   physical     ATK - target DEF (min 1), ±10%
//   magic        INT - target WIS / 2 (min 1), ±10%; never misses
//   healing      WIS / 2 + up to 25%
// Ability numbers follow the game's effect table where it has one (Critical x2 at 20%,
// Counter 40%, Physical Reduction x0.6, Magic Reduction x0.75, HP Drain 1/3, auto
// restore every 33 ticks).
import type { UnitLite } from "./types";

export type Side = 0 | 1;
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
  hit: number;
  role: "melee" | "ranged" | "mage" | "healer";
  gauge: number;
  actions: number;
  sleep: number;
  stun: number;
  silence: number;
  confuse: number;
  revived: boolean;
}

export type EventKind = "attack" | "skill" | "magic" | "heal" | "counter" | "regen" | "status" | "ko" | "revive";
export interface Hit {
  to: string;
  dmg: number; // negative = healing
  miss?: boolean;
  crit?: boolean;
  hpAfter: number;
}
export interface BattleEvent {
  tick: number;
  kind: EventKind;
  from: string;
  hits: Hit[];
  text: string;
}
export interface BattleResult {
  winner: Side | null; // null = time ran out
  ticks: number;
  events: BattleEvent[];
  start: Fighter[];
}

const AOE = new Set([
  "Dragon Breath", "Tidal Wave", "Earthquake", "Meteor Strike", "Thunder Storm", "Angry Wind",
  "Judgment of Heaven", "Flame Formation", "Collapse", "Turmoil", "Spirit Banquet", "Lost Soul", "Shout", "Skull Summon",
]);
const STATUS: Record<string, { kind: "sleep" | "stun" | "silence" | "confuse"; turns: number; chance: number }> = {
  "Siren's Lullaby": { kind: "sleep", turns: 3, chance: 0.35 },
  "Eternal Rest": { kind: "sleep", turns: 3, chance: 0.3 },
  Paralysis: { kind: "stun", turns: 2, chance: 0.35 },
  Adhesion: { kind: "stun", turns: 2, chance: 0.35 },
  Bash: { kind: "stun", turns: 1, chance: 0.3 },
  Silence: { kind: "silence", turns: 3, chance: 0.4 },
  Confusion: { kind: "confuse", turns: 1, chance: 0.3 },
  Charm: { kind: "confuse", turns: 2, chance: 0.3 },
  "Lure of the Dead": { kind: "confuse", turns: 1, chance: 0.3 },
};
const GAUGE = 100;
const MAX_TICKS = 4000;

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

function role(u: UnitLite): Fighter["role"] {
  if (u.ability === "Restore" || u.race === "Priest") return "healer";
  if (u.int > u.atk * 1.15) return "mage";
  if (u.race === "Archer" || u.ability === "Antiaircraft") return "ranged";
  return "melee";
}

function fighter(u: UnitLite, side: Side, pos: number): Fighter {
  return {
    key: `${side}-${pos}`, side, pos, unit: u, maxHp: u.hp, hp: u.hp,
    atk: u.atk, def: u.def, agi: Math.max(1, u.agi), dex: u.dex, wis: u.wis, int: u.int, hit: u.hit,
    role: role(u), gauge: 0, actions: 0, sleep: 0, stun: 0, silence: 0, confuse: 0, revived: false,
  };
}

export function simulate(a: UnitLite[], b: UnitLite[], seed = 1): BattleResult {
  const r = rng(seed);
  const all = [...a.map((u, i) => fighter(u, 0, i)), ...b.map((u, i) => fighter(u, 1, i))];
  const start = all.map((f) => ({ ...f }));
  const events: BattleEvent[] = [];
  const alive = (s: Side) => all.filter((f) => f.side === s && f.hp > 0);
  const vary = () => 0.9 + r() * 0.2;
  // stagger the opening so equal-AGI units don't all act on the same tick
  for (const f of all) f.gauge = r() * 40;

  const damage = (from: Fighter, to: Fighter, magic: boolean, mult = 1) => {
    let d = magic ? from.int - to.wis / 2 : from.atk - to.def;
    d = Math.max(1, d) * vary() * mult;
    if (!magic && to.unit.ability === "Physical Reduction") d *= 0.6;
    if (magic && (to.unit.ability === "Magic Reduction" || to.unit.ability === "Magic Reflection")) d *= 0.75;
    if (!magic && from.unit.ability === "Antiaircraft" && to.unit.move === "Fly") d *= 2;
    return Math.max(1, Math.round(d));
  };

  const ko = (to: Fighter, tick: number) => {
    if (to.hp > 0) return;
    if (to.unit.ability === "Revive" && !to.revived) {
      to.revived = true;
      to.hp = Math.round(to.maxHp / 2);
      events.push({ tick, kind: "revive", from: to.key, hits: [{ to: to.key, dmg: -to.hp, hpAfter: to.hp }], text: `${to.unit.name} revives!` });
      return;
    }
    events.push({ tick, kind: "ko", from: to.key, hits: [], text: `${to.unit.name} is knocked out.` });
  };

  /** Melee hits the front-most enemies; ranged and magic pick the weakest. */
  const pickTarget = (f: Fighter, foes: Fighter[]) => {
    if (f.role === "melee") {
      const front = foes.slice(0, 2);
      return front[Math.floor(r() * front.length)];
    }
    return foes.reduce((m, x) => (x.hp < m.hp ? x : m), foes[0]);
  };

  const physical = (f: Fighter, to: Fighter, tick: number, kind: EventKind = "attack", mult = 1) => {
    const evade = to.unit.ability === "Evade" ? 20 : 0;
    const chance = Math.min(98, Math.max(20, 50 + f.hit / 2 + (f.dex - to.agi) / 2 - evade));
    const asleep = to.sleep > 0;
    if (!asleep && r() * 100 >= chance) {
      events.push({ tick, kind, from: f.key, hits: [{ to: to.key, dmg: 0, miss: true, hpAfter: to.hp }], text: `${f.unit.name} misses ${to.unit.name}.` });
      return false;
    }
    let m = mult;
    const crit = (f.unit.ability === "Critical" && r() < 0.2) || (f.unit.ability === "Back Stab" && r() < 0.3);
    if (crit) m *= f.unit.ability === "Back Stab" ? 1.5 : 2;
    const d = damage(f, to, false, m);
    to.hp = Math.max(0, to.hp - d);
    to.sleep = 0; // a hit wakes a sleeper
    const hits: Hit[] = [{ to: to.key, dmg: d, crit, hpAfter: to.hp }];
    let text = `${f.unit.name} ${kind === "counter" ? "counters" : "hits"} ${to.unit.name} for ${d}${crit ? " (critical!)" : ""}.`;
    if (f.unit.ability === "HP Drain") {
      const heal = Math.min(f.maxHp - f.hp, Math.round(d / 3));
      if (heal > 0) { f.hp += heal; hits.push({ to: f.key, dmg: -heal, hpAfter: f.hp }); text += ` Drains ${heal} HP.`; }
    }
    if (f.unit.ability === "Death Touch" && to.hp > 0 && r() < 0.05) {
      hits[0].dmg += to.hp; to.hp = 0; hits[0].hpAfter = 0; text += " Death Touch!";
    }
    events.push({ tick, kind, from: f.key, hits, text });
    const st = STATUS[f.unit.ability];
    if (st && to.hp > 0 && r() < st.chance) {
      to[st.kind] = Math.max(to[st.kind], st.turns);
      const word = { sleep: "falls asleep", stun: "is paralysed", silence: "is silenced", confuse: "is confused" }[st.kind];
      events.push({ tick, kind: "status", from: f.key, hits: [{ to: to.key, dmg: 0, hpAfter: to.hp }], text: `${to.unit.name} ${word}.` });
    }
    ko(to, tick);
    // counter-attack (melee only)
    if (kind === "attack" && f.role === "melee" && to.hp > 0 && to.unit.ability === "Counter" && to.stun === 0 && to.sleep === 0 && r() < 0.4 && f.hp > 0) {
      physical(to, f, tick, "counter");
    }
    return true;
  };

  let tick = 0;
  for (; tick < MAX_TICKS; tick++) {
    if (!alive(0).length || !alive(1).length) break;
    // auto HP restore every 33 ticks
    if (tick % 33 === 0 && tick > 0)
      for (const f of all)
        if (f.hp > 0 && f.unit.ability === "Automatic HP Restore" && f.hp < f.maxHp) {
          const h = Math.min(5, f.maxHp - f.hp);
          f.hp += h;
          events.push({ tick, kind: "regen", from: f.key, hits: [{ to: f.key, dmg: -h, hpAfter: f.hp }], text: `${f.unit.name} restores ${h} HP.` });
        }

    const ready = all.filter((f) => f.hp > 0 && (f.gauge += f.agi / 10) >= GAUGE).sort((x, y) => y.gauge - x.gauge);
    for (const f of ready) {
      if (f.hp <= 0) continue;
      f.gauge -= GAUGE;
      f.actions++;
      if (f.sleep > 0) { f.sleep--; continue; }
      if (f.stun > 0) { f.stun--; continue; }
      if (f.silence > 0) f.silence--;
      const own = alive(f.side);
      let foes = alive((1 - f.side) as Side);
      if (!foes.length) break;
      if (f.confuse > 0) {
        f.confuse--;
        if (own.length > 1) foes = own.filter((x) => x !== f);
      }

      // healer: patch up the most hurt ally below 70%
      if (f.role === "healer" && f.silence === 0 && f.confuse === 0) {
        const hurt = own.filter((x) => x.hp < x.maxHp * 0.7).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
        if (hurt) {
          const h = Math.min(hurt.maxHp - hurt.hp, Math.round((f.wis / 2) * (1 + r() * 0.25)));
          hurt.hp += h;
          events.push({ tick, kind: "heal", from: f.key, hits: [{ to: hurt.key, dmg: -h, hpAfter: hurt.hp }], text: `${f.unit.name} heals ${hurt.unit.name} for ${h}.` });
          continue;
        }
      }

      // area skills: every third action, hits every enemy
      if (AOE.has(f.unit.ability) && f.actions % 3 === 0 && f.silence === 0) {
        const magic = f.int >= f.atk;
        const hits = foes.map((to) => {
          const d = damage(f, to, magic, 0.7);
          to.hp = Math.max(0, to.hp - d);
          return { to: to.key, dmg: d, hpAfter: to.hp };
        });
        events.push({ tick, kind: "skill", from: f.key, hits, text: `${f.unit.name} uses ${f.unit.ability}!` });
        foes.forEach((to) => ko(to, tick));
        continue;
      }

      const to = pickTarget(f, foes);
      if (f.role === "mage" || (f.role === "healer" && f.int > f.atk)) {
        if (f.silence === 0) {
          const d = damage(f, to, true);
          to.hp = Math.max(0, to.hp - d);
          to.sleep = 0;
          events.push({ tick, kind: "magic", from: f.key, hits: [{ to: to.key, dmg: d, hpAfter: to.hp }], text: `${f.unit.name} casts at ${to.unit.name} for ${d}.` });
          ko(to, tick);
          continue;
        }
      }
      physical(f, to, tick);
    }
  }
  const w0 = alive(0).length > 0, w1 = alive(1).length > 0;
  return { winner: w0 && !w1 ? 0 : w1 && !w0 ? 1 : null, ticks: tick, events, start };
}

/** Run many battles with different seeds: how often side 0 wins. */
export function winRate(a: UnitLite[], b: UnitLite[], runs = 100, seed = 1) {
  let wins = 0, losses = 0;
  for (let i = 0; i < runs; i++) {
    const w = simulate(a, b, seed + i * 7919).winner;
    if (w === 0) wins++;
    else if (w === 1) losses++;
  }
  return { wins, losses, draws: runs - wins - losses, runs, rate: wins / runs };
}
