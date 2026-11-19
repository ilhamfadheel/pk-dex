# Pocket Kingdom Dex

A fast, searchable fan guide and database for **Pocket Kingdom: Own the World** (SEGA, Nokia
N-Gage, 2004): every unit, rank-up, emblem, material, piece of equipment and area, plus a
rank-up planner, a party builder and a battle simulator.

**Live site: https://ilhamfadheel.github.io/pk-dex/**

## What's in it

| Page | What you get |
|---|---|
| `/` | Introduction to the game, how it works and an FAQ |
| `/units` | All 115 units: sortable stats, filters (race, rank, movement, slots, ability, materials needed or dropped), and the 9 units shops sell |
| `/unit/<name>` | Stats, portrait, battle animations, evolution tree, rank-up requirements, where it's sold or fought |
| `/planner` | Every route to a unit and the total materials, levels and VP it takes |
| `/compare` | Up to 4 units side by side |
| `/party` | Party builder (4 units, 6 slots) with a battle simulator on the game's own battlefields |
| `/emblems` | All 31 emblems, their 70 Lab recipes and which quests reward them |
| `/equipment`, `/crafting` | 138 weapons, armor and accessories; 70 named-item recipes and what their effects do |
| `/materials` | 89 ores, jewels and items: shops, area searches, dungeons, drops, uses |
| `/cities` | World map of Ulgress: each area's shop, enemy parties, searches, dungeons and the bosses that unlock it |

Press <kbd>Ctrl</kbd>+<kbd>F</kbd> (or <kbd>/</kbd>) anywhere for the search palette. Filters and
selections are kept in the URL, so links and the Back button restore them.

## Where the data comes from

The site is built from the game's own files. Each extractor in `scripts/` takes the path to
the game's `system/apps/6rah` folder, checks its assumptions, and writes JSON or images:

| Output | Script | Game file |
|---|---|---|
| Unit portraits (`public/img/portrait`) | `extract-portraits.py` | `pokeport.mbm` |
| Battle backdrops (`public/img/battle`) | `extract-battle-bgs.py` | `pokekin.mbm` |
| Shops (`shops.json`) | `extract-shops.py` | `unitshop.dat`, `itemshop.dat`, `item*.dat` |
| World map, paths, VP, terrain, unlocks (`world.json`) | `extract-world.py` | tables in `6rah.app` |
| Equipment, enemy parties, unit prices, battle stats | `extract-gear-enemies.py` | `equip*.dat`, `partydata.dat`, `unit.dat` |
| Area searches (`searches.json`) | `extract-searches.py` | `product.dat` |
| Quest rewards (`quest-rewards.json`) | `extract-quests.py` | `questitem.dat` + code in `6rah.app` |
| In-game item order (`item-order.json`) | `extract-item-order.py` | `item0-4.dat`, `equip0-2.dat` |

`scripts/mbm.py` decodes the game's Symbian bitmap files. The battle simulator
(`src/lib/battle.ts`) follows the game program's rules for hit chance, damage, timing and
movement; each rule lists the code address it was read from.

Still to be moved onto game-file extractors: the unit, rank-up, emblem and material tables
(`units.json`, `emblems.json`, `materials.json`, `crafting.json`, checked against the game's
tables where extractors exist), the battle sprite strips and the small race/category icons.
The game's own sprite sheets are in `pokekin.mbm`; see `AGENTS.md` for what is known.

The game files themselves are not part of this repository.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in ./out
```

Before a pull request:

```bash
npx tsc --noEmit && npx eslint src
node scripts/check-battle.ts
npm run build && node scripts/check-seo.mjs out
```

The site is a static export (Next.js App Router, React, Tailwind) deployed to GitHub Pages by
`.github/workflows/pages.yml` on every push to `main`. `AGENTS.md` has the conventions and the
notes on the game's file formats.

## Contributing

Contributions are welcome: corrections, new extractors, translations, UI improvements. See
[CONTRIBUTING.md](CONTRIBUTING.md). If something on the site disagrees with the game, please
open an issue with the area, unit or item and what the game shows.

## License

The code in this repository is released under the [MIT License](LICENSE): free to use, change
and share.

Pocket Kingdom: Own the World, its names, data and artwork belong to SEGA and their
respective owners. They are shown here for reference by fans and are not covered by the MIT
License. This project is not affiliated with or endorsed by SEGA or Nokia.
