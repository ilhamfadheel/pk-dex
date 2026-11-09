import Link from "next/link";
import type { MaterialLite, Recipe, UnitLite } from "@/lib/types";
import { RANKUP_MOLD } from "@/lib/plan";

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

/**
 * All the ways to make an emblem. Slots that never change (ore, item) show once;
 * slots with alternatives (usually the jewel) show as an "any one of" group.
 * With `onSelect`, alternatives are clickable and `selected` recipe is highlighted.
 */
export function RecipeOptions({
  recipes,
  materials,
  selected,
  onSelect,
}: {
  recipes: Recipe[];
  materials: Record<string, MaterialLite>;
  selected?: number;
  onSelect?: (i: number) => void;
}) {
  if (!recipes.length) return null;
  const slots = (["ore", "item1", "item2"] as const).map((k) => [...new Set(recipes.map((r) => r[k]))]);
  const grid = slots.reduce((n, s) => n * s.length, 1) === recipes.length;
  const success = [...new Set(recipes.map((r) => r.success))];
  const mold = materials[RANKUP_MOLD];

  if (!grid) {
    // Alternatives aren't a clean "pick one per slot" grid: list every recipe.
    return (
      <ul className="space-y-1">
        {recipes.map((r, i) => (
          <li key={i} className="flex flex-wrap items-center gap-1">
            <span className="w-5 font-mono text-[10px] text-muted">{i + 1}.</span>
            {[r.ore, r.item1, r.item2].map((n) => <MatChip key={n} name={n} m={materials[n]} />)}
            <MatChip name={RANKUP_MOLD} m={mold} />
            <span className="text-muted">({r.success}%)</span>
          </li>
        ))}
      </ul>
    );
  }

  const keys = ["ore", "item1", "item2"] as const;
  const cur = selected != null ? recipes[selected] : undefined;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {slots.map((opts, si) => (
        <span key={si} className="contents">
          {si > 0 && <span className="text-muted">+</span>}
          {opts.length === 1 ? (
            <MatChip name={opts[0]} m={materials[opts[0]]} />
          ) : (
            <span className="inline-flex flex-wrap items-center gap-1 rounded-full border border-dashed border-gold/60 px-1.5 py-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gold">any 1 of</span>
              {opts.map((n) => {
                const isSel = cur?.[keys[si]] === n;
                if (!onSelect) return <MatChip key={n} name={n} m={materials[n]} />;
                return (
                  <button
                    key={n}
                    title={`Use ${n}`}
                    onClick={() => {
                      const want = { ...(cur ?? recipes[0]), [keys[si]]: n };
                      const idx = recipes.findIndex((r) => keys.every((k) => r[k] === want[k]));
                      if (idx >= 0) onSelect(idx);
                    }}
                    className={`chip ${isSel ? "border-accent bg-accent text-accent-ink" : "hover:border-accent"}`}
                  >
                    <MatIcon m={materials[n]} size={18} />
                    {n}
                  </button>
                );
              })}
            </span>
          )}
        </span>
      ))}
      <span className="text-muted">+</span>
      <MatChip name={RANKUP_MOLD} m={mold} />
      <span className="text-xs text-muted">{success.join("/")}% success</span>
    </div>
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
