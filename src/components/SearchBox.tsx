"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchItem } from "@/lib/types";
import { BASE, TYPE_LABEL, cachedIndex, loadIndex, searchItems } from "@/lib/searchIndex";

const PAGES: { n: string; s: string; h: string }[] = [
  { n: "Units", s: "All 115 units, filters and the Shop table", h: "/" },
  { n: "Rank-up Planner", s: "Materials to evolve any unit", h: "/planner" },
  { n: "Compare units", s: "Up to 4 units side by side", h: "/compare" },
  { n: "Party builder", s: "Build a 4-unit party, see totals, price and enemy match-ups", h: "/party" },
  { n: "Emblems", s: "Every rank-up emblem recipe", h: "/emblems" },
  { n: "Crafting", s: "Weapon, armor and accessory recipes", h: "/crafting" },
  { n: "Equipment", s: "Every weapon, armor and accessory with stats", h: "/equipment" },
  { n: "Materials", s: "Ores, jewels and where to find them", h: "/materials" },
  { n: "Cities", s: "Shops, routes, enemies and the world map", h: "/cities" },
];
const GROUP_ORDER: SearchItem["t"][] = ["unit", "equip", "item", "material", "emblem", "city"];
const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Site-wide command palette (cmdk). Opens with Ctrl/⌘+F, Ctrl/⌘+K, "/", a quick
 * double-tap of Shift, or by clicking the navbar search box.
 */
export default function SearchBox() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[] | null>(cachedIndex());
  const lastShift = useRef(0);

  const results = useMemo(() => (items ? searchItems(items, q) : []), [items, q]);
  const grouped = useMemo(
    () => GROUP_ORDER.map((t) => [t, results.filter((r) => r.t === t)] as const).filter(([, rs]) => rs.length),
    [results],
  );

  const show = () => {
    setOpen(true);
    if (!items) loadIndex().then(setItems).catch(() => {});
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const typing = e.target instanceof Element && e.target.closest("input,textarea,select,[contenteditable]");
      if (mod && (k === "f" || k === "k")) {
        e.preventDefault(); // replaces the browser's find-in-page, as requested
        show();
      } else if (k === "/" && !typing) {
        e.preventDefault();
        show();
      } else if (e.key === "Shift" && !e.repeat && !mod && !e.altKey) {
        const now = performance.now();
        if (now - lastShift.current < 350) { lastShift.current = 0; show(); }
        else lastShift.current = now;
      } else {
        lastShift.current = 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const go = (h: string) => {
    setOpen(false);
    setQ("");
    const [p, hash] = h.split("#");
    const here = location.pathname.replace(/\/$/, "") === `${BASE}${p}`.replace(/\/$/, "");
    if (hash && here) {
      // same page, new anchor: set the hash so the page reacts (scroll/highlight)
      if (location.hash === `#${hash}`) window.dispatchEvent(new HashChangeEvent("hashchange"));
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- same-page anchor, must fire hashchange
      else window.location.assign(`#${hash}`);
      return;
    }
    router.push(h);
  };

  const shortcut = isMac() ? "⌘F" : "Ctrl F";

  return (
    <>
      <button
        type="button"
        onClick={show}
        onMouseEnter={() => { if (!items) loadIndex().then(setItems).catch(() => {}); }}
        className="ctl ml-auto flex w-40 items-center justify-between gap-2 text-left text-muted sm:w-64"
        aria-label="Search units, equipment, materials and cities"
      >
        <span className="truncate">Search…</span>
        <kbd className="rounded border border-line px-1.5 font-mono text-[10px]" suppressHydrationWarning>{shortcut}</kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}
        shouldFilter={false}
        label="Search Pocket Kingdom Dex"
        overlayClassName="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        contentClassName="fixed left-1/2 top-[12vh] z-50 w-[min(640px,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-panel shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <span className="text-muted" aria-hidden>⌕</span>
          <Command.Input
            value={q}
            onValueChange={setQ}
            autoFocus
            placeholder="Search units, equipment, materials, cities…"
            className="h-12 w-full bg-transparent text-base text-ink outline-none placeholder:text-muted"
          />
          <kbd className="rounded border border-line px-1.5 font-mono text-[10px] text-muted">Esc</kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
          {q.trim() && !items && <Command.Loading><div className="px-3 py-2 text-sm text-muted">Loading…</div></Command.Loading>}
          {q.trim() && items && <Command.Empty className="px-3 py-6 text-center text-sm text-muted">No matches for “{q}”</Command.Empty>}

          {!q.trim() && (
            <Command.Group heading="Pages" className="pk-cmd-group">
              {PAGES.map((p) => (
                <Command.Item key={p.h} value={`page-${p.h}`} onSelect={() => go(p.h)} className="pk-cmd-item">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-panel-2 text-xs text-muted">↗</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.n}</span>
                    <span className="block truncate text-xs text-muted">{p.s}</span>
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {grouped.map(([t, rs]) => (
            <Command.Group key={t} heading={TYPE_LABEL[t]} className="pk-cmd-group">
              {rs.map((it) => (
                <Command.Item key={it.t + it.h} value={`${it.t}-${it.h}`} onSelect={() => go(it.h)} className="pk-cmd-item">
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
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
        <div className="flex gap-3 border-t border-line px-3 py-1.5 text-[11px] text-muted">
          <span><kbd className="font-mono">↑↓</kbd> move</span>
          <span><kbd className="font-mono">Enter</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
          <span className="ml-auto">Ctrl F · Ctrl K · / · Shift Shift</span>
        </div>
      </Command.Dialog>
    </>
  );
}
