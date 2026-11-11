"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import type { MaterialLite } from "@/lib/types";
import { MatIcon } from "./ui";

export interface CityRow {
  name: string;
  slug: string;
  shop: string[];
  search: string[];
  dungeonNames: string[];
  dungeonRewards: string[];
}

export default function CityList({ rows, materials }: { rows: CityRow[]; materials: Record<string, MaterialLite> }) {
  const [q, setQ] = useState("");
  const [mat, setMat] = useState("");
  const [how, setHow] = useState<"any" | "shop" | "search" | "dungeon">("any");
  const dq = useDeferredValue(q);

  const matOptions = useMemo(
    () => [...new Set(rows.flatMap((r) => [...r.shop, ...r.search, ...r.dungeonRewards]))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const shown = useMemo(() => {
    const ql = dq.trim().toLowerCase();
    return rows.filter((r) => {
      if (ql && !r.name.toLowerCase().includes(ql) && !r.dungeonNames.some((d) => d.toLowerCase().includes(ql))) return false;
      if (!mat) return true;
      const inShop = r.shop.includes(mat), inSearch = r.search.includes(mat), inDungeon = r.dungeonRewards.includes(mat);
      return how === "shop" ? inShop : how === "search" ? inSearch : how === "dungeon" ? inDungeon : inShop || inSearch || inDungeon;
    });
  }, [rows, dq, mat, how]);

  return (
    <>
      <div className="card mb-3 flex flex-wrap gap-2 p-3">
        <input className="ctl min-w-48 flex-1" placeholder="Search city or dungeon…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="ctl" value={mat} onChange={(e) => setMat(e.target.value)} aria-label="Material">
          <option value="">Where to get… (any material)</option>
          {matOptions.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select className="ctl" value={how} onChange={(e) => setHow(e.target.value as typeof how)} aria-label="How" disabled={!mat}>
          <option value="any">Shop, search or dungeon</option>
          <option value="shop">Sold in the shop</option>
          <option value="search">Found by area search</option>
          <option value="dungeon">Dungeon reward</option>
        </select>
      </div>
      <p className="mb-2 text-sm text-muted">{shown.length} of {rows.length} locations{mat ? ` with ${mat}` : ""}</p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((r) => (
          <li key={r.slug}>
            <Link href={`/cities/${r.slug}`} className="card flex h-full flex-col gap-2 p-4 hover:border-accent">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">{r.name}</h2>
                <span className="text-xs text-muted">{r.dungeonNames.length} dungeon{r.dungeonNames.length === 1 ? "" : "s"}</span>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Shop sells ({r.shop.length})</div>
                <div className="flex flex-wrap gap-1">
                  {r.shop.length ? r.shop.map((m) => (
                    <span key={m} className={`chip ${m === mat ? "border-accent" : ""}`} title={m}>
                      <MatIcon m={materials[m]} size={14} /> {m}
                    </span>
                  )) : <span className="text-xs text-muted">No material shop recorded</span>}
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
