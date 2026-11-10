/*
 * Bean register: your bags with roast date, grams left and a 1–5 rating.
 * Logging a brew takes its coffee out of the selected bag.
 */
import { $, esc, newId } from "./util.js";
import { state, save } from "./state.js";
import { drawBrew } from "./brew.js";

const DAY_MS = 864e5;
const MAX_BAG_G = 5000;
const LOW_G = 40; // about two brews

let confirmingId = null; // bag waiting for a second tap on "Remove"

function daysOffRoast(bag) {
  if (!bag.roast) return null;
  return Math.max(0, Math.floor((Date.now() - Date.parse(bag.roast)) / DAY_MS));
}

/** "Day 9 off roast, 209 g left", plus "running low" under about two brews. */
export function describeBag(bag) {
  const days = daysOffRoast(bag);
  const parts = [`${Math.round(bag.left)} g left`];
  if (days != null) parts.unshift(`Day ${days} off roast`);
  if (bag.left < LOW_G) parts.push("running low");
  return parts.join(", ");
}

/** Five stars; as buttons on the bean register, plain text elsewhere. */
function stars(bag, editable) {
  const rating = bag.rating || 0;
  if (!editable) return rating ? `<span class="stars" aria-label="${rating} of 5">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</span>` : "";
  const buttons = [1, 2, 3, 4, 5].map(
    (n) => `<button type="button" data-rate="${esc(bag.id)}" data-n="${n}" aria-label="Rate ${n} of 5" aria-pressed="${n === rating}">${n <= rating ? "★" : "☆"}</button>`,
  );
  return `<span class="stars" role="group" aria-label="Rating">${buttons.join("")}</span>`;
}

export const selectedBag = () => state.beans.find((bag) => bag.name === state.bean);
const bagById = (id) => state.beans.find((bag) => bag.id === id);

/** Add a bag and select it. Returns false for an empty name or impossible size. */
export function addBag(name, roast, grams) {
  name = name.trim().slice(0, 120);
  if (!name || !(grams > 0 && grams <= MAX_BAG_G)) return false;
  state.beans.unshift({ id: newId("b"), name, roast: roast || "", g: grams, left: grams, rating: 0 });
  state.bean = name;
  save();
  return true;
}

/** Take coffee out of the selected bag. Returns the bag, or undefined when none is selected. */
export function useCoffee(grams) {
  const bag = selectedBag();
  if (!bag) return undefined;
  bag.left = Math.max(0, bag.left - grams);
  save();
  drawBeanPicker();
  return bag;
}

/* ---------- drawing ---------- */

/** Bean register screen: every bag, editable in place. */
export function drawShelf() {
  if (!state.beans.length) {
    $("shelf").innerHTML = `<li class="empty">No bags yet. Add one below.</li>`;
    return;
  }
  $("shelf").innerHTML = state.beans
    .map(
      (bag) => `
      <li>
        <div class="row-top"><b>${esc(bag.name)}</b>${stars(bag, true)}</div>
        <span class="muted small">${esc(describeBag(bag))}</span>
        <div class="row">
          <label class="f">
            <span class="label">Left (g)</span>
            <input class="text" type="number" inputmode="numeric" min="0" max="${MAX_BAG_G}" data-left="${esc(bag.id)}" value="${Math.round(bag.left)}">
          </label>
          <label class="f">
            <span class="label">Roasted on</span>
            <input class="text" type="date" data-roast="${esc(bag.id)}" value="${esc(bag.roast)}">
          </label>
        </div>
        <div class="btns">
          <button type="button" class="btn small" data-refill="${esc(bag.id)}">Refill to ${Math.round(bag.g)} g</button>
          <button type="button" class="btn small danger" data-remove="${esc(bag.id)}">${confirmingId === bag.id ? "Sure? Remove" : "Remove"}</button>
        </div>
      </li>`,
    )
    .join("");
}

/** The bean dropdown on the brew screen, with the selected bag's age and grams left under it. */
export function drawBeanPicker() {
  const names = [...new Set(state.beans.map((bag) => bag.name))];
  if (state.bean && !names.includes(state.bean)) names.push(state.bean); // a bean from an older log entry

  const options = names.map((name) => `<option value="${esc(name)}"${name === state.bean ? " selected" : ""}>${esc(name)}</option>`);
  $("bean").innerHTML = `<option value="">No bean selected</option>${options.join("")}`;

  const bag = selectedBag();
  $("beanInfo").textContent = bag ? describeBag(bag) : "";
}

/* ---------- events ---------- */

function onShelfClick(e) {
  const button = e.target.closest("button");
  if (!button) return;
  const { rate, n, refill, remove } = button.dataset;

  if (rate) {
    const bag = bagById(rate);
    if (bag) bag.rating = bag.rating === Number(n) ? 0 : Number(n); // tap the same star again to clear
  }
  if (refill) {
    const bag = bagById(refill);
    if (bag) bag.left = bag.g;
  }
  if (remove) {
    if (confirmingId === remove) {
      state.beans = state.beans.filter((bag) => bag.id !== remove);
      confirmingId = null;
    } else {
      confirmingId = remove;
    }
  }
  save();
  drawShelf();
}

function onShelfEdit(e) {
  const { left, roast } = e.target.dataset;
  const bag = bagById(left || roast);
  if (!bag) return;
  if (left) {
    const grams = parseFloat(e.target.value);
    if (grams >= 0 && grams <= MAX_BAG_G) bag.left = grams;
  } else {
    bag.roast = e.target.value; // "" clears it
  }
  save();
  drawShelf();
}

export function initShelf() {
  $("addBean").onsubmit = (e) => {
    e.preventDefault();
    if (!addBag($("nbName").value, $("nbRoast").value, parseFloat($("nbG").value))) return;
    e.target.reset();
    drawShelf();
  };
  $("shelf").onclick = onShelfClick;
  $("shelf").onchange = onShelfEdit;
  $("bean").onchange = (e) => {
    state.bean = e.target.value;
    save();
    drawBrew();
  };
}
