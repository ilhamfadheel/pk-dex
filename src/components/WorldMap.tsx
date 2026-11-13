import Link from "next/link";
import { areas, areaByCity, START } from "@/lib/world";

const REGION_TINT: Record<string, string> = {
  Northwest: "#7a5cff", North: "#3fa36b", Northeast: "#4f8fe6", West: "#c46ad8", Central: "#d9a441",
  East: "#5bb5a8", Southwest: "#d07a3c", South: "#c95a5a", Southeast: "#3f9fc9",
};

/**
 * The world map drawn from the game's own coordinates: every area, the paths between
 * them, and optionally a highlighted route and current area. Areas link to their pages.
 */
export default function WorldMap({
  slugOf,
  current,
  route = [],
  compact = false,
}: {
  slugOf: (city: string) => string;
  current?: string;
  route?: string[];
  compact?: boolean;
}) {
  const xs = areas.map((a) => a.x), ys = areas.map((a) => a.y);
  const pad = 40;
  const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - minX + pad, h = Math.max(...ys) - minY + pad;
  const onRoute = new Set(route.slice(1).map((c, i) => [route[i], c].sort().join("|")));
  const routeSet = new Set(route);
  const edges = areas.flatMap((a) => a.links.filter((b) => a.city < b).map((b) => [a, areaByCity.get(b)!] as const));

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`${minX} ${minY} ${w} ${h}`}
        className="mx-auto block h-auto w-full"
        style={{ maxWidth: compact ? 520 : 760, minWidth: 320 }}
        role="img"
        aria-label="World map of Ulgress with paths between areas"
      >
        {edges.map(([a, b]) => {
          const hot = onRoute.has([a.city, b.city].sort().join("|"));
          return (
            <line
              key={`${a.city}-${b.city}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={hot ? "var(--accent)" : "var(--muted)"}
              strokeOpacity={hot ? 1 : 0.45}
              strokeWidth={hot ? 4 : 2}
              strokeLinecap="round"
            />
          );
        })}
        {areas.map((a) => {
          const isCur = a.city === current, isStart = a.city === START, inRoute = routeSet.has(a.city);
          const r = isCur ? 11 : 7;
          return (
            <Link key={a.city} href={`/cities/${slugOf(a.city)}`}>
              <g className="cursor-pointer">
                <title>{`${a.city} – ${a.region}, ${a.vp} VP to enter`}</title>
                <circle
                  cx={a.x} cy={a.y} r={r}
                  fill={isCur ? "var(--accent)" : REGION_TINT[a.region]}
                  stroke={inRoute || isStart ? "var(--ink)" : "var(--panel)"}
                  strokeWidth={inRoute || isStart ? 2.5 : 1.5}
                />
                {(!compact || isCur || inRoute) && (
                  <text
                    x={a.x} y={a.y - r - 4}
                    textAnchor="middle"
                    fontSize={isCur ? 15 : 12}
                    fontWeight={isCur ? 700 : 500}
                    fill="var(--ink)"
                    stroke="var(--bg)" strokeWidth={3} paintOrder="stroke"
                  >
                    {a.city}
                  </text>
                )}
                <text x={a.x} y={a.y + r + 13} textAnchor="middle" fontSize={10} fill="var(--muted)" stroke="var(--bg)" strokeWidth={3} paintOrder="stroke">
                  {a.vp} VP
                </text>
              </g>
            </Link>
          );
        })}
      </svg>
    </div>
  );
}
