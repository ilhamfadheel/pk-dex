import Link from "next/link";
import type { UnitLite } from "@/lib/types";
import { IMG, NODE_W, layoutTree, roundedPath, COL_W } from "@/lib/treeLayout";
import { UnitImg } from "./ui";

/**
 * Evolution family as lanes: each chain of rank-ups stays on one row, a branch
 * opens a new row, and right-angled lines (routed through empty space only) join
 * every unit to what it ranks up into. Columns are ranks.
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
  const t = layoutTree(family, current, byId);
  const unit = new Map(family.map((u) => [u.id, u]));
  const onPath = (a: number, b: number) =>
    (t.ancestorsOfCurrent.has(a) || a === current) && (t.ancestorsOfCurrent.has(b) || b === current);
  // draw highlighted lines last so they sit on top
  const edges = [...t.edges].sort((x, y) => Number(onPath(x.from, x.to)) - Number(onPath(y.from, y.to)));

  return (
    <div className="card overflow-x-auto p-4">
      <div className="relative" style={{ width: t.width, height: t.height }}>
        {t.ranks.map((r, i) => (
          <span key={r} className="absolute top-0 text-center font-mono text-[10px] text-muted" style={{ left: i * COL_W, width: COL_W }}>
            Rank {r}
          </span>
        ))}
        <svg className="pointer-events-none absolute inset-0" width={t.width} height={t.height} aria-hidden>
          {edges.map((e) => {
            const hot = onPath(e.from, e.to);
            const [ex, ey] = e.points[e.points.length - 1];
            return (
              <g key={`${e.from}-${e.to}`}>
                <path
                  d={roundedPath(e.points)}
                  fill="none"
                  stroke={hot ? "var(--accent)" : "var(--muted)"}
                  strokeOpacity={hot ? 1 : 0.55}
                  strokeWidth={hot ? 2.5 : 1.75}
                />
                {/* arrowhead into the unit it ranks up into */}
                <path d={`M${ex - 6},${ey - 4} L${ex},${ey} L${ex - 6},${ey + 4}`} fill="none" stroke={hot ? "var(--accent)" : "var(--muted)"} strokeWidth={hot ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          })}
        </svg>
        {t.nodes.map((n) => {
          const u = unit.get(n.id)!;
          return (
            <Link
              key={u.id}
              href={`/unit/${u.slug}`}
              className={`absolute flex flex-col items-center gap-1 rounded-lg p-1.5 text-center text-xs ${u.id === current ? "bg-accent/15 ring-1 ring-accent" : "bg-panel hover:bg-panel-2"}`}
              style={{ left: n.x, top: n.y, width: NODE_W }}
            >
              <UnitImg u={u} size={IMG} />
              <span className="leading-tight">{u.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
