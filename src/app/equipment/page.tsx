import type { Metadata } from "next";
import EquipmentList from "@/components/EquipmentList";
import { data, equipment, iconFor } from "@/lib/data";
import { pageMeta } from "@/lib/seo";

const weapons = equipment.filter((e) => e.category === "Weapons").length;
const armor = equipment.filter((e) => e.category === "Armor").length;
const acc = equipment.filter((e) => e.category === "Accessories").length;

export const metadata: Metadata = pageMeta({
  title: "Equipment – Weapons, Armor & Accessories Stats",
  description: `All ${equipment.length} Pocket Kingdom: Own the World items: ${weapons} weapons, ${armor} armors and ${acc} accessories with ATK/DEF bonus, tier, value, effect and how to craft each one.`,
  path: "/equipment",
});

const icons = { Weapons: iconFor("Weapons"), Armor: iconFor("Armor"), Accessories: iconFor("Accessories") };

export default function EquipmentPage() {
  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Equipment</h1>
        <p className="text-sm text-muted">
          Every weapon, armor and accessory in the game ({weapons} / {armor} / {acc}), read from the game&apos;s own item
          tables. Base items come from a mold and an ore; the materials you add decide their element and effect. Named
          items have fixed recipes and effects.
        </p>
      </div>
      <EquipmentList rows={equipment} materials={data.materials} icons={icons} />
    </>
  );
}
