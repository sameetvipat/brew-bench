/* Everything saved on this device, plus session state shared between screens. */
import { BREWERS } from "./recipes.js";

const STORAGE_KEY = "brew-bench-v4";

export const CUP_CHOICES = [1, 2, 3, 4];

/**
 * Saved state:
 * - recipeId  last opened recipe
 * - bean      selected bean name ("" = none)
 * - tweaks    your version of each recipe, per cup: {dose, water, temp, grind, shift}, keyed by tweakKey()
 * - brewers   brewers picked in setup (null = setup not done yet)
 * - cups      1–4
 * - beans     bean register: [{id, name, roast, g, left, rating 0–5}]
 * - run       brew in progress {recipeId, startedAt, batch}, so a 12 h cold brew survives closing the page
 * - name      your first name, for the greeting ("" = none)

 */
// shortcut: tweaks and bean shelf live on this device only; sync them via db if you brew on 2 devices
export const state = load();

/** Not saved; shared between modules for the current page. */
export const session = {
  recipes: [], // parsed recipes/*.md
  current: null, // built recipe shown on the brew screen
  draft: null, // {key, tweak}: a log entry being re-brewed; becomes a saved tweak only once you change something
  taste: null, // selected taste chip
  stage: "ready", // brew screen stage: ready, brewing, done
};

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked: the app keeps working for this visit
  }
}

export const tweakKey = (recipeId, bean) => `${recipeId}|${bean.trim().toLowerCase()}`;

export const findRecipe = (id) => session.recipes.find((r) => r.id === id);

/** Forget a saved run whose recipe file is gone. Call once recipes are loaded. */
export function dropStaleRun() {
  if (state.run && !findRecipe(state.run.recipeId)) state.run = null;
}

function load() {
  const fresh = { recipeId: null, bean: "", tweaks: {}, brewers: null, cups: 1, beans: [], run: null, name: "" };

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return fresh;
  }
  if (!saved || typeof saved !== "object") return fresh;

  // Older saves used short names (rid, tw, mine, run.t); read either.
  const run = saved.run && {
    recipeId: saved.run.recipeId ?? saved.run.rid,
    startedAt: saved.run.startedAt ?? saved.run.t,
    batch: Number(saved.run.batch) || 1,
  };
  const recipeId = saved.recipeId ?? saved.rid;
  const tweaks = saved.tweaks ?? saved.tw;
  const brewers = saved.brewers ?? saved.mine;

  return {
    recipeId: typeof recipeId === "string" ? recipeId : null,
    bean: typeof saved.bean === "string" ? saved.bean : "",
    tweaks: tweaks && typeof tweaks === "object" ? tweaks : {},
    brewers: Array.isArray(brewers) && brewers.some((b) => b in BREWERS) ? brewers : null,
    cups: CUP_CHOICES.includes(saved.cups) ? saved.cups : 1,
    beans: Array.isArray(saved.beans) ? saved.beans.filter((b) => b && typeof b.name === "string" && b.left >= 0) : [],
    run: run && typeof run.recipeId === "string" && typeof run.startedAt === "number" ? run : null,
    name: typeof saved.name === "string" ? saved.name.slice(0, 40) : "",
  };
}
