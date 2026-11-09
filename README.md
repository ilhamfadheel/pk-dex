# Pocket Kingdom Dex

A fast fan reference for **Pocket Kingdom: Own the World** (SEGA, N-Gage, 2004): unit dex,
evolution tree, emblem recipes, materials, and a rank-up planner that totals every material
you need to get from one unit to another.

Built with Next.js 16 (App Router, Cache Components). All game data is static JSON, so every
page (213 routes) is prerendered at build time; filtering and planning run in the browser.

## Pages

| Route | What |
|---|---|
| `/` | Unit dex: sortable stats table or grid; filter by race, rank, move, slots, ability, stage, **material needed to evolve into the unit**, or material it drops |
| `/unit/[slug]` | Stats, evolves from/into with emblem recipe, evolution line, drops, built-in planner |
| `/planner?from=&to=` | Every rank-up path between two units, per-step emblem + recipe choice, total materials, battles and VP |
| `/emblems` | All 31 emblems / 70 recipes and which rank-ups use each |
| `/materials`, `/materials/[slug]` | Ores, jewels, items: shops, drops, area searches, dungeons, crafting recipes, units they unlock |

## Planner rules

From the Unit Rankup Guide by Gearb0x (GameFAQs):

- Each rank-up consumes one emblem; each emblem combine uses ore + jewel + item + one **RankUp Mold**.
- Units reset to level 0 after ranking up and gain 1 level per battle, so **battles = sum of level requirements**.
- VP is a kingdom total you must have, not spend, so the path needs the **max** VP, not the sum.
- "Budget for failed combines" multiplies each emblem's materials by `100 / success%`.

## Data and assets

- `src/data/*.json` comes from [Apihplays/Pocket-Kingdom-Compendium](https://github.com/Apihplays/Pocket-Kingdom-Compendium)
  (scraped from archived pk.warcry.com). Its 109 rank-up edges were checked against the GameFAQs
  Unit Rankup Guide and match exactly; it adds the secret unit O'Rosam.
- `public/img` holds unit portraits, race and item-category icons from archived pk.warcry.com pages
  (Internet Archive). 20 units have no archived portrait and fall back to their race icon.
- Game names, data and art © SEGA. The GameFAQs guides' text is not reproduced.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```
