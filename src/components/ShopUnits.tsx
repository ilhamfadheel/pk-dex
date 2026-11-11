import Link from "next/link";
import { citySlug, data, unitById, unitSoldIn } from "@/lib/data";
import { STATS, type UnitLite } from "@/lib/types";
import { UnitImg } from "./ui";

/** Everything a unit can eventually become (its whole evolution tree below it). */
function descendants(u: UnitLite) {
  const seen = new Set<number>();
  const stack = [...u.next];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...unitById.get(id)!.next);
  }
  return [...seen].map((id) => unitById.get(id)!);
}

export default function ShopUnits() {
  // every unit some city's shop sells (from the game's unitshop table), most widely sold first
  const units = data.units
    .filter((u) => unitSoldIn.has(u.name))
    .sort((a, b) => unitSoldIn.get(b.name)!.length - unitSoldIn.get(a.name)!.length || a.id - b.id);

  return (
    <section className="mb-8">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-lg font-bold tracking-tight">Buy from the Shop</h2>
        <span className="text-sm text-muted">
          {units.length} starting units. Every other unit is reached by ranking one of these up.
        </span>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-panel-2">
            <tr>
              <th className="th">Unit</th>
              <th className="th">Race</th>
              <th className="th">Move</th>
              <th className="th">Slots</th>
              {STATS.map((s) => (
                <th key={s} className="th text-right">{s === "hit" ? "Hit%" : s.toUpperCase()}</th>
              ))}
              <th className="th">Ranks up into</th>
              <th className="th">Can become</th>
              <th className="th">Sold in</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const all = descendants(u);
              const finals = all.filter((d) => d.next.length === 0);
              return (
                <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-panel-2/60">
                  <td className="td">
                    <Link href={`/unit/${u.slug}`} className="flex items-center gap-2 font-medium hover:text-accent">
                      <UnitImg u={u} size={36} />
                      <span className="whitespace-nowrap">{u.name}</span>
                    </Link>
                  </td>
                  <td className="td whitespace-nowrap text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      {u.raceImg && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.raceImg} alt="" width={16} height={16} className="pixel" />
                      )}
                      {u.race}
                    </span>
                  </td>
                  <td className="td text-muted">{u.move}</td>
                  <td className="td font-mono">{u.slots}</td>
                  {STATS.map((s) => (
                    <td key={s} className="td text-right font-mono tabular-nums">{u[s]}</td>
                  ))}
                  <td className="td">
                    <div className="flex gap-1">
                      {u.next.map((id) => {
                        const n = unitById.get(id)!;
                        return (
                          <Link key={id} href={`/unit/${n.slug}`} title={n.name}>
                            <UnitImg u={n} size={26} />
                          </Link>
                        );
                      })}
                    </div>
                  </td>
                  <td className="td whitespace-nowrap">
                    <Link
                      href={`/unit/${u.slug}`}
                      className="text-xs text-muted hover:text-accent"
                      title={finals.map((f) => f.name).join(", ")}
                    >
                      <b className="font-mono text-ink">{all.length}</b> units · {finals.length} final
                    </Link>
                  </td>
                  <td className="td">
                    <details className="text-xs">
                      <summary className="cursor-pointer whitespace-nowrap text-muted hover:text-ink">
                        <b className="font-mono text-ink">{unitSoldIn.get(u.name)!.length}</b> cities
                      </summary>
                      <div className="mt-1 flex max-w-72 flex-wrap gap-1">
                        {unitSoldIn.get(u.name)!.map((c) => (
                          <Link key={c} href={`/cities/${citySlug(c)}`} className="chip hover:border-accent">{c}</Link>
                        ))}
                      </div>
                    </details>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
