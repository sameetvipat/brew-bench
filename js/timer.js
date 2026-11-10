/*
 * Brewing stage: one step card at a time, with the amount huge, counting down to the next step.
 * A soft chime and a buzz mark each new step; the screen stays awake; tap anywhere to pause.
 * The start time is saved (state.run), so a long brew keeps going after the page closes.
 */
import { $, formatTime } from "./util.js";
import { state, session, save } from "./state.js";
import { setStage } from "./brew.js";

const TICK_MS = 250;
const LONG_BREW = 3600; // seconds; longer brews never hold the screen on
const ASK_ALERTS_FROM = 300; // seconds; ask for notifications only on brews you'd walk away from

let startedAt = 0; // Date.now() at 0:00
let elapsed = 0; // seconds since 0:00
let interval = null; // set while running
let lastStep = -1; // step index we last chimed for
let between = false; // a batch just ended and the next one hasn't started
let batch = 1; // which batch is brewing, when a recipe needs more than one brew
let wakeLock = null;
let audio = null;

// shortcut: locked-phone alerts work where the browser keeps timers running (Android, desktop);
// iOS pauses the page, so they need a push server to be reliable there

const timeline = () => session.current.timeline;
const totalTime = () => timeline().at(-1).at;
const isLongBrew = () => totalTime() >= LONG_BREW;
const isRunning = () => interval !== null;
const batchTotal = () => session.current.batches?.count || 1;

/** Index of the step in progress at this second (0 from the start). */
function stepAt(seconds) {
  let index = 0;
  timeline().forEach((step, i) => {
    if (seconds >= step.at) index = i;
  });
  return index;
}

/* ---------- drawing ---------- */

/** "Pour to 200 g. Plunger in 1 cm." -> lead "Pour to", amount "200 g", rest "Plunger in 1 cm." */
function splitStep(text) {
  const m = text.match(/^(.*?)(\d+(?:\.\d+)?\s?g)\b\.?\s*(.*)$/);
  if (!m) return { lead: "", amount: "", rest: text };
  return { lead: m[1].trim(), amount: m[2], rest: m[3] };
}

export function drawTimer() {
  if (batch > batchTotal()) batch = 1; // cups changed to fewer batches
  const steps = timeline();
  const current = stepAt(Math.floor(elapsed));
  const next = steps[current + 1];
  const paused = !isRunning();

  $("batch").textContent = batchTotal() > 1 ? `Batch ${batch} of ${batchTotal()}` : "";
  $("stepNo").textContent = between ? "" : `Step ${current + 1} of ${steps.length}`;
  $("clock").textContent = formatTime(elapsed);

  if (between) {
    showCard({ lead: `Batch ${batch - 1} done`, amount: "", rest: "Empty and rinse, then start the next one." });
    $("next").textContent = `First: ${steps[0].text}`;
  } else {
    showCard(splitStep(steps[current].text));
    $("next").textContent = next ? `Then: ${next.text}` : "Last step";
  }

  // countdown to the next step (or to the end on the last step)
  const from = steps[current].at;
  const to = next ? next.at : totalTime();
  const share = to > from ? Math.min(1, (elapsed - from) / (to - from)) : 1;
  $("bar").style.width = between ? "0%" : `${share * 100}%`;
  $("left").textContent = between ? "" : next ? `next in ${formatTime(to - elapsed)}` : "";

  $("pausedBtns").hidden = !paused;
  $("hint").hidden = paused;
  $("go").textContent = between ? `Start batch ${batch}` : "Resume";
}

/** The step card. A live region, so only rewrite it when the step changes; it slides in fresh. */
function showCard({ lead, amount, rest }) {
  const key = `${lead}|${amount}|${rest}`;
  const card = $("stepCard");
  if (card.dataset.key === key) return;
  card.dataset.key = key;
  $("stepLead").textContent = lead;
  $("stepAmount").textContent = amount;
  $("stepAmount").hidden = !amount;
  $("stepRest").textContent = rest;
  card.classList.remove("slide");
  void card.offsetWidth; // reflow, so re-adding the class replays the slide
  card.classList.add("slide");
}

/* ---------- sound, buzz, screen ---------- */

/** A soft chime: two rising notes for a new step, three for the last. */
function chime(last = false) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const notes = last ? [523.25, 659.25, 783.99] : [587.33, 783.99]; // C5 E5 G5 / D5 G5
    notes.forEach((freq, i) => {
      const t = audio.currentTime + i * 0.16;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(audio.destination);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); // long, soft tail
      osc.start(t);
      osc.stop(t + 1);
    });
  } catch {
    // no audio: the screen still shows each step
  }
}

/** A new step started: buzz, and show a notification when the page is hidden. */
function alertStep(text) {
  navigator.vibrate?.([120, 80, 120]);
  if (!document.hidden || !("Notification" in window) || Notification.permission !== "granted") return;
  const options = { body: text, tag: "brew-step", renotify: true };
  navigator.serviceWorker
    ?.getRegistration()
    .then((reg) => (reg ? reg.showNotification("Brew Bench", options) : new Notification("Brew Bench", options)))
    .catch(() => {}); // no notification; the chime and the card still work
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

/* ---------- start, pause, stop ---------- */

function tick() {
  elapsed = (Date.now() - startedAt) / 1000;
  const current = stepAt(Math.floor(elapsed));
  if (current !== lastStep) {
    if (lastStep > -1) {
      chime(current === timeline().length - 1);
      alertStep(timeline()[current].text);
    }
    lastStep = current;
  }
  if (elapsed >= totalTime()) finish();
  drawTimer();
}

function start({ resume = false } = {}) {
  between = false;
  startedAt = Date.now() - elapsed * 1000;
  if (lastStep === -1) {
    lastStep = stepAt(Math.floor(elapsed));
    if (!resume) chime();
  }
  if (!resume) askForAlerts(); // needs a tap, so only from Start
  state.run = { recipeId: session.current.id, startedAt, batch };
  save();
  interval = setInterval(tick, TICK_MS);
  if (!isLongBrew()) holdScreenOn(); // never hold the screen on for a 12 h steep
  drawTimer();
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
  drawTimer();
}

/** A batch ended but more are left: wait for "Start batch 2". */
function nextBatch() {
  stopTicking();
  batch++;
  elapsed = 0;
  lastStep = -1;
  between = true;
  state.run = null; // nothing is brewing between batches
  save();
}

function finish() {
  if (batch < batchTotal()) return nextBatch();
  stopTicking();
  state.run = null;
  save();
  setStage("done");
}

/** Stop and go back to "get ready": Stop, Skip after a brew, Brew again. */
export function reset() {
  stopTicking();
  batch = 1;
  elapsed = 0;
  lastStep = -1;
  between = false;
  state.run = null;
  save();
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
  between = false;
}

/** Opening a recipe: pick its brew back up if one is running. Call after drawBrew(). */
export function enterTimer(recipeId) {
  if (state.run?.recipeId !== recipeId) return;
  batch = state.run.batch || 1;
  elapsed = (Date.now() - state.run.startedAt) / 1000;
  start({ resume: true });
  setStage("brewing");
}

export function initTimer() {
  // tap anywhere on the brewing screen to pause; the buttons handle resume and stop
  $("brewing").addEventListener("click", (e) => {
    if (isRunning() && !e.target.closest("button, a")) pause();
  });
  $("go").onclick = () => start();
  $("reset").onclick = reset;

  // The browser drops the wake lock when the page is hidden; take it again on return.
  document.addEventListener("visibilitychange", () => {
    if (isRunning() && !isLongBrew() && !document.hidden) holdScreenOn();
  });
}
