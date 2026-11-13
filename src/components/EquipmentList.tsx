"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { EquipRow } from "@/lib/data";
import type { MaterialLite } from "@/lib/types";
import { MatChip } from "./ui";

const CATS = ["Weapons", "Armor", "Accessories"] as const;
type Sort = "default" | "stat" | "tier" | "name";

export default function EquipmentList({
  rows,
  materials,
  icons,
}: {
  rows: EquipRow[];
  materials: Record<string, MaterialLite>;
  icons: Record<string, string | null>;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [type, setType] = useState("");
  const [kind, setKind] = useState<"" | "base" | "crafted">("");
  const [sort, setSort] = useState<Sort>("default");
  const [flash, setFlash] = useState("");
  const dq = useDeferredValue(q);

  // #item in the URL (from search): show that row, scroll to it, highlight it
  useEffect(() => {
    const show = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id || !rows.some((r) => r.slug === id)) return;
      setQ(""); setCat(""); setType(""); setKind("");
      setFlash(id);
      requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "center", behavior: "smooth" })));
      window.setTimeout(() => setFlash((f) => (f === id ? "" : f)), 2500);
    };
    show();
    window.addEventListener("hashchange", show);
    return () => window.removeEventListener("hashchange", show);
  }, [rows]);

  const types = useMemo(() => [...new Set(rows.filter((r) => !cat || r.category === cat).map((r) => r.type))], [rows, cat]);
  const shown = useMemo(() => {
    const ql = dq.trim().toLowerCase();
    const out = rows.filter(
      (r) =>
        (!cat || r.category === cat) &&
        (!type || r.type === type) &&
        (!kind || (kind === "crafted" ? r.crafted : !r.crafted)) &&
        (!ql || `${r.name} ${r.type} ${r.effect} ${r.ore ?? ""}`.toLowerCase().includes(ql)),
    );
    const stat = (r: EquipRow) => r.atk || r.def;
    if (sort === "stat") out.sort((a, b) => stat(b) - stat(a) || b.tier - a.tier);
    if (sort === "tier") out.sort((a, b) => b.tier - a.tier || stat(b) - stat(a));
    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [rows, dq, cat, type, kind, sort]);

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {["", ...CATS].map((c) => (
          <button
            key={c || "all"}
            onClick={() => { setCat(c); setType(""); }}
            className={`chip !px-3 !py-1 !text-sm ${cat === c ? "border-accent bg-accent text-accent-ink" : "hover:border-accent"}`}
          >
            {c && icons[c] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={icons[c]!} alt="" width={18} height={18} className="pixel" />
            )}
            {c || "All"}
            <span className="font-mono text-xs opacity-70">{rows.filter((r) => !c || r.category === c).length}</span>
          </button>
        ))}
      </div>
      <div className="card mb-3 flex flex-wrap gap-2 p-3">
        <input className="ctl min-w-56 flex-1" placeholder="Search item, ore or effect…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="ctl" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
          <option value="">Any type</option>
          {types.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className="ctl" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Kind">
          <option value="">Base and crafted</option>
          <option value="base">Base (ore) items</option>
          <option value="crafted">Named crafted items</option>
        </select>
        <select className="ctl" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
          <option value="default">Sort: game order</option>
          <option value="stat">Sort: ATK / DEF bonus</option>
          <option value="tier">Sort: tier</option>
          <option value="name">Sort: name</option>
        </select>
      </div>
      <p className="mb-2 text-sm text-muted">{shown.length} of {rows.length} items</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-panel-2">
            <tr>
              <th className="th">Item</th>
              <th className="th">Type</th>
              <th className="th text-right">Tier</th>
              <th className="th text-right">Bonus</th>
              <th className="th text-right">Value</th>
              <th className="th">Effect</th>
              <th className="th">How to make</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.slug}
                id={r.slug}
                className={`scroll-mt-20 border-b border-line/60 transition-colors duration-700 last:border-0 hover:bg-panel-2/60 ${flash === r.slug ? "bg-accent/20" : ""}`}
              >
                <td className="td">
                  <div className="flex items-center gap-2 font-medium">
                    {icons[r.category] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={icons[r.category]!} alt="" width={20} height={20} className="pixel" />
                    )}
                    <span className="whitespace-nowrap">{r.name}</span>
                    {r.crafted && <span className="chip !py-0 !text-[10px] text-gold">named</span>}
                  </div>
                </td>
                <td className="td whitespace-nowrap text-muted">{r.type}</td>
                <td className="td text-right font-mono">{r.tier}</td>
                <td className="td whitespace-nowrap text-right font-mono font-semibold">
                  {r.atk ? `ATK +${r.atk}` : r.def ? `DEF +${r.def}` : <span className="font-normal text-muted">—</span>}
                </td>
                <td className="td whitespace-nowrap text-right font-mono text-muted">{r.value} G</td>
                <td className="td">
                  {r.effect ? (
                    <>
                      <div>{r.effect}</div>
                      {r.effectInfo && <div className="max-w-xs text-xs text-muted">{r.effectInfo}</div>}
                    </>
                  ) : (
                    <span className="text-xs text-muted">{r.category === "Accessories" ? "—" : "From the jewels used"}</span>
                  )}
                </td>
                <td className="td">
                  {r.recipe ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="chip">{r.recipe.mold} Mold</span>
                      <MatChip name={r.recipe.ore} m={materials[r.recipe.ore]} />
                      {r.recipe.items.map((n, i) =>
                        n ? <MatChip key={i} name={n} m={materials[n]} /> : <span key={i} className="chip text-muted">Any jewel</span>,
                      )}
                      <Link href={`/crafting#${r.slug}`} className="text-xs text-muted underline hover:text-accent">{r.recipe.success}%</Link>
                    </div>
                  ) : r.ore ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="chip">{r.category === "Accessories" ? "Accessories" : r.type} Mold</span>
                      <MatChip name={r.ore} m={materials[r.ore]} />
                      <span className="text-xs text-muted">+ 2 materials</span>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
