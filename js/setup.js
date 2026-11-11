/*
 * Setup, one step: welcome and your name. "Change your name" on home reopens it.
 * #welcome runs it as a first open.
 */
import { state, save } from "./state.js";
import { $, esc } from "./util.js";
import { icon } from "./icons.js";
import { goHome } from "./router.js";

let editing = false; // reopened from home

export function drawSetup(fromStart = false) {
  editing = state.setupDone && !fromStart;
  $("obBody").innerHTML = `
    ${editing ? "" : `<div class="hero-art">${icon("aero")}</div>`}
    <h1 class="big">${editing ? "Your name" : "Brew Bench"}</h1>
    ${editing ? "" : `<p class="lead">AeroPress recipes, a timer that walks you through each step, and a journal of every cup.</p>`}
    <label class="f">
      <span class="label">What should we call you? (optional)</span>
      <input class="text big-input" id="obName" maxlength="40" autocomplete="given-name" placeholder="Your first name" value="${esc(state.name)}">
    </label>`;
  $("obBack").hidden = !editing;
  $("obNext").textContent = editing ? "Save" : "Start brewing";
  window.scrollTo(0, 0);
}

export function initSetup() {
  $("obNext").onclick = () => {
    state.name = $("obName").value.trim().slice(0, 40);
    state.setupDone = true;
    save();
    goHome();
  };
  $("obBack").onclick = goHome;
}
