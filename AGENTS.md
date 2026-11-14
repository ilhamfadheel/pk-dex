# Pocket Kingdom Dex — notes for agents

Fan dex for **Pocket Kingdom: Own the World** (Nokia N-Gage, 2004): units, rank-ups, emblems,
materials, equipment, cities, party builder and a battle simulator.
Live: https://ilhamfadheel.github.io/pk-dex/ · repo: `ilhamfadheel/pk-dex` (public).

## Stack
- Next.js 16 App Router, **static export** (`output: "export"`, `trailingSlash: true`,
  `basePath` from `NEXT_PUBLIC_BASE_PATH`, `images.unoptimized`). No server at runtime:
  no Cache Components / PPR, route handlers must be `dynamic = "force-static"`.
- React 19, Tailwind v4 (shared classes `.card .chip .ctl .th .td` in `src/app/globals.css`),
  TypeScript, ESLint (react-hooks rules are strict: no setState in effect bodies, no
  reassigning variables after render, no components created during render).
- `cmdk` for the Ctrl+F search palette (`src/components/SearchBox.tsx`).

## Commands
```bash
npm run dev -- -p 3123                     # preview (see .claude/launch.json one level up)
npx tsc --noEmit && npx eslint src         # before every commit
NEXT_PUBLIC_BASE_PATH=/pk-dex npm run build  # static site in ./out (run from PowerShell on
                                           # Windows: Git Bash rewrites "/pk-dex" into a path)
node scripts/check-seo.mjs out             # every page: title, canonical, OG, JSON-LD, sitemap
node scripts/check-tree.ts                 # evolution-tree layout
node scripts/check-battle.ts               # battle simulator sanity checks
```
Deploy = push to `main`; `.github/workflows/pages.yml` builds and publishes `out/` to GitHub
Pages. Find the run by commit (`gh run list --json databaseId,headSha`), not "latest".

## Where the data comes from
**Read the game files and this codebase; never write "not in any source" notes.** If something
seems missing, look in the game data (`system/apps/6rah/` of the user's N-Gage dump) first.

| File | Made by | From |
|---|---|---|
| `units.json`, `emblems.json`, `materials.json`, `crafting.json`, `effects.json` | earlier import | GameFAQs guides, Apihplays gist, compendium project |
| `shops.json` | `scripts/extract-shops.py` | `unitshop.dat`, `itemshop.dat`, `item*.dat`, `english/area.dat` |
| `world.json` (positions, links, VP, terrain) | `scripts/extract-world.py` | tables in `6rah.app` |
| `equipment.json`, `enemies.json`, `unit-prices.json`, `unit-battle.json` | `scripts/extract-gear-enemies.py` | `equip*.dat`, `partydata.dat`, `unit.dat` |
| `quest-rewards.json` | `scripts/extract-quests.py` | `questitem.dat` + reward code in `6rah.app` |
| `item-order.json` | `scripts/extract-item-order.py` | `item0-4.dat`, `equip0-2.dat` |
| `public/img/battle/*.png` | `scripts/extract-battle-bgs.py` (uses `scripts/mbm.py`) | `pokekin.mbm` |
| `anims.json`, `public/img/anim` | `scripts/slice-sprites.mjs`, `build-anims.mjs` | Spriters Resource sheets |

Every extractor takes the game folder as its argument and asserts its assumptions, so a
different build fails loudly. Run Python with `-I` and `PYTHONIOENCODING=utf-8` on Windows.

Facts that bite:
- Default-folder `item*.dat` names are internal; English names are in `english/*.dat`
  (e.g. emblems: 64-byte UTF-16 records in `english/itemdata.dat` from 0x23B0).
- Item references in game tables are `(category, index)` byte pairs: 0 molds, 1 ores,
  2 jewels, 3 other materials, 4 emblems, 5 weapons, 6 armor, 7 accessories.
- `unit.dat` battle stats differ from the GameFAQs numbers for 58 units; the battle
  simulator uses `unit.dat`, the dex tables still show the guide's.
- One material name is garbled in `item3.dat` ("Sh??ff Rock" → `Shyff Rock`).

## Game code (6RAH.APP)
ARM (ARMv4) code, VA base `0x10000000`; file offset = VA − 0x10000000 + 0x7C. The compendium
project (a separate reverse-engineering repo, not part of this one) has notes on effects and
the battle records. Rules already taken from the code are listed with their addresses at the
top of `src/lib/battle.ts` and in the extractor docstrings — keep that habit: every rule
claimed from the game names the address it came from.

## Conventions
- Lists of items follow the **game's own order** (`gameOrder` / `byGameOrder` in
  `src/lib/data.ts`, `MaterialLite.order`); units follow their game number (`id`). Sorting by
  name is only an explicit user choice.
- A party holds at most **4 units** and their slots add up to at most **6**.
- Filters and selections that should survive Back live in the URL (`src/lib/urlState.ts`).
- `<img>` paths need the base path prefix (`BASE` in `src/lib/data.ts` / `searchIndex.ts`).
- Each page sets metadata through `pageMeta()` in `src/lib/seo.ts`; new pages go in
  `src/app/sitemap.ts` and the search palette's page list.
- Commit messages end with the Co-Authored-By line from the session; the user commits
  through the agent, so keep `main` deployable.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
