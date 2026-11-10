/*
 * Brew timer: counts up, beeps at each step, and draws the dial.
 * The start time is saved (state.run), so a long brew keeps going after the page closes.
 */
import { $, esc, formatTime, formatTemp } from "./util.js";
import { state, session, save } from "./state.js";
import { setStage } from "./brew.js";

const TICK_MS = 250;
const LONG_BREW = 3600; // seconds; longer brews never hold the screen on

let startedAt = 0; // Date.now() at 0:00
let elapsed = 0; // seconds since 0:00
let interval = null; // set while running
let lastStep = -1; // step index we last beeped for
let finished = false;
let batch = 1; // which batch is brewing, when a recipe needs more than one brew
let wakeLock = null;
let audio = null;

const ASK_ALERTS_FROM = 300; // seconds; ask for notifications only on brews you'd walk away from

// shortcut: locked-phone alerts work where the browser keeps timers running (Android, desktop);
// iOS pauses the page, so they need a push server to be reliable there

const timeline = () => session.current.timeline;
const totalTime = () => timeline().at(-1).at;
const isLongBrew = () => totalTime() >= LONG_BREW;
const isRunning = () => interval !== null;
const batchTotal = () => session.current.batches?.count || 1;

/** Index of the step in progress at this second, or -1 before the first. */
function stepAt(seconds) {
  let index = -1;
  timeline().forEach((step, i) => {
    if (seconds >= step.at) index = i;
  });
  return index;
}

/* ---------- drawing ---------- */

export function drawTimer() {
  const steps = timeline();
  if (batch > batchTotal()) batch = 1; // cups changed to fewer batches
  const started = isRunning() || elapsed > 0;
  $("batch").textContent = batchTotal() > 1 ? `Batch ${batch} of ${batchTotal()}` : "";
  const current = started ? stepAt(Math.floor(elapsed)) : -1;
  const next = steps[current + 1];

  $("clock").textContent = formatTime(elapsed);
  $("clock").classList.toggle("long", isLongBrew());
  showNow(current < 0 ? prepLine() : steps[current].text);
  let upcoming = next ? `Next at ${formatTime(next.at)}: ${next.text}` : "";
  if (!started) upcoming = `First: ${steps[0].text}`;
  $("next").textContent = upcoming;
  $("steps").innerHTML = steps
    .map((step, i) => {
      const status = i === current ? "on" : i < current ? "done" : "";
      return `<li class="${status}"><b>${formatTime(step.at)}</b>${esc(step.text)}</li>`;
    })
    .join("");
  drawDial();

  let left = `${formatTime(totalTime())} total`;
  if (finished) left = "done";
  else if (started) left = next ? `next in ${formatTime(next.at - elapsed)}` : "";
  $("left").textContent = left;
}

/** What to do before pressing Start (amounts for one batch when brewing in batches). */
function prepLine() {
  const r = session.current;
  const dose = r.batches?.dose ?? r.dose;
  const ice = r.batches?.ice ?? r.ice;
  let line = `Weigh ${dose} g, ${r.grind.toLowerCase()}. Water ${formatTemp(r.temp)}.`;
  if (ice) line += ` Ice ${ice} g in the ${r.kind === "esp" || r.kind === "filter" ? "glass" : "server"}.`;
  if (batch > 1) line = `Batch ${batch - 1} done. Empty and rinse, then start batch ${batch}. ${line}`;
  return line;
}

/** The big current-step line. It is a live region, so only write it when it changes. */
function showNow(text) {
  const el = $("now");
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove("pop");
  void el.offsetWidth; // reflow, so re-adding the class replays the fade
  el.classList.add("pop");
}

/** The ring fills over the whole brew; one dot per step, filled once reached. */
function drawDial() {
  const total = totalTime();
  const percent = Math.min(100, (elapsed / total) * 100);
  $("arc").style.strokeDashoffset = 100 - percent;
  $("arc").style.opacity = percent ? 1 : 0;
  $("dial").setAttribute("aria-valuenow", Math.round(percent));

  $("ticks").innerHTML = timeline()
    .slice(1)
    .map((step) => {
      const angle = (step.at / total) * 2 * Math.PI;
      const x = (100 + 90 * Math.cos(angle)).toFixed(1);
      const y = (100 + 90 * Math.sin(angle)).toFixed(1);
      return `<circle class="tick${elapsed >= step.at ? " on" : ""}" r="5" cx="${x}" cy="${y}"/>`;
    })
    .join("");
}

/* ---------- sound and screen ---------- */

function beep(count) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < count; i++) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const t = audio.currentTime + i * 0.22;
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(audio.destination);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.start(t);
      osc.stop(t + 0.18);
    }
  } catch {
    // no audio: the screen still shows each step
  }
}

/** A new step started: buzz the phone, and show a notification when the page is hidden. */
function alertStep(text) {
  navigator.vibrate?.([200, 100, 200]);
  if (!document.hidden || !("Notification" in window) || Notification.permission !== "granted") return;
  const options = { body: text, tag: "brew-step", renotify: true };
  navigator.serviceWorker
    ?.getRegistration()
    .then((reg) => (reg ? reg.showNotification("Brew Bench", options) : new Notification("Brew Bench", options)))
    .catch(() => {}); // no notification; the beep and dial still work
}

function askForAlerts() {
  if (totalTime() >= ASK_ALERTS_FROM && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

function holdScreenOn() {
  try {
    navigator.wakeLock?.request("screen").then((lock) => (wakeLock = lock)).catch(() => {});
  } catch {
    // not supported: the screen may dim
  }
}

function releaseScreen() {
  try {
    wakeLock?.release();
  } catch {
    // already released
  }
  wakeLock = null;
}

/* ---------- start, pause, reset ---------- */

function tick() {
  elapsed = (Date.now() - startedAt) / 1000;
  const current = stepAt(Math.floor(elapsed));
  if (current !== lastStep) {
    if (lastStep > -1) {
      beep(current === timeline().length - 1 ? 3 : 2); // 3 beeps on the last step
      alertStep(timeline()[current].text);
    }
    lastStep = current;
  }
  if (elapsed >= totalTime()) finish();
  drawTimer();
}

function start({ resume = false } = {}) {
  startedAt = Date.now() - elapsed * 1000;
  if (lastStep === -1) {
    lastStep = stepAt(Math.floor(elapsed));
    if (!resume) beep(1);
  }
  if (!resume) askForAlerts(); // needs a tap, so only from the Start button
  state.run = { recipeId: session.current.id, startedAt, batch };
  save();
  interval = setInterval(tick, TICK_MS);
  $("go").textContent = "Pause";
  if (!isLongBrew()) holdScreenOn(); // never hold the screen on for a 12 h steep
}

function stopTicking() {
  clearInterval(interval);
  interval = null;
  releaseScreen();
}

function pause() {
  stopTicking();
  state.run = null;
  save();
  $("go").textContent = "Resume";
}

/** A batch ended but more are left: get ready for the next one. */
function nextBatch() {
  stopTicking();
  batch++;
  elapsed = 0;
  lastStep = -1;
  state.run = null; // nothing is brewing between batches
  save();
  $("go").textContent = `Start batch ${batch}`;
}

function finish() {
  if (batch < batchTotal()) return nextBatch();
  pause();
  finished = true;
  setStage("done");
}

/** Stop and go back to "get ready": Stop button, Skip after a brew, Brew again. */
export function reset() {
  stopTicking();
  batch = 1;
  elapsed = 0;
  lastStep = -1;
  finished = false;
  state.run = null;
  save();
  $("go").textContent = "Start";
  drawTimer();
  setStage("ready");
}

/** "Start brewing" on the get-ready stage. */
export function startBrew() {
  setStage("brewing");
  if (!isRunning()) start();
}

/* ---------- used by the router ---------- */

/** Leaving the brew screen: stop ticking but keep state.run, so the brew carries on when you come back. */
export function leaveTimer() {
  stopTicking();
  batch = 1;
  elapsed = 0;
  lastStep = -1;
  finished = false;
}

/** Opening a recipe: pick its brew back up if one is running. Call after drawBrew(). */
export function enterTimer(recipeId) {
  $("go").textContent = "Start";
  if (state.run?.recipeId !== recipeId) return;
  batch = state.run.batch || 1;
  elapsed = (Date.now() - state.run.startedAt) / 1000;
  start({ resume: true });
  setStage("brewing");
}

export function initTimer() {
  $("go").onclick = () => {
    if (finished) reset();
    else if (isRunning()) pause();
    else start();
  };
  $("reset").onclick = reset;

  // The browser drops the wake lock when the page is hidden; take it again on return.
  document.addEventListener("visibilitychange", () => {
    if (isRunning() && !isLongBrew() && !document.hidden) holdScreenOn();
  });
}
