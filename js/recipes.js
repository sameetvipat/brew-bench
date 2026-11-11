/*
 * AeroPress recipes live in recipes/*.md (format: recipes/README.md).
 * This module reads them, checks them, and scales them. Scaling is the only maths:
 * no guessed corrections for roast, bean age or water.
 */

const REQUIRED = ["id", "drink", "served", "name", "src", "dose", "water", "grind", "temp"];
export const DRINKS = { black: "Black", milk: "With milk" };
export const SERVED = { hot: "Hot", iced: "Iced" };

/** Allowed range for your tweaks, per cup. */
export const LIMITS = { dose: [5, 60], water: [10, 1000], temp: [70, 100] };

export const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value));

/* ---------- reading recipe files ---------- */

export async function loadRecipes(base = "recipes/") {
  const fetchOk = async (file) => {
    const res = await fetch(base + file);
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    return res;
  };

  const files = await (await fetchOk("index.json")).json();
  const recipes = await Promise.all(files.map(async (file) => parseRecipe(await (await fetchOk(file)).text(), file)));

  const duplicate = recipes.find((r, i) => recipes.findIndex((x) => x.id === r.id) !== i);
  if (duplicate) throw new Error(`duplicate recipe id "${duplicate.id}"`);

  selfCheck(recipes);
  return recipes;
}

/** One recipe file: "---" front matter, then "- m:ss text" step lines. Throws with the file name on any mistake. */
export function parseRecipe(text, file) {
  const match = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${file}: missing --- front matter ---`);
  const [, frontMatter, body] = match;

  const recipe = {};
  for (const line of frontMatter.split("\n")) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    recipe[key] = value === "" ? null : isNaN(value) ? value : Number(value);
  }

  recipe.steps = [...body.matchAll(/^- (\d+(?::\d{2}){1,2}) (.+)$/gm)].map(([, time, text]) => ({
    at: time.split(":").reduce((total, part) => total * 60 + Number(part), 0),
    text: text.trim(),
  }));

  for (const key of REQUIRED) {
    if (recipe[key] == null) throw new Error(`${file}: missing "${key}"`);
  }
  if (!(recipe.drink in DRINKS)) throw new Error(`${file}: drink must be one of ${Object.keys(DRINKS).join(", ")}`);
  if (!(recipe.served in SERVED)) throw new Error(`${file}: served must be one of ${Object.keys(SERVED).join(", ")}`);
  if (!(recipe.dose > 0 && recipe.water > 0 && recipe.temp > 0)) throw new Error(`${file}: dose, water and temp must be numbers`);
  if (recipe.steps.length < 2 || recipe.steps[0].at !== 0) throw new Error(`${file}: needs 2+ steps, the first at 0:00`);

  for (const step of recipe.steps) {
    try {
      fillAmounts(step.text, { dose: 1, water: 1, ice: 1, top: 1 });
    } catch (e) {
      throw new Error(`${file}: ${e.message}`);
    }
  }
  return recipe;
}

/** Replace amount placeholders in step text: "{water*0.6}" becomes a number. Variables: dose, water, ice, top. */
export function fillAmounts(text, amounts) {
  return text.replace(/\{(\w+)((?:[*/][\d.]+)*)\}/g, (_, name, ops) => {
    if (!(name in amounts)) throw new Error(`unknown {${name}}`);
    let n = amounts[name];
    for (const [, op, num] of ops.matchAll(/([*/])([\d.]+)/g)) n = op === "*" ? n * num : n / num;
    n = Math.max(0, n);
    return String(name === "dose" && !ops ? n : Math.round(n)); // whole grams; a plain {dose} keeps its half gram
  });
}

/* ---------- batches ---------- */

const AEROPRESS_WATER = 250; // what one AeroPress holds, roughly

/** How many separate brews it takes to make this many cups. */
export function batchCount(recipe, tweak, cups) {
  const perCupWater = tweak?.water ?? recipe.water;
  const cupsPerBatch = Math.max(1, Math.floor(AEROPRESS_WATER / perCupWater));
  return Math.ceil(cups / cupsPerBatch);
}

/* ---------- scaling ---------- */

/**
 * A recipe ready to brew: your tweak (per cup) applied, then multiplied by cups.
 * Returns the recipe plus: cups, tweaked, shift, and timeline [{at, text}] with real amounts.
 */
export function buildRecipe(recipe, tweak, cups = 1) {
  const r = { ...recipe, shift: 0, ...tweak, tweaked: Boolean(tweak), cups };
  const waterPerCup = r.water;
  r.dose *= cups;
  r.water = Math.round(r.water * cups);
  // Top-up and ice keep the drink the same size: brew more concentrated, and they make up the difference.
  for (const key of ["ice", "top"]) r[key] = recipe[key] ? Math.round(Math.max(0, recipe.water + recipe[key] - waterPerCup) * cups) : 0;

  const timeline = recipe.steps.map((step) => ({ at: step.at, text: fillAmounts(step.text, r) }));

  // "shift" moves every step after the pour, so the steep gets longer or shorter. Never before 0:05.
  r.shift = clamp(r.shift, [Math.max(-60, 5 - timeline[1].at), 300]);
  for (const step of timeline.slice(1)) step.at += r.shift;

  r.timeline = timeline;
  return r;
}

/* ---------- self-check ---------- */

/** Steps stay in order and amounts never go negative: at 1 and 3 cups, 2x dose, min/max steep, min water. */
export function selfCheck(recipes) {
  for (const recipe of recipes) {
    const cases = [
      [undefined, 1],
      [undefined, 3],
      [{ dose: recipe.dose * 2, water: recipe.water * 2 }, 1],
      [{ shift: -999 }, 1],
      [{ shift: 999 }, 1],
      [{ water: LIMITS.water[0] }, 1],
    ];
    for (const [tweak, cups] of cases) {
      const { timeline } = buildRecipe(recipe, tweak, cups);
      const context = [recipe.id, cups, JSON.stringify(tweak)];
      console.assert(timeline.every((s, i) => i === 0 || s.at > timeline[i - 1].at), "step order", ...context);
      console.assert(!timeline.some((s) => /-\d/.test(s.text)), "negative amount", ...context);
    }
  }
}
