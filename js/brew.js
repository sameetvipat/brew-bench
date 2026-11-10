/*
 * Brew screen, three stages:
 *   ready    what you need, cups, bean, Start
 *   brewing  the timer (js/timer.js)
 *   done     how was it, save (js/log.js)
 * Your version of a recipe comes from taste suggestions; there are no number controls on the main path.
 */
import { BREWERS, LIMITS, clamp, buildRecipe, batchCount } from "./recipes.js";
import { state, session, save, tweakKey, findRecipe, CUP_CHOICES } from "./state.js";
import { $, esc, formatTemp, formatTime } from "./util.js";
import { drawTimer, startBrew, reset as stopBrew } from "./timer.js";
import { drawBeanPicker } from "./shelf.js";

/** How a brew went. "good" is from older logs. */
export const TASTES = { loved: "Loved it", fine: "Fine", sour: "Sour", bitter: "Bitter", weak: "Weak", strong: "Too strong", good: "Good" };
const MOODS = { loved: "Loved it", fine: "Fine", off: "Something's off" };
const OFF = ["sour", "bitter", "weak", "strong"];

/**
 * A recipe with your saved tweak (or the log entry being re-brewed) applied, for the given cups.
 * When it doesn't fit in one brew, the timeline is for one batch and r.batches says how many.
 */
export function recipeFor(id = state.recipeId, bean = state.bean, cups = state.cups) {
  const key = tweakKey(id, bean);
  const tweak = session.draft?.key === key ? session.draft.tweak : state.tweaks[key];
  const recipe = findRecipe(id);
  const r = buildRecipe(recipe, tweak, cups);

  const count = batchCount(recipe, tweak, cups);
  r.batches = null;
  if (count > 1) {
    const one = buildRecipe(recipe, tweak, cups / count);
    r.timeline = one.timeline;
    r.batches = { count, dose: one.dose, water: one.water, ice: one.ice };
  }
  return r;
}

/** Show a recipe on the brew screen. */
export function openBrew(id) {
  state.recipeId = id;
  save();
  session.taste = null;
  session.checked = new Set(); // ticked items on the get-ready list
  $("note").value = "";
  $("saveRow").hidden = false;
  $("afterSave").hidden = true;
  $("saveMsg").textContent = "";
  drawBrew();
  setStage("ready");
}

/** Show one stage of the brew screen: "ready", "brewing" or "done". */
export function setStage(stage) {
  session.stage = stage;
  $("brew").dataset.stage = stage;
  window.scrollTo(0, 0);
}

/* ---------- your version ---------- */

/** Save a change as your version of this recipe. Amounts come in as totals and are stored per cup. */
function applyTweak(change) {
  const r = recipeFor();
  const tweak = { dose: r.dose, water: r.water, temp: r.temp, grind: r.grind, shift: r.shift, ...change };
  tweak.dose = clamp(Math.round((tweak.dose / r.cups) * 2) / 2, LIMITS.dose);
  tweak.water = clamp(Math.round(tweak.water / r.cups), LIMITS.water);
  if (tweak.temp != null) tweak.temp = clamp(Math.round(tweak.temp), LIMITS.temp);

  state.tweaks[tweakKey(state.recipeId, state.bean)] = tweak;
  session.draft = null;
  save();
  drawBrew();
}

function resetToOriginal() {
  delete state.tweaks[tweakKey(state.recipeId, state.bean)];
  session.draft = null;
  save();
  drawBrew();
}

/* ---------- drawing ---------- */

export function drawBrew() {
  const r = (session.current = recipeFor());

  $("brewBack").href = `#brewer/${r.brewer}`;
  $("brewBack").textContent = `‹ ${BREWERS[r.brewer]}`;
  $("doneBack").href = `#brewer/${r.brewer}`;
  for (const id of ["rName", "tName", "dName"]) $(id).textContent = r.name;
  $("rSrc").textContent = r.src;

  $("need").innerHTML = needList(r)
    .map((item, i) => {
      const done = session.checked?.has(i);
      return `<li><button type="button" data-need="${i}" aria-pressed="${!!done}"><span class="tick" aria-hidden="true"></span><span>${item}</span></button></li>`;
    })
    .join("");
  $("batchNote").hidden = !r.batches;
  $("batchNote").textContent = r.batches ? batchNote(r) : "";
  $("yours").hidden = !r.tweaked;

  $("cups").innerHTML = CUP_CHOICES.map(
    (n) => `<button type="button" data-cups="${n}" aria-pressed="${state.cups === n}" aria-label="${n} cup${n > 1 ? "s" : ""}">${n}</button>`,
  ).join("");
  $("stepsN").textContent = r.timeline.length;
  $("steps").innerHTML = r.timeline.map((step) => `<li><b>${formatTime(step.at)}</b>${esc(step.text)}</li>`).join("");

  drawBeanPicker();
  drawTimer();
  drawTaste();
}

/** What to gather before starting, with the numbers in bold. Per batch when brewing in batches. */
function needList(r) {
  const each = r.batches ? " each batch" : "";
  const dose = r.batches?.dose ?? r.dose;
  const water = r.batches?.water ?? r.water;
  const ice = r.batches?.ice ?? r.ice;

  const items = [`<b>${dose} g</b> coffee, ${esc(r.grind.toLowerCase())}${each}`];
  if (r.out) items.push(`<b>${water} g</b> espresso out${each}`);
  else if (r.temp == null) items.push(`<b>${water} g</b> cold water${each}`);
  else items.push(`<b>${water} g</b> water, ${r.temp >= 100 ? "just boiled" : `at ${formatTemp(r.temp)}`}${each}`);
  if (ice) items.push(`<b>${ice} g</b> ice${each}`);
  if (r.milk) items.push(`<b>${r.milk} g</b> milk`);
  return items;
}

/** "An AeroPress holds about 250 g of water, so this brews in 2 batches, one after the other." */
function batchNote(r) {
  const why = r.brewer === "esp" ? "Espresso is one shot per cup" : "An AeroPress holds about 250 g of water";
  return `${why}, so this brews in ${r.batches.count} batches, one after the other.`;
}

/* ---------- taste: one change to try next time ---------- */

const GRIND_FINER = ["Grind one step finer next time.", null];
const GRIND_COARSER = ["Grind one step coarser next time.", null];

/** For sour, bitter, weak or strong: returns [advice, change or null]. Changes are totals: per-cup amounts times cups. */
export function suggestChange(taste, r) {
  const cups = r.cups;
  const moreCoffee = ["Add 1 g coffee per cup, same water.", { dose: r.dose + cups }];
  const moreWater = ["Add 15 g water per cup.", { water: r.water + 15 * cups }];

  const byKind = {
    imm: {
      sour: ["Steep 15 s longer.", { shift: r.shift + 15 }],
      bitter: ["Steep 15 s shorter and 2°C cooler.", { shift: r.shift - 15, temp: r.temp - 2 }],
      weak: moreCoffee,
      strong: moreWater,
    },
    perc: { sour: GRIND_FINER, bitter: GRIND_COARSER, weak: moreCoffee, strong: moreWater },
    esp: {
      sour: GRIND_FINER,
      bitter: GRIND_COARSER,
      weak: ["Pull shorter: 2 g less out per cup.", { water: r.water - 2 * cups }],
      strong: ["Pull longer: 4 g more out per cup.", { water: r.water + 4 * cups }],
    },
    filter: {
      sour: ["Pack the powder a little firmer.", null],
      bitter: ["Use less decoction, more milk.", null],
      weak: moreCoffee,
      strong: ["Use more milk per cup.", null],
    },
    cold: {
      sour: ["Steep 2 h longer.", null],
      bitter: ["Steep 2 h shorter, or grind coarser.", null],
      weak: ["Dilute less.", null],
      strong: ["Dilute more.", null],
    },
  };
  return byKind[r.kind][taste];
}

/** Loved it / Fine / Something's off. Only "off" asks what was off, then gives one suggestion. */
function drawTaste() {
  const taste = session.taste;
  const mood = !taste ? null : OFF.includes(taste) || taste === "off" ? "off" : taste;

  $("moods").innerHTML = Object.entries(MOODS)
    .map(([key, label]) => `<button type="button" class="mood" data-mood="${key}" aria-pressed="${mood === key}">${label}</button>`)
    .join("");
  $("offWhy").hidden = mood !== "off";
  $("tastes").innerHTML = OFF.map(
    (key) => `<button type="button" class="chip" data-taste="${key}" aria-pressed="${taste === key}">${TASTES[key]}</button>`,
  ).join("");
  $("note").hidden = !mood; // the note box appears once you choose

  if (mood === "loved") {
    $("sugg").textContent = "Lovely. Same again next time.";
    return;
  }
  if (!OFF.includes(taste)) {
    $("sugg").textContent = "";
    return;
  }
  const [advice, change] = suggestChange(taste, session.current);
  const useButton = change ? '<button type="button" class="link" id="apply">Use it next time</button>' : "";
  $("sugg").innerHTML = `${advice} ${useButton}`;
}

export function clearTaste() {
  session.taste = null;
  drawTaste();
}

/* ---------- events ---------- */

export function initBrew() {
  $("cups").onclick = (e) => {
    const cups = Number(e.target.dataset.cups);
    if (!cups) return;
    state.cups = cups;
    save();
    drawBrew();
  };

  $("resetR").onclick = resetToOriginal;
  $("startBrew").onclick = startBrew;
  $("logNow").onclick = () => setStage("done");
  $("skipLog").onclick = stopBrew;
  $("brewAgain").onclick = () => {
    $("saveRow").hidden = false;
    $("afterSave").hidden = true;
    $("saveMsg").textContent = "";
    stopBrew();
  };

  $("moods").onclick = (e) => {
    const mood = e.target.closest("[data-mood]")?.dataset.mood;
    if (!mood) return;
    session.taste = mood; // "off" until you say what was off
    drawTaste();
  };
  $("tastes").onclick = (e) => {
    const taste = e.target.dataset.taste;
    if (!taste) return;
    session.taste = session.taste === taste ? "off" : taste;
    drawTaste();
  };

  // tick things off the get-ready list as you gather them
  $("need").onclick = (e) => {
    const button = e.target.closest("[data-need]");
    if (!button) return;
    const i = Number(button.dataset.need);
    if (session.checked.has(i)) session.checked.delete(i);
    else session.checked.add(i);
    navigator.vibrate?.(12);
    button.setAttribute("aria-pressed", session.checked.has(i));
  };

  $("sugg").onclick = (e) => {
    if (e.target.id !== "apply") return;
    applyTweak(suggestChange(session.taste, session.current)[1]);
    $("sugg").textContent = "Done. Your next brew uses it.";
  };
}
