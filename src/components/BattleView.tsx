"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnimData } from "./SpritePlayer";
import type { UnitLite } from "@/lib/types";
import { simulate, winRate, type BattleEvent, type Fighter } from "@/lib/battle";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const SPEEDS = [1, 2, 4, 8];
const STEP_MS = 650;

type Pose = "idle" | "attack" | "skill" | "defend";

function Sprite({ f, anim, pose, frame, flip }: { f: Fighter; anim?: AnimData; pose: Pose; frame: number; flip: boolean }) {
  if (!anim) return <div className="h-16 w-16 rounded bg-panel-2" />;
  const seq = anim.anims[pose] ?? (pose === "skill" ? anim.anims.attack : undefined) ?? anim.anims.idle ?? [0];
  const idx = seq[Math.min(frame, seq.length - 1) % seq.length];
  const scale = Math.max(1, Math.min(2, Math.floor(110 / Math.max(anim.cw, anim.ch))));
  return (
    <span
      role="img"
      aria-label={f.unit.name}
      className="pixel block"
      style={{
        width: anim.cw * scale,
        height: anim.ch * scale,
        backgroundImage: `url(${BASE}/img/anim/${f.unit.slug}.png)`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${anim.cw * anim.n * scale}px ${anim.ch * scale}px`,
        backgroundPosition: `${-idx * anim.cw * scale}px 0`,
        imageRendering: "pixelated",
        transform: flip ? "scaleX(-1)" : undefined,
      }}
    />
  );
}

/**
 * Plays one simulated battle between your party (left) and an enemy party (right),
 * step by step with the units' battle sprites, plus a win rate over many battles.
 */
export default function BattleView({
  party,
  foes,
  title,
  anims,
  onClose,
}: {
  party: UnitLite[];
  foes: UnitLite[];
  title: string;
  anims: Record<string, AnimData>;
  onClose: () => void;
}) {
  const [seed, setSeed] = useState(1);
  const battle = useMemo(() => simulate(party, foes, seed), [party, foes, seed]);
  const odds = useMemo(() => winRate(party, foes, 300, 101), [party, foes]);
  const [step, setStep] = useState(0); // events shown so far
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [frame, setFrame] = useState(0);
  const logRef = useRef<HTMLOListElement>(null);
  const done = step >= battle.events.length;

  // new battle -> start over
  const restart = (s: number) => { setSeed(s); setStep(0); setPlaying(true); };

  useEffect(() => {
    if (!playing || done) return;
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS / speed);
    return () => clearTimeout(t);
  }, [playing, done, step, speed]);

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => f + 1), 160);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [step]);

  // HP after the events shown so far
  const hp = useMemo(() => {
    const m = new Map(battle.start.map((f) => [f.key, f.hp]));
    for (const e of battle.events.slice(0, step)) for (const h of e.hits) m.set(h.to, h.hpAfter);
    return m;
  }, [battle, step]);
  const current: BattleEvent | undefined = step > 0 ? battle.events[step - 1] : undefined;
  const hitKeys = new Set(current?.hits.map((h) => h.to));
  const sides = [0, 1].map((s) => battle.start.filter((f) => f.side === s));

  const pct = Math.round(odds.rate * 100);
  const oddsCls = pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-gold" : "text-red-400";

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

      {/* Stage */}
      <div className="relative grid grid-cols-2 gap-2 bg-[linear-gradient(to_bottom,var(--panel)_0%,var(--panel-2)_70%)] p-3 sm:gap-8 sm:p-5">
        {sides.map((fs, s) => (
          <ol key={s} className={`flex flex-col justify-center gap-2 ${s ? "items-start" : "items-end"}`}>
            {fs.map((f) => {
              const h = hp.get(f.key)!;
              const acting = current?.from === f.key && !["ko", "regen", "status", "revive"].includes(current.kind);
              const hit = current && hitKeys.has(f.key) && current.from !== f.key;
              const mine = current?.hits.find((x) => x.to === f.key);
              const pose: Pose = acting ? (current!.kind === "skill" || current!.kind === "magic" || current!.kind === "heal" ? "skill" : "attack") : hit ? "defend" : "idle";
              const down = h <= 0;
              return (
                <li key={f.key} className={`flex items-end gap-2 ${s ? "flex-row-reverse" : ""}`}>
                  <div className={`relative transition-transform duration-150 ${acting ? (s ? "-translate-x-3" : "translate-x-3") : ""} ${down ? "opacity-25 grayscale" : ""}`}>
                    <Sprite f={f} anim={anims[f.unit.slug]} pose={down ? "defend" : pose} frame={acting || hit ? step + frame % 4 : frame} flip={s === 1} />
                    {mine && (
                      <span
                        key={step}
                        className={`pk-dmg absolute inset-x-0 -top-2 text-center font-mono text-sm font-bold drop-shadow ${mine.miss ? "text-muted" : mine.dmg < 0 ? "text-emerald-400" : mine.crit ? "text-gold" : "text-red-400"}`}
                      >
                        {mine.miss ? "miss" : mine.dmg < 0 ? `+${-mine.dmg}` : mine.dmg || ""}
                      </span>
                    )}
                  </div>
                  <div className={`w-24 sm:w-32 ${s ? "text-right" : ""}`}>
                    <div className="truncate text-xs font-medium">{f.unit.name}</div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-panel">
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ${h / f.maxHp > 0.5 ? "bg-emerald-500" : h / f.maxHp > 0.2 ? "bg-gold" : "bg-red-500"} ${s ? "ml-auto" : ""}`}
                        style={{ width: `${(h / f.maxHp) * 100}%` }}
                      />
                    </div>
                    <div className="font-mono text-[10px] text-muted">{h}/{f.maxHp}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        ))}
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

      {/* Controls + log */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2 text-sm">
        <button className="chip !py-1 hover:border-accent" onClick={() => (done ? restart(seed + 1) : setPlaying((p) => !p))}>
          {done ? "↻ New battle" : playing ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button className="chip !py-1 hover:border-accent" disabled={done} onClick={() => setStep(battle.events.length)}>⏭ Skip to end</button>
        <span className="ml-2 text-xs text-muted">Speed</span>
        {SPEEDS.map((x) => (
          <button key={x} onClick={() => setSpeed(x)} className={`chip !px-2 !py-0.5 !text-xs ${speed === x ? "border-accent bg-accent text-accent-ink" : "hover:border-accent"}`}>{x}×</button>
        ))}
        <span className="ml-auto font-mono text-[11px] text-muted">battle #{seed} · {Math.min(step, battle.events.length)}/{battle.events.length}</span>
      </div>
      <ol ref={logRef} className="max-h-40 overflow-y-auto border-t border-line px-3 py-2 font-mono text-[11px] leading-5">
        {battle.events.slice(0, step).map((e, i) => (
          <li key={i} className={e.kind === "ko" ? "text-red-400" : e.kind === "heal" || e.kind === "regen" || e.kind === "revive" ? "text-emerald-400" : e.kind === "skill" ? "text-gold" : e.from.startsWith("1") ? "text-muted" : ""}>
            {e.text}
          </li>
        ))}
        {step === 0 && <li className="text-muted">The battle begins…</li>}
      </ol>
    </div>
  );
}
