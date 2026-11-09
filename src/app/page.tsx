import ShopUnits from "@/components/ShopUnits";
import UnitDex from "@/components/UnitDex";
import { data } from "@/lib/data";

// Static JSON imported at module scope → fully prerendered.
const materials = Object.values(data.materials).sort(
  (a, b) => a.category.localeCompare(b.category) || a.rarity - b.rarity,
);

export default function Home() {
  return (
    <>
      <ShopUnits />
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Unit Dex</h1>
        <p className="text-sm text-muted">
          All {data.units.length} units with base stats. Filter by the materials needed to evolve into a
          unit, or open one to see its full rank-up path and total material cost.
        </p>
      </div>
      <UnitDex units={data.units} materials={materials} />
    </>
  );
}
