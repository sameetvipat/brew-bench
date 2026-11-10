/*
 * Setup, two steps: your name, then your brewers. Everything else has a sensible default.
 * "Change your name or brewers" on home reopens it pre-filled. #welcome runs it as a first open.
 */
import { BREWERS } from "./recipes.js";
import { state, save, session } from "./state.js";
import { $, esc, plural } from "./util.js";
import { icon } from "./icons.js";
import { goHome } from "./router.js";

let step = 1;
let editing = false; // reopened from home
let name = "";
let picked = new Set();

export function drawSetup(fromStart = false) {
  editing = Boolean(state.brewers) && !fromStart;
  step = 1;
  name = state.name;
  picked = new Set(state.brewers || []);
  show();
}

function show() {
  $("obBody").innerHTML = step === 1 ? nameStep() : brewersStep();
  $("obBody").classList.remove("pop");
  void $("obBody").offsetWidth; // replay the slide-in
  $("obBody").classList.add("pop");

  $("obBack").hidden = step === 1 && !editing;
  $("obBack").textContent = step === 1 ? "‹ Home" : "‹ Back";
  $("obNext").textContent = step === 1 ? "Continue" : editing ? "Save" : "Start brewing";
  $("obNext").disabled = step === 2 && picked.size === 0;
  window.scrollTo(0, 0);
}

function nameStep() {
  return `
    ${editing ? "" : `<div class="hero-art">${Object.keys(BREWERS).map((b) => icon(b)).join("")}</div>`}
    <h1 class="big">${editing ? "Your name" : "Brew Bench"}</h1>
    ${editing ? "" : `<p class="lead">Your recipes and a timer for the brewers you own, and a journal of every cup.</p>`}
    <label class="f">
      <span class="label">What should we call you? (optional)</span>
      <input class="text big-input" id="obName" maxlength="40" autocomplete="given-name" placeholder="Your first name" value="${esc(name)}">
    </label>`;
}

function brewersStep() {
  return `
    <h1>What do you brew with?</h1>
    <div class="grid2">${Object.entries(BREWERS)
      .map(([key, label]) => {
        const count = session.recipes.filter((r) => r.brewer === key && !r.extra).length;
        return `
          <button type="button" class="brewer-card" data-brewer="${key}" aria-pressed="${picked.has(key)}">
            ${icon(key)}<b>${label}</b><span>${plural(count, "recipe")}</span>
          </button>`;
      })
      .join("")}</div>`;
}

export function initSetup() {
  $("obBody").addEventListener("click", (e) => {
    const brewer = e.target.closest("[data-brewer]")?.dataset.brewer;
    if (!brewer) return;
    if (picked.has(brewer)) picked.delete(brewer);
    else picked.add(brewer);
    $("obBody").innerHTML = brewersStep(); // redraw without the slide-in
    $("obNext").disabled = picked.size === 0;
  });
  $("obBody").addEventListener("input", (e) => {
    if (e.target.id === "obName") name = e.target.value;
  });

  $("obNext").onclick = () => {
    if (step === 1) {
      state.name = name.trim().slice(0, 40);
      save();
      step = 2;
      return show();
    }
    state.brewers = Object.keys(BREWERS).filter((b) => picked.has(b)); // keep a stable order
    save();
    goHome();
  };
  $("obBack").onclick = () => {
    if (step === 2) {
      step = 1;
      return show();
    }
    goHome();
  };
}
