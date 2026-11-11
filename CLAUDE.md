# Brew Bench

A coffee recipe and brew timer. Plain HTML, CSS and ES-module JS with no build step and no dependencies. See README.txt for the file map. Run it with `python3 -m http.server`: modules and recipe files don't load from `file://`.

**Read `DESIGN.md` first.** It describes the job, the principles, the screens and the build plan. Where it disagrees with the rules below, DESIGN.md wins.

## How to work

- Talk in caveman mode (the `caveman` skill): answer first, short, no filler. Code, numbers and errors stay exact.
- Code in ponytail mode (the `ponytail` plugin): write the least code that works. Before adding anything, check whether it is needed and whether the browser already does it. Never cut validation, error handling or accessibility.
- End each change with what was skipped or not checked.

## Product rules

- **Recipes are fixed and sourced.** Each recipe is a markdown file in `recipes/`, listed in `recipes/index.json`, in the format in `recipes/README.md`. Each has a `src`. Check any new recipe against its source on the web before adding it. Never generate recipes from formulas or add guessed corrections (roast, bean age, water type). Where no published standard exists, or the numbers are a common café build, say so in `src`.
- **Recipes are stored per 1 cup.** The cups picker (1–4) multiplies dose, water, milk and ice. When the cups don't fit in one brew (`BATCH_LIMIT` in `js/recipes.js`: AeroPress about 250 g of water, espresso one cup per shot), the brew splits into equal batches: steps show one batch, and the timer runs them one after another.
- **The only maths is scaling.** Changing cups or dose scales water, milk, ice and step amounts in proportion. Step times stay fixed, except the `shift` steep offset on immersion recipes.
- **Tweaks belong to the user.** Changes are saved per cup as "my version" per recipe and bean, and can always be reset to the original.
- **Beans and history.** The bean shelf tracks the roast date and grams left (logging a brew subtracts its dose). Dial-in history shows the log for this recipe and bean, with what changed since the brew before.
- **Taste feedback suggests one change.** Change one variable at a time, usually grind.
- **UI copy is terse.** Use short imperative steps with exact numbers ("Pour to 150 g by 1:15."). No "why" paragraphs and no marketing text.
- **Keep it small.** Each new feature must replace something or prove it is needed. Use system fonts only.
- **Look: dark and moody, native-app feel.** System font, large titles, rounded cards, one warm crema accent (`--accent`). Brewer line drawings are the only illustrations. Original design: never copy another app's look (the user liked Aeromatic's feel, not its visuals).
- **Flow.** See DESIGN.md. Setup is one step (welcome and name). Tabs: Brew (home with recipe cards, brew in three stages), Beans, Journal. Every new question or control must replace something.

## Brewers

- AeroPress only, by choice: the user stripped the other brewers to keep the app simple. Git history has their recipes and code (V60, espresso, muslin, filter, channi); add one back only on request.

## Checks

- After editing, run `node --check` on each file in `js/`.
- When recipes change, confirm that step times are in order and that the amounts scale correctly at 2× dose. `check()` in `js/recipes.js` covers this, and `parse()` rejects malformed recipe files. Load the page over http and check the console.
