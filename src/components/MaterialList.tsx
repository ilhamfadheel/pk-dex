"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MaterialLite } from "@/lib/types";
import { MatIcon, elementOf } from "./ui";

export interface MaterialRow extends MaterialLite {
  shops: string[];
  emblems: string[];
  crafts: number;
  units: number;
}

export default function MaterialList({ rows }: { rows: MaterialRow[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [use, setUse] = useState<"" | "emblem" | "craft" | "shop">("");
  const [el, setEl] = useState("");
  const cats = [...new Set(rows.map((r) => r.category))];
  const els = [...new Set(rows.map((r) => elementOf(r.effect)).filter(Boolean))] as string[];

  const shown = useMemo(() => {
    const ql = q.toLowerCase();
    return rows.filter(
      (r) =>
        (!ql || r.name.toLowerCase().includes(ql) || r.effect.toLowerCase().includes(ql)) &&
        (!cat || r.category === cat) &&
        (!el || elementOf(r.effect) === el) &&
        (!use || (use === "emblem" ? r.emblems.length > 0 : use === "craft" ? r.crafts > 0 : r.shops.length > 0)),
    );
  }, [rows, q, cat, el, use]);

  return (
    <>
      <div className="card mb-3 flex flex-wrap gap-2 p-3">
        <input className="ctl min-w-56 flex-1" placeholder="Search material or effect…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="ctl" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="ctl" value={el} onChange={(e) => setEl(e.target.value)} aria-label="Element">
          <option value="">Any element</option>
          {els.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="ctl" value={use} onChange={(e) => setUse(e.target.value as typeof use)} aria-label="Use">
          <option value="">Any use</option>
          <option value="emblem">Used in emblems (rank-up)</option>
          <option value="craft">Used in crafting</option>
          <option value="shop">Buyable in a shop</option>
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-panel-2">
            <tr>
              <th className="th">Material</th><th className="th">Category</th><th className="th">Rarity</th>
              <th className="th">Effect</th><th className="th">Emblems</th><th className="th">Units it unlocks</th><th className="th">Shops</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.name} className="border-b border-line/60 last:border-0 hover:bg-panel-2/60">
                <td className="td">
                  <Link href={`/materials/${r.slug}`} className="flex items-center gap-2 font-medium hover:text-accent">
                    <MatIcon m={r} size={24} /> {r.name}
                  </Link>
                </td>
                <td className="td text-muted">{r.category}</td>
                <td className="td font-mono text-gold">{"★".repeat(Math.min(r.rarity, 10))}</td>
                <td className="td text-muted">{r.effect || "—"}</td>
                <td className="td font-mono">{r.emblems.length || "—"}</td>
                <td className="td font-mono">{r.units || "—"}</td>
                <td className="td max-w-64 truncate text-xs text-muted" title={r.shops.join(", ")}>{r.shops.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
