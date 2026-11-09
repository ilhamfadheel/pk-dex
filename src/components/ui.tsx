import Link from "next/link";
import type { MaterialLite, UnitLite } from "@/lib/types";

const ELEMENT_COLOR: Record<string, string> = {
  Fire: "#d9534f",
  Water: "#3b82c4",
  Wood: "#4f9a4a",
  Metal: "#9a9a9a",
  Earth: "#a5773a",
};

export function elementOf(effect: string) {
  const m = /^Element:\s*(\w+)/.exec(effect);
  return m?.[1] ?? null;
}

export function MatIcon({ m, size = 24 }: { m?: MaterialLite; size?: number }) {
  const el = m ? elementOf(m.effect) : null;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {m?.img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.img} alt="" width={size} height={size} className="pixel" loading="lazy" />
      ) : (
        <span
          className="grid h-full w-full place-items-center rounded bg-panel-2 text-[10px] font-bold text-muted"
          aria-hidden
        >
          {m?.name.slice(0, 2) ?? "?"}
        </span>
      )}
      {el && (
        <span
          className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border border-panel"
          style={{ background: ELEMENT_COLOR[el] ?? "#888" }}
          title={el}
        />
      )}
    </span>
  );
}

export function MatChip({ m, name, count }: { m?: MaterialLite; name: string; count?: string | number }) {
  const inner = (
    <>
      <MatIcon m={m} size={18} />
      <span>{name}</span>
      {count != null && <span className="font-mono font-semibold text-accent">×{count}</span>}
    </>
  );
  return m && m.slug !== "rankup-mold" ? (
    <Link href={`/materials/${m.slug}`} className="chip hover:border-accent">
      {inner}
    </Link>
  ) : (
    <span className="chip">{inner}</span>
  );
}

export function UnitImg({ u, size = 48 }: { u: Pick<UnitLite, "img" | "name">; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={u.img}
      alt={u.name}
      width={size}
      height={size}
      loading="lazy"
      className="pixel shrink-0 rounded-md border border-line bg-panel-2 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

export function UnitLink({ u, size = 32 }: { u: UnitLite; size?: number }) {
  return (
    <Link href={`/unit/${u.slug}`} className="inline-flex items-center gap-2 hover:text-accent">
      <UnitImg u={u} size={size} />
      <span className="font-medium">{u.name}</span>
    </Link>
  );
}

export function RankStars({ rank }: { rank: number }) {
  return (
    <span className="font-mono text-xs text-gold" title={`Rank ${rank}`}>
      R{rank}
    </span>
  );
}
