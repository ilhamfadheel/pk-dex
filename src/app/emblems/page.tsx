import Link from "next/link";
import type { Metadata } from "next";
import { MatChip, MatIcon, UnitImg } from "@/components/ui";
import { data, edgesByEmblem, unitById } from "@/lib/data";
import { RANKUP_MOLD } from "@/lib/plan";

export const metadata: Metadata = { title: "Emblems" };

export default function EmblemsPage() {
  const list = Object.entries(data.emblems);
  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Emblems</h1>
        <p className="text-sm text-muted">
          Combine an ore, a jewel and an item in the Lab (plus one {RANKUP_MOLD}, sold in Shops from map 2).
          Emblems are consumed when you rank up a unit. {list.length} emblems, {list.reduce((s, [, r]) => s + r.length, 0)} recipes.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map(([name, recipes]) => {
          const uses = edgesByEmblem(name);
          return (
            <section key={name} id={name} className="card scroll-mt-20 p-4">
              <div className="mb-2 flex items-center gap-2">
                <MatIcon m={data.materials[RANKUP_MOLD]} size={24} />
                <h2 className="font-semibold text-gold">{name}</h2>
                <span className="ml-auto text-xs text-muted">{recipes[0].success}% success</span>
              </div>
              <table className="w-full text-sm">
                <thead><tr><th className="th">Ore</th><th className="th">Jewel</th><th className="th">Item</th></tr></thead>
                <tbody>
                  {recipes.map((r, i) => (
                    <tr key={i} className="border-t border-line/60">
                      {[r.ore, r.item1, r.item2].map((n) => (
                        <td key={n} className="td"><MatChip name={n} m={data.materials[n]} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 border-t border-line pt-2">
                <div className="mb-1 text-xs text-muted">Used for {uses.length} rank-up{uses.length === 1 ? "" : "s"}</div>
                <div className="flex flex-wrap gap-1.5">
                  {uses.map((e, i) => {
                    const a = unitById.get(e.from)!, b = unitById.get(e.to)!;
                    return (
                      <Link key={i} href={`/planner?from=${a.slug}&to=${b.slug}`} className="chip hover:border-accent">
                        <UnitImg u={a} size={16} /> {a.name} → <UnitImg u={b} size={16} /> {b.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
