"use client";

import { useEffect, useRef, useState } from "react";

export interface AnimData {
  cw: number;
  ch: number;
  n: number;
  anims: Partial<Record<AnimName, number[]>>;
  match: string;
}
type AnimName = "idle" | "walk" | "attack" | "defend" | "skill";

const ORDER: AnimName[] = ["idle", "walk", "attack", "defend", "skill"];
const LABEL: Record<AnimName, string> = { idle: "Idle", walk: "Walk", attack: "Attack", defend: "Defend", skill: "Skill" };
// one-shot animations return to idle; idle and walk loop
const LOOPS: Record<AnimName, boolean> = { idle: true, walk: true, attack: false, defend: false, skill: false };
const SPEED: Record<AnimName, number> = { idle: 220, walk: 140, attack: 120, defend: 360, skill: 150 };

/**
 * Plays a unit's battle sprite from its strip image. Idle loops by default; click
 * the sprite to attack, or pick an animation below it.
 */
export default function SpritePlayer({ src, data, name, skillName }: { src: string; data: AnimData; name: string; skillName?: string }) {
  const available = ORDER.filter((a) => data.anims[a]?.length);
  const [anim, setAnim] = useState<AnimName>("idle");
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const frames = data.anims[anim] ?? data.anims.idle ?? [0];
  // one-shots hold their last frame a little before returning to idle
  useEffect(() => {
    const loops = LOOPS[anim];
    const last = step >= frames.length - 1;
    timer.current = setTimeout(
      () => {
        if (last && !loops) { setAnim("idle"); setStep(0); }
        else setStep((s) => (s + 1) % frames.length);
      },
      last && !loops ? SPEED[anim] * 2 : SPEED[anim],
    );
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [anim, step, frames.length]);

  const play = (a: AnimName) => { setAnim(a); setStep(0); };
  const frame = frames[Math.min(step, frames.length - 1)];
  const scale = Math.max(1, Math.min(3, Math.floor(168 / Math.max(data.cw, data.ch))));

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => play(data.anims.attack ? "attack" : "idle")}
        title={`Click to make ${name} attack`}
        className="grid h-48 w-full place-items-end justify-center rounded-lg bg-[repeating-conic-gradient(var(--panel-2)_0_25%,var(--panel)_0_50%)] bg-[length:16px_16px] pb-3"
      >
        <span
          role="img"
          aria-label={`${name} ${LABEL[anim].toLowerCase()} animation`}
          className="pixel block"
          style={{
            width: data.cw * scale,
            height: data.ch * scale,
            backgroundImage: `url(${src})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${data.cw * data.n * scale}px ${data.ch * scale}px`,
            backgroundPosition: `${-frame * data.cw * scale}px 0`,
            imageRendering: "pixelated",
          }}
        />
      </button>
      <div className="flex flex-wrap justify-center gap-1">
        {available.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => play(a)}
            className={`chip !py-1 ${anim === a ? "border-accent bg-accent text-accent-ink" : "hover:border-accent"}`}
            title={a === "skill" && skillName ? skillName : undefined}
          >
            {LABEL[a]}
            {a === "skill" && skillName ? `: ${skillName}` : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
