import type { Metadata } from "next";
import CraftingList from "@/components/CraftingList";
import { craftRows, data, iconFor } from "@/lib/data";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Crafting Recipes – Weapons, Armor & Accessories",
  description: `All ${craftRows.length} Pocket Kingdom: Own the World crafting recipes: the mold, ore and materials for every weapon, armor and accessory, what each effect does in battle, and success rates.`,
  path: "/crafting",
});

const typeIcons = { Weapons: iconFor("Weapons"), Armor: iconFor("Armor"), Accessories: iconFor("Accessories") };

export default function CraftingPage() {
  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Weapons, Armor &amp; Accessories</h1>
        <p className="text-sm text-muted">
          Every crafting recipe ({craftRows.length}): combine a mold, an ore and two materials in the Lab. The
          success column is the chance per attempt, so low rates can take several tries.
        </p>
      </div>
      <CraftingList rows={craftRows} materials={data.materials} typeIcons={typeIcons} />
      <p className="mt-3 text-xs text-muted">
        Chart from a community guide (Apihplays); effect details from the Pocket Kingdom Compendium.
      </p>
    </>
  );
}
