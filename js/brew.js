/*
 * Brew screen, three stages:
 *   ready    what you need, cups, bean, Start
 *   brewing  the timer (js/timer.js)
 *   done     how was it, save (js/log.js)
 * "Edit recipe" changes the numbers for 1 cup: on a stock recipe that's your version (per bean),
 * on your own recipe it changes the recipe itself. "Make it my own recipe" copies a recipe to edit freely.
 */
import { LIMITS, clamp, buildRecipe, batchCount } from "./recipes.js";
import { state, session, save, tweakKey, findRecipe, CUP_CHOICES } from "./state.js";
import { $, esc, formatTemp, formatTime, newId } from "./util.js";
import { navigateTo, goHome } from "./router.js";
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
  const recipe = findRecipe(id);
  const tweak = recipe.mine ? undefined : session.draft?.key === key ? session.draft.tweak : state.tweaks[key]; // your own recipe is edited directly
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
  $("editBox").open = Boolean(session.editNext); // open right away after "Make it my own recipe"
  session.editNext = false;
  confirmingDelete = false;
  drawBrew();
  setStage("ready");
}

/** Show one stage of the brew screen: "ready", "brewing" or "done". */
export function setStage(stage) {
  session.stage = stage;
  $("brew").dataset.stage = stage;
  window.scrollTo(0, 0);
}

/* ---------- your version, your own recipes ---------- */

let confirmingDelete = false;

/** The current numbers for 1 cup, as the edit panel shows them. */
const perCup = () => recipeFor(state.recipeId, state.bean, 1);

/**
 * Save numbers for 1 cup. A stock recipe gets them as your version for this bean;
 * your own recipe takes them itself (a steep change moves its step times).
 */
function saveVersion(change) {
  const one = perCup();
  const v = { dose: one.dose, water: one.water, temp: one.temp, grind: one.grind, shift: one.shift, ...change };
  v.dose = clamp(Math.round(v.dose * 2) / 2, LIMITS.dose);
  v.water = clamp(Math.round(v.water), LIMITS.water);
  v.temp = clamp(Math.round(v.temp), LIMITS.temp);
  v.grind = String(v.grind).trim().slice(0, 80) || one.grind;

  const recipe = findRecipe(state.recipeId);
  if (recipe.mine) {
    const delta = Math.max(v.shift, 5 - recipe.steps[1].at); // never move the second step before 0:05
    for (const step of recipe.steps.slice(1)) step.at += delta;
    // keep the drink the same size: less brewing water, more top-up or ice
    for (const key of ["top", "ice"]) if (recipe[key]) recipe[key] = Math.max(0, recipe[key] + recipe.water - v.water);
    Object.assign(recipe, { dose: v.dose, water: v.water, temp: v.temp, grind: v.grind });
  } else {
    state.tweaks[tweakKey(state.recipeId, state.bean)] = v;
    session.draft = null;
  }
  save();
  drawBrew();
}

/** A taste suggestion, in totals for the current cups: turn it into per-cup numbers. */
function applyTweak(change) {
  const cups = state.cups;
  const per = { ...change };
  if ("dose" in per) per.dose /= cups;
  if ("water" in per) per.water /= cups;
  saveVersion(per);
}

function resetToOriginal() {
  delete state.tweaks[tweakKey(state.recipeId, state.bean)];
  session.draft = null;
  save();
  drawBrew();
}

/** Copy this recipe (with your version's numbers) into your own recipes, and open it to edit. */
function makeMine() {
  const recipe = findRecipe(state.recipeId);
  const one = perCup();
  const copy = {
    id: newId("my-"),
    mine: true,
    name: `My ${recipe.name}`,
    src: `Your recipe, from ${recipe.name}`,
    drink: recipe.drink,
    served: recipe.served,
    dose: one.dose,
    water: one.water,
    temp: one.temp,
    grind: one.grind,
    ...(recipe.top ? { top: one.top } : {}),
    ...(recipe.ice ? { ice: one.ice } : {}),
    steps: recipe.steps.map((step, i) => ({ at: one.timeline[i].at, text: step.text })),
  };
  state.myRecipes.push(copy);
  session.recipes.push(copy);
  save();
  session.editNext = true;
  navigateTo(copy.id);
}

function deleteMine() {
  if (!confirmingDelete) {
    confirmingDelete = true;
    return drawEdit(perCup());
  }
  state.myRecipes = state.myRecipes.filter((r) => r.id !== state.recipeId);
  session.recipes = session.recipes.filter((r) => r.id !== state.recipeId);
  save();
  goHome();
}

/** Step text as you type it ("Pour to 90 g") back to a recipe line that scales ("Pour to {water} g"). */
function toTemplate(text, one) {
  return text.replace(/(\d+(?:\.\d+)?)\s?g\b/g, (_, n) => {
    n = Number(n);
    for (const key of ["water", "top", "ice", "dose"]) if (one[key] && n === one[key]) return `{${key}} g`;
    return `{water*${+(n / one.water).toFixed(4)}} g`; // any other amount follows your water
  });
}

/** Save your own recipe's steps from the text box: one "m:ss what to do" per line. */
function saveSteps() {
  const one = perCup();
  const lines = $("eSteps").value.split("\n").map((l) => l.trim()).filter(Boolean);
  const steps = lines.map((line) => {
    const m = line.match(/^(\d{1,2}):(\d{2})\s+(.+)$/);
    return m && { at: Number(m[1]) * 60 + Number(m[2]), text: toTemplate(m[3], one) };
  });
  const valid = steps.length >= 2 && steps.every(Boolean) && steps[0].at === 0 && steps.every((s, i) => i === 0 || s.at > steps[i - 1].at);
  if (!valid) {
    $("eStepsMsg").textContent = "Each line: a time like 1:30, then the step. Start at 0:00, times going up, at least two steps.";
    return;
  }
  findRecipe(state.recipeId).steps = steps;
  $("eStepsMsg").textContent = "";
  save();
  drawBrew();
}

/** The edit panel: numbers for 1 cup with − and +, grind, and for your own recipe its name and steps. */
function drawEdit(one) {
  const rows = [
    ["Coffee", `${one.dose} g`, "dose", 0.5],
    ["Water", `${one.water} g`, "water", 5],
    ["Temp", formatTemp(one.temp), "temp", 1],
    ["Steep", formatTime(one.timeline[1].at), "shift", 5],
  ];
  $("editRows").innerHTML = rows
    .map(([label, value, key, step]) => `
      <div class="erow">
        <span>${label}</span>
        <button type="button" data-e="${key}" data-d="${-step}" aria-label="Less ${label.toLowerCase()}">−</button>
        <b>${value}</b>
        <button type="button" data-e="${key}" data-d="${step}" aria-label="More ${label.toLowerCase()}">+</button>
      </div>`)
    .join("");

  let info = `Ratio 1:${+(one.water / one.dose).toFixed(1)}.`;
  if (one.top) info += ` Top up with ${one.top} g, so the drink stays ${one.water + one.top} g.`;
  if (one.ice) info += ` Over ${one.ice} g ice, so the drink stays ${one.water + one.ice} g.`;
  $("editInfo").textContent = info;

  if (document.activeElement !== $("eGrind")) $("eGrind").value = one.grind;
  const mine = Boolean(one.mine);
  $("eNameRow").hidden = !mine;
  $("eStepsRow").hidden = !mine;
  $("makeMine").hidden = mine;
  $("deleteMine").hidden = !mine;
  $("deleteMine").textContent = confirmingDelete ? "Sure? Delete it" : "Delete this recipe";
  if (mine) {
    if (document.activeElement !== $("eName")) $("eName").value = one.name;
    if (document.activeElement !== $("eSteps")) $("eSteps").value = one.timeline.map((s) => `${formatTime(s.at)} ${s.text}`).join("\n");
  }
}

/* ---------- drawing ---------- */

export function drawBrew() {
  const r = (session.current = recipeFor());

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
  drawEdit(perCup());

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
  const items = [
    `<b>${dose} g</b> coffee, ${esc(r.grind.toLowerCase())}${each}`,
    `<b>${water} g</b> water, ${r.temp >= 100 ? "just boiled" : `at ${formatTemp(r.temp)}`}${each}`,
  ];
  if (ice) items.push(`<b>${ice} g</b> ice${each}`);
  return items;
}

/** "An AeroPress holds about 250 g of water, so this brews in 2 batches, one after the other." */
function batchNote(r) {
  return `An AeroPress holds about 250 g of water, so this brews in ${r.batches.count} batches, one after the other.`;
}

/* ---------- taste: one change to try next time ---------- */

/** For sour, bitter, weak or strong: returns [advice, change]. Changes are totals: per-cup amounts times cups. */
export function suggestChange(taste, r) {
  const cups = r.cups;
  return {
    sour: ["Steep 15 s longer.", { shift: r.shift + 15 }],
    bitter: ["Steep 15 s shorter and 2°C cooler.", { shift: r.shift - 15, temp: r.temp - 2 }],
    weak: ["Add 1 g coffee per cup, same water.", { dose: r.dose + cups }],
    strong: ["Add 15 g water per cup.", { water: r.water + 15 * cups }],
  }[taste];
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
  const [advice] = suggestChange(taste, session.current);
  $("sugg").innerHTML = `${advice} <button type="button" class="link" id="apply">Use it next time</button>`;
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

  $("editRows").onclick = (e) => {
    const button = e.target.closest("[data-e]");
    if (!button) return;
    const one = perCup();
    const key = button.dataset.e;
    saveVersion({ [key]: one[key] + Number(button.dataset.d) });
  };
  $("eGrind").onchange = (e) => saveVersion({ grind: e.target.value });
  $("eName").onchange = (e) => {
    const name = e.target.value.trim().slice(0, 60);
    if (!name) return drawBrew();
    findRecipe(state.recipeId).name = name;
    save();
    drawBrew();
  };
  $("eSteps").onchange = saveSteps;
  $("makeMine").onclick = makeMine;
  $("deleteMine").onclick = deleteMine;
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
