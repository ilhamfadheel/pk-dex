import Link from "next/link";
import type { UnitLite } from "@/lib/types";
import { UnitImg } from "./ui";

const COL_W = 124; // px per rank column
const ROW_H = 92; // px per lane
const IMG = 40;
const TOP = 22; // room for the rank labels

/**
 * Lays an evolution family out as lanes: each chain of rank-ups stays on one row,
 * a branch (one unit → several) opens a new row below, and lines join every unit
 * to what it ranks up into. Columns are ranks, so units of the same rank align.
 */
export default function EvolutionTree({
  family,
  current,
  byId,
}: {
  family: UnitLite[];
  current: number;
  byId: Map<number, UnitLite>;
}) {
  const inFam = new Set(family.map((u) => u.id));
  const ranks = [...new Set(family.map((u) => u.rank))].sort((a, b) => a - b);
  const col = new Map(ranks.map((r, i) => [r, i]));

  // Roots first (units with no parent inside this family), the current unit's
  // ancestors' roots before others so its own line sits near the top.
  const parents = (u: UnitLite) => u.prev.filter((p) => inFam.has(p));
  const children = (u: UnitLite) => u.next.filter((c) => inFam.has(c)).map((c) => byId.get(c)!);
  const ancestorsOfCurrent = new Set<number>();
  const st = [current];
  while (st.length) for (const p of byId.get(st.pop()!)!.prev) if (!ancestorsOfCurrent.has(p)) { ancestorsOfCurrent.add(p); st.push(p); }
  const roots = family
    .filter((u) => parents(u).length === 0)
    .sort((a, b) => Number(ancestorsOfCurrent.has(b.id)) - Number(ancestorsOfCurrent.has(a.id)) || a.id - b.id);

  const lane = new Map<number, number>();
  let lanes = 0;
  const place = (u: UnitLite, l: number) => {
    if (lane.has(u.id)) return;
    lane.set(u.id, l);
    const kids = children(u).sort((a, b) => a.rank - b.rank || a.id - b.id);
    kids.forEach((k, i) => place(k, i === 0 && !lane.has(k.id) ? l : lanes++));
  };
  for (const r of roots) place(r, lanes++);
  // compact: drop lanes that ended up empty (children already placed elsewhere)
  const used = [...new Set(lane.values())].sort((a, b) => a - b);
  const remap = new Map(used.map((l, i) => [l, i]));
  for (const [id, l] of lane) lane.set(id, remap.get(l)!);

  const W = ranks.length * COL_W, H = TOP + used.length * ROW_H;
  const cx = (u: UnitLite) => col.get(u.rank)! * COL_W + COL_W / 2;
  const cy = (u: UnitLite) => TOP + lane.get(u.id)! * ROW_H + 8 + IMG / 2;
  const edges = family.flatMap((u) => children(u).map((c) => [u, c] as const));
  const onPath = (a: UnitLite, b: UnitLite) =>
    (ancestorsOfCurrent.has(a.id) || a.id === current) && (ancestorsOfCurrent.has(b.id) || b.id === current);

  return (
    <div className="card overflow-x-auto p-4">
      <div className="relative" style={{ width: W, height: H }}>
        {ranks.map((r) => (
          <span key={r} className="absolute top-0 text-center font-mono text-[10px] text-muted" style={{ left: col.get(r)! * COL_W, width: COL_W }}>
            Rank {r}
          </span>
        ))}
        <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden>
          {edges.map(([a, b]) => {
            const x1 = cx(a) + IMG / 2 + 2, y1 = cy(a), x2 = cx(b) - IMG / 2 - 2, y2 = cy(b);
            const mx = (x1 + x2) / 2;
            const hot = onPath(a, b);
            return (
              <g key={`${a.id}-${b.id}`}>
                <path
                  d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  fill="none"
                  stroke={hot ? "var(--accent)" : "var(--line)"}
                  strokeWidth={hot ? 2.5 : 2}
                />
                <circle cx={x2} cy={y2} r={2.5} fill={hot ? "var(--accent)" : "var(--muted)"} />
              </g>
            );
          })}
        </svg>
        {family.map((u) => (
          <Link
            key={u.id}
            href={`/unit/${u.slug}`}
            className={`absolute flex flex-col items-center gap-1 rounded-lg p-1.5 text-center text-xs ${u.id === current ? "bg-accent/15 ring-1 ring-accent" : "hover:bg-panel-2"}`}
            style={{ left: cx(u) - 46, top: TOP + lane.get(u.id)! * ROW_H, width: 92 }}
          >
            <UnitImg u={u} size={IMG} />
            <span className="leading-tight">{u.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
