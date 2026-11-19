# Contributing

Thanks for helping with Pocket Kingdom Dex. Everyone is welcome to contribute, and the code is
MIT licensed, so your contribution will be too.

## Ways to help

- **Report a mistake.** Open an issue saying which unit, item or area is wrong and what the
  game shows. A screenshot helps.
- **Fix or add data.** Data lives in `src/data/*.json`. Most files are written by an extractor
  in `scripts/`; change the extractor and re-run it rather than editing its output by hand.
- **Improve the site.** Pages are in `src/app`, shared UI in `src/components`, logic in `src/lib`.

## Set up

```bash
npm install
npm run dev
```

## Before you open a pull request

```bash
npx tsc --noEmit && npx eslint src      # types and lint
node scripts/check-battle.ts            # battle simulator checks
npm run build && node scripts/check-seo.mjs out
```

## Ground rules

- **The game is the source of truth.** Numbers and lists should come from the game's own files.
  When you take a rule from the game program, note the code address it came from, as
  `src/lib/battle.ts` does.
- **Don't commit game files.** Extractors read them from a folder you pass on the command line;
  only their output belongs in the repository.
- **Keep lists in the game's order** (`byGameOrder` in `src/lib/data.ts`), and keep filters and
  selections in the URL so links and the Back button work.
- **New pages** need metadata through `pageMeta()` in `src/lib/seo.ts`, an entry in
  `src/app/sitemap.ts` and one in the search palette's page list.

`AGENTS.md` describes the file formats and conventions in more detail.
