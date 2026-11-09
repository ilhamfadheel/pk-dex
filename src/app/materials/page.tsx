import type { Metadata } from "next";
import MaterialList, { type MaterialRow } from "@/components/MaterialList";
import { craftsUsing, data, emblemsUsing, rawMaterials } from "@/lib/data";

export const metadata: Metadata = { title: "Materials" };

const order: Record<string, number> = { Ores: 0, Jewels: 1, "Other Materials": 2 };
const rows: MaterialRow[] = rawMaterials
  .map((m) => {
    const emblems = emblemsUsing(m.name);
    return {
      ...data.materials[m.name],
      shops: m.purchase_in,
      emblems,
      crafts: craftsUsing(m.name).length,
      units: data.units.filter((u) => u.needs.includes(m.name)).length,
    };
  })
  .sort((a, b) => (order[a.category] ?? 9) - (order[b.category] ?? 9) || a.rarity - b.rarity);

export default function MaterialsPage() {
  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Materials</h1>
        <p className="text-sm text-muted">
          {rows.length} ores, jewels and items: where to buy them, who drops them, and which emblems and units need them.
        </p>
      </div>
      <MaterialList rows={rows} />
    </>
  );
}
