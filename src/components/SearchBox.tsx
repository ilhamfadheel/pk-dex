"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchItem } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const STORE_KEY = `pkdex-search-${process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"}`;

// ---- caching layers ----
// 1) in-memory index shared across navigations, 2) localStorage copy so a
// returning visitor never refetches, 3) memoised results per query.
let indexCache: SearchItem[] | null = null;
let indexPromise: Promise<SearchItem[]> | null = null;
const resultCache = new Map<string, SearchItem[]>();

function loadIndex(): Promise<SearchItem[]> {
  if (indexCache) return Promise.resolve(indexCache);
  if (indexPromise) return indexPromise;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      indexCache = JSON.parse(raw) as SearchItem[];
      return Promise.resolve(indexCache);
    }
  } catch {}
  indexPromise = fetch(`${BASE}/search-index.json`)
    .then((r) => r.json())
    .then((d: { items: SearchItem[] }) => {
      indexCache = d.items;
      try {
        for (const k of Object.keys(localStorage)) if (k.startsWith("pkdex-search-")) localStorage.removeItem(k);
        localStorage.setItem(STORE_KEY, JSON.stringify(d.items));
      } catch {}
      return d.items;
    })
    .finally(() => {
      indexPromise = null;
    });
  return indexPromise;
}

function search(items: SearchItem[], q: string): SearchItem[] {
  const key = q.trim().toLowerCase();
  if (!key) return [];
  const hit = resultCache.get(key);
  if (hit) return hit;
  const words = key.split(/\s+/);
  const scored: { it: SearchItem; s: number }[] = [];
  for (const it of items) {
    if (!words.every((w) => it.k.includes(w))) continue;
    const name = it.n.toLowerCase();
    let s = name === key ? 0 : name.startsWith(key) ? 1 : name.includes(key) ? 2 : 3;
    s += it.t === "unit" ? 0 : it.t === "material" ? 0.1 : it.t === "item" ? 0.15 : 0.2;
    scored.push({ it, s });
  }
  const out = scored.sort((a, b) => a.s - b.s || a.it.n.localeCompare(b.it.n)).slice(0, 12).map((x) => x.it);
  if (resultCache.size > 200) resultCache.delete(resultCache.keys().next().value!);
  resultCache.set(key, out);
  return out;
}

const TYPE_LABEL = { unit: "Unit", material: "Material", emblem: "Emblem", item: "Item", city: "City" } as const;

export default function SearchBox() {
  const router = useRouter();
  const [items, setItems] = useState<SearchItem[] | null>(indexCache);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => (items ? search(items, q) : []), [items, q]);

  const warm = () => {
    if (!items) loadIndex().then(setItems).catch(() => {});
  };

  // "/" or Ctrl/Cmd+K focuses the search; click outside closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input,textarea,select");
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  const go = (it: SearchItem) => {
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
    const [p, hash] = it.h.split("#");
    const here = location.pathname.replace(/\/$/, "") === `${BASE}${p}`.replace(/\/$/, "");
    if (hash && here) {
      // Same page, new anchor: router.push wouldn't fire "hashchange", so the page
      // couldn't react (clear filters, scroll, highlight). Set the hash directly.
      if (location.hash === `#${hash}`) window.dispatchEvent(new HashChangeEvent("hashchange"));
      else location.hash = hash;
      return;
    }
    router.push(it.h);
  };

  return (
    <div ref={boxRef} className="relative ml-auto w-40 sm:w-64">
      <input
        ref={inputRef}
        type="search"
        value={q}
        placeholder="Search…  /"
        aria-label="Search units, materials and emblems"
        className="ctl w-full"
        onFocus={() => {
          warm();
          setOpen(true);
        }}
        onMouseEnter={warm}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && results[active]) go(results[active]);
          else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
        }}
      />
      {open && q.trim() && (
        <ul
          role="listbox"
          className="absolute right-0 z-30 mt-1 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-line bg-panel p-1 shadow-lg"
        >
          {!items && <li className="px-3 py-2 text-sm text-muted">Loading…</li>}
          {items && results.length === 0 && <li className="px-3 py-2 text-sm text-muted">No matches</li>}
          {results.map((it, i) => (
            <li key={it.t + it.h} role="option" aria-selected={i === active}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(it)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${i === active ? "bg-panel-2" : ""}`}
              >
                {it.i ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.i} alt="" width={28} height={28} className="pixel h-7 w-7 shrink-0 rounded object-contain" />
                ) : (
                  <span className="h-7 w-7 shrink-0 rounded bg-panel-2" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{it.n}</span>
                  <span className="block truncate text-xs text-muted">{it.s}</span>
                </span>
                <span className="chip shrink-0 !text-[10px]">{TYPE_LABEL[it.t]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
