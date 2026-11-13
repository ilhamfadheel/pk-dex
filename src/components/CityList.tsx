"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import type { MaterialLite } from "@/lib/types";
import { MatIcon } from "./ui";

export interface CityRow {
  name: string;
  slug: string;
  region: string;
  vp: number; // VP to enter
  vpNeeded: number; // VP to reach it from the start
  steps: number; // paths from the start
  order: number; // progression order
  units: { name: string; img: string }[];
  shop: string[]; // ores + jewels
  molds: string[];
  search: string[];
  dungeonNames: string[];
  dungeonRewards: string[];
}

export default function CityList({
  rows,
  materials,
  unitOrder,
}: {
  rows: CityRow[];
  materials: Record<string, MaterialLite>;
  unitOrder: Record<string, number>; // unit name -> game unit number
}) {
  const [q, setQ] = useState("");
  const [want, setWant] = useState(""); // a unit, mold or material name
  const [how, setHow] = useState<"any" | "shop" | "search" | "dungeon">("any");
  const [order, setOrder] = useState<"progression" | "name" | "region">("progression");
  const dq = useDeferredValue(q);

  const options = useMemo(() => {
    // in the game's own order: units by unit number, items as the game lists them
    const pos = (n: string) => materials[n]?.order ?? unitOrder[n] ?? 99999;
    const sorted = (xs: string[]) => [...new Set(xs)].sort((a, b) => pos(a) - pos(b) || a.localeCompare(b));
    return {
      units: sorted(rows.flatMap((r) => r.units.map((u) => u.name))),
      molds: sorted(rows.flatMap((r) => r.molds)),
      materials: sorted(rows.flatMap((r) => [...r.shop, ...r.search, ...r.dungeonRewards])),
    };
  }, [rows, materials, unitOrder]);
  const wantKind = options.units.includes(want) ? "unit" : options.molds.includes(want) ? "mold" : want ? "material" : "";

  const shown = useMemo(() => {
    const ql = dq.trim().toLowerCase();
    const sorted = [...rows].sort((a, b) =>
      order === "name" ? a.name.localeCompare(b.name)
        : order === "region" ? a.region.localeCompare(b.region) || a.order - b.order
        : a.order - b.order,
    );
    return sorted.filter((r) => {
      if (ql && !r.name.toLowerCase().includes(ql) && !r.dungeonNames.some((d) => d.toLowerCase().includes(ql))) return false;
      if (!want) return true;
      if (wantKind === "unit") return r.units.some((u) => u.name === want);
      if (wantKind === "mold") return r.molds.includes(want);
      const inShop = r.shop.includes(want), inSearch = r.search.includes(want), inDungeon = r.dungeonRewards.includes(want);
      return how === "shop" ? inShop : how === "search" ? inSearch : how === "dungeon" ? inDungeon : inShop || inSearch || inDungeon;
    });
  }, [rows, dq, want, wantKind, how, order]);

  return (
    <>
      <div className="card mb-3 flex flex-wrap gap-2 p-3">
        <input className="ctl min-w-48 flex-1" placeholder="Search city or dungeon…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="ctl" value={want} onChange={(e) => setWant(e.target.value)} aria-label="Where to get">
          <option value="">Where to get… (anything)</option>
          <optgroup label="Units">{options.units.map((m) => <option key={m}>{m}</option>)}</optgroup>
          <optgroup label="Molds">{options.molds.map((m) => <option key={m}>{m}</option>)}</optgroup>
          <optgroup label="Materials">{options.materials.map((m) => <option key={m}>{m}</option>)}</optgroup>
        </select>
        <select className="ctl" value={order} onChange={(e) => setOrder(e.target.value as typeof order)} aria-label="Order">
          <option value="progression">Order: progression (VP)</option>
          <option value="region">Order: by region</option>
          <option value="name">Order: A–Z</option>
        </select>
        {wantKind === "material" && (
          <select className="ctl" value={how} onChange={(e) => setHow(e.target.value as typeof how)} aria-label="How">
            <option value="any">Shop, search or dungeon</option>
            <option value="shop">Sold in the shop</option>
            <option value="search">Found by area search</option>
            <option value="dungeon">Dungeon reward</option>
          </select>
        )}
      </div>
      <p className="mb-2 text-sm text-muted">{shown.length} of {rows.length} locations{want ? ` with ${want}` : ""}</p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((r) => (
          <li key={r.slug}>
            <Link href={`/cities/${r.slug}`} className="card flex h-full flex-col gap-2.5 p-4 hover:border-accent">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">{r.name}</h2>
                <span className="chip !py-0.5 font-mono text-gold">{r.vp} VP</span>
              </div>
              <div className="-mt-1.5 text-xs text-muted">
                {r.region} · {r.steps === 0 ? "starting city" : `${r.steps} path${r.steps === 1 ? "" : "s"} from the start, ${r.vpNeeded} VP to reach`} ·{" "}
                {r.dungeonNames.length} dungeon{r.dungeonNames.length === 1 ? "" : "s"}
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Units for sale</div>
                <div className="flex flex-wrap gap-1">
                  {r.units.map((u) => (
                    <span key={u.name} className={`chip ${u.name === want ? "border-accent" : ""}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u.img} alt="" width={16} height={16} className="pixel h-4 w-4 object-contain" /> {u.name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Items for sale</div>
                <div className="flex flex-wrap gap-1">
                  {r.shop.map((m) => (
                    <span key={m} className={`chip ${m === want ? "border-accent" : ""}`}>
                      <MatIcon m={materials[m]} size={14} /> {m}
                    </span>
                  ))}
                  {r.molds.map((m) => (
                    <span key={m} className={`chip ${m === want ? "border-accent" : ""}`}>{m}</span>
                  ))}
                </div>
              </div>
              <div className="mt-auto text-xs text-muted">
                Area search: {r.search.length} materials · Dungeon rewards: {r.dungeonRewards.length}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
