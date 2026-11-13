"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnimData } from "./SpritePlayer";
import type { UnitLite } from "@/lib/types";
import { FIELD_H, FIELD_W, FPS, FRAME_EVERY, simulate, winRate, type BattleEvent, type Fighter } from "@/lib/battle";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const SPEEDS = [1, 2, 4, 8];
const TICKS_PER_SEC = FPS; // 1x = the game's frame rate
const ATTACK_TICKS = 10; // how long an attack pose shows
const HIT_TICKS = 8; // how long a hit target flinches
const POP_TICKS = 24; // how long a damage number floats

type Pose = "idle" | "walk" | "attack" | "skill" | "defend";

function Sprite({ slug, anim, pose, frame, flip }: { slug: string; anim?: AnimData; pose: Pose; frame: number; flip: boolean }) {
  if (!anim) return <div className="h-10 w-8 rounded bg-panel-2/70" />;
  const seq = anim.anims[pose] ?? (pose === "skill" ? anim.anims.attack : undefined) ?? (pose === "walk" ? anim.anims.idle : undefined) ?? anim.anims.idle ?? [0];
  const idx = seq[Math.max(0, frame) % seq.length];
  return (
    <span
      aria-hidden
      className="pixel block"
      style={{
        width: anim.cw,
        height: anim.ch,
        backgroundImage: `url(${BASE}/img/anim/${slug}.png)`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${anim.cw * anim.n}px ${anim.ch}px`,
        backgroundPosition: `${-idx * anim.cw}px 0`,
        imageRendering: "pixelated",
        transform: flip ? "scaleX(-1)" : undefined,
      }}
    />
  );
}

/**
 * Plays one simulated battle on the area's own battle backdrop: both parties walk in
 * from opposite ends and fight when in reach. Also shows a win rate over many battles.
 */
export default function BattleView({
  party,
  foes,
  title,
  bg,
  anims,
  onClose,
}: {
  party: UnitLite[];
  foes: UnitLite[];
  title: string;
  bg: string;
  anims: Record<string, AnimData>;
  onClose: () => void;
}) {
  const [seed, setSeed] = useState(1);
  const battle = useMemo(() => simulate(party, foes, seed), [party, foes, seed]);
  const odds = useMemo(() => winRate(party, foes, 200, 101), [party, foes]);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [scale, setScale] = useState(2);
  const boxRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const done = tick >= battle.ticks;

  const restart = (s: number) => { setSeed(s); setTick(0); setPlaying(true); };

  // game clock
  useEffect(() => {
    if (!playing || done) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      setTick((t) => Math.min(battle.ticks, t + (dt / 1000) * TICKS_PER_SEC * speed));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, done, speed, battle.ticks]);

  // fit the 352 x 124 field to the card width
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / FIELD_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const t = Math.floor(tick);
  const shown = useMemo(() => battle.events.filter((e) => e.tick <= t), [battle, t]);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [shown.length]);

  const hp = new Map(battle.start.map((f) => [f.key, f.hp]));
  const lastAct = new Map<string, BattleEvent>(); // latest action by each unit
  const lastHit = new Map<string, number>(); // tick each unit was last hit
  for (const e of shown) {
    for (const h of e.hits) {
      hp.set(h.to, h.hpAfter);
      if (h.dmg > 0 && h.to !== e.from) lastHit.set(h.to, e.tick);
    }
    if (["attack", "counter", "magic", "skill", "heal"].includes(e.kind)) lastAct.set(e.from, e);
  }
  const frame = battle.frames[Math.min(battle.frames.length - 1, Math.floor(t / FRAME_EVERY))];
  const pops = shown
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => t - e.tick < POP_TICKS)
    .flatMap(({ e, i }) => e.hits.map((h, j) => ({ key: `${i}-${j}`, h, age: t - e.tick })));
  const fighters = [...battle.start].sort((a, b) => (frame.units[a.key]?.y ?? 0) - (frame.units[b.key]?.y ?? 0));

  const pose = (f: Fighter): { p: Pose; fr: number } => {
    if ((hp.get(f.key) ?? 0) <= 0) return { p: "defend", fr: 0 };
    const act = lastAct.get(f.key);
    if (act && t - act.tick < ATTACK_TICKS) {
      const p: Pose = act.kind === "magic" || act.kind === "skill" || act.kind === "heal" ? "skill" : "attack";
      return { p, fr: Math.floor((t - act.tick) / 3) };
    }
    const hitAt = lastHit.get(f.key);
    if (hitAt != null && t - hitAt < HIT_TICKS) return { p: "defend", fr: 0 };
    if (frame.units[f.key]?.moving) return { p: "walk", fr: Math.floor(t / 4) };
    return { p: "idle", fr: Math.floor(t / 7) };
  };

  const pct = Math.round(odds.rate * 100);
  const oddsCls = pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-gold" : "text-red-400";
  const sides = [0, 1].map((s) => battle.start.filter((f) => f.side === s));

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel-2 px-3 py-2">
        <h3 className="font-semibold">Battle: {title}</h3>
        <span className="text-xs text-muted">
          Win rate over {odds.runs} battles: <b className={oddsCls}>{pct}%</b>
          {odds.draws > 0 && ` (${odds.draws} ran out of time)`}
        </span>
        <button onClick={onClose} className="ml-auto grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-panel hover:text-ink" aria-label="Close battle">×</button>
      </div>

      {/* Battlefield: the game's 352 x 124 backdrop, scaled to fit */}
      <div ref={boxRef} className="relative w-full overflow-hidden bg-black" style={{ height: FIELD_H * scale }}>
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: FIELD_W,
            height: FIELD_H,
            transform: `scale(${scale})`,
            backgroundImage: `url(${BASE}/img/battle/${bg}.png)`,
            backgroundSize: "100% 100%",
            imageRendering: "pixelated",
          }}
        >
          {fighters.map((f) => {
            const pos = frame.units[f.key];
            const h = hp.get(f.key) ?? 0;
            const { p, fr } = pose(f);
            return (
              <div
                key={f.key}
                className="absolute"
                style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -100%)", opacity: h > 0 ? 1 : 0.35, filter: h > 0 ? undefined : "grayscale(1)" }}
                title={`${f.unit.name} ${h}/${f.maxHp}`}
              >
                <Sprite slug={f.unit.slug} anim={anims[f.unit.slug]} pose={p} frame={fr} flip={f.side === 1} />
                {h > 0 && (
                  <div className="absolute -bottom-[3px] left-1/2 h-[2px] w-6 -translate-x-1/2 bg-black/60">
                    <div className={f.side === 0 ? "h-full bg-emerald-400" : "h-full bg-red-500"} style={{ width: `${(h / f.maxHp) * 100}%` }} />
                  </div>
                )}
              </div>
            );
          })}
          {pops.map(({ key, h, age }) => {
            const at = frame.units[h.to];
            if (!at) return null;
            return (
              <span
                key={key}
                className={`pointer-events-none absolute font-mono text-[9px] font-bold ${h.miss ? "text-white/80" : h.dmg < 0 ? "text-emerald-300" : h.crit ? "text-yellow-300" : "text-red-300"}`}
                style={{
                  left: at.x,
                  top: at.y - 46 - age * 0.8,
                  transform: "translateX(-50%)",
                  opacity: 1 - age / POP_TICKS,
                  textShadow: "0 1px 0 #000, 1px 0 0 #000, -1px 0 0 #000, 0 -1px 0 #000",
                }}
              >
                {h.miss ? "miss" : h.dmg < 0 ? `+${-h.dmg}` : h.dmg || ""}
              </span>
            );
          })}
        </div>
        {done && (
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <div className="rounded-lg border border-line bg-panel px-5 py-3 text-center shadow-xl">
              <div className={`text-2xl font-bold ${battle.winner === 0 ? "text-emerald-400" : battle.winner === 1 ? "text-red-400" : "text-gold"}`}>
                {battle.winner === 0 ? "Party Won!" : battle.winner === 1 ? "Party Lost." : "Time up"}
              </div>
              <button onClick={() => restart(seed + 1)} className="chip mt-2 !py-1 hover:border-accent">Fight again</button>
            </div>
          </div>
        )}
      </div>

      {/* Rosters */}
      <div className="grid grid-cols-2 gap-3 border-t border-line px-3 py-2">
        {sides.map((fs, s) => (
          <ul key={s} className="space-y-1">
            <li className={`text-[10px] font-semibold uppercase ${s ? "text-red-400" : "text-emerald-400"}`}>{s ? "Enemy" : "Your party"}</li>
            {fs.map((f) => {
              const h = hp.get(f.key) ?? 0;
              return (
                <li key={f.key} className={`grid grid-cols-[1fr_auto] items-center gap-x-2 text-xs ${h <= 0 ? "opacity-40" : ""}`}>
                  <span className="truncate">{f.unit.name}</span>
                  <span className="font-mono text-[10px] text-muted">{h}/{f.maxHp}</span>
                  <span className="col-span-2 h-1 overflow-hidden rounded-full bg-panel-2">
                    <span className={`block h-full rounded-full ${h / f.maxHp > 0.5 ? "bg-emerald-500" : h / f.maxHp > 0.2 ? "bg-gold" : "bg-red-500"}`} style={{ width: `${(h / f.maxHp) * 100}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        ))}
      </div>

      {/* Controls + log */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2 text-sm">
        <button className="chip !py-1 hover:border-accent" onClick={() => (done ? restart(seed + 1) : setPlaying((p) => !p))}>
          {done ? "↻ New battle" : playing ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button className="chip !py-1 hover:border-accent" disabled={done} onClick={() => setTick(battle.ticks)}>⏭ Skip to end</button>
        <span className="ml-2 text-xs text-muted">Speed</span>
        {SPEEDS.map((x) => (
          <button key={x} onClick={() => setSpeed(x)} className={`chip !px-2 !py-0.5 !text-xs ${speed === x ? "border-accent bg-accent text-accent-ink" : "hover:border-accent"}`}>{x}×</button>
        ))}
        <span className="ml-auto font-mono text-[11px] text-muted">battle #{seed} · {(t / TICKS_PER_SEC).toFixed(1)}s</span>
      </div>
      <ol ref={logRef} className="max-h-36 overflow-y-auto border-t border-line px-3 py-2 font-mono text-[11px] leading-5">
        {shown.map((e, i) => (
          <li key={i} className={e.kind === "ko" ? "text-red-400" : e.kind === "heal" || e.kind === "regen" || e.kind === "revive" ? "text-emerald-400" : e.kind === "skill" ? "text-gold" : e.from.startsWith("1") ? "text-muted" : ""}>
            {e.text}
          </li>
        ))}
        {shown.length === 0 && <li className="text-muted">Both parties advance…</li>}
      </ol>
    </div>
  );
}
