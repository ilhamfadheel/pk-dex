import type { Metadata } from "next";
import ShopUnits from "@/components/ShopUnits";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "All Units – Stats, Filters & Shop Units",
  description:
    "Every Pocket Kingdom: Own the World unit: all 115 with HP, ATK, DEF, AGI and more, sortable and filterable by race, rank, movement, ability and the materials needed to rank up, plus the units each shop sells.",
  path: "/units",
});
import UnitDex from "@/components/UnitDex";
import { data } from "@/lib/data";

// Static JSON imported at module scope → fully prerendered.
const materials = Object.values(data.materials).sort((a, b) => a.order - b.order); // game order

export default function UnitsPage() {
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
