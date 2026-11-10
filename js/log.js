/* Brew log: saving brews and the entries behind the Journal tab. Kept on this phone (localStorage). */
import { $, newId } from "./util.js";
import { state, session, save, tweakKey, CUP_CHOICES } from "./state.js";
import { clearTaste } from "./brew.js";
import { useCoffee } from "./shelf.js";
import { drawJournal } from "./journal.js";
import { navigateTo } from "./router.js";
import { scheduleBackup, drawBackupNudge } from "./backup.js";

export const LOG_KEY = "brew-bench-log";
const MAX_NOTE = 2000;

let entries = []; // newest first

function readLocal() {
  try {
    const list = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(list));
    scheduleBackup();
    return true;
  } catch {
    return false;
  }
}

/** All entries, newest first (for the journal and the backup). */
export const allEntries = () => entries;

/* ---------- actions ---------- */

/** Open a logged brew with its exact numbers, as a draft that doesn't overwrite your saved version. */
export function rebrew(id) {
  const entry = entries.find((e) => e.id === id);
  if (!entry) return;
  const cups = CUP_CHOICES.includes(entry.cups) ? entry.cups : 1;
  state.bean = entry.bean || "";
  state.cups = cups;
  save();
  session.draft = {
    key: tweakKey(entry.rid, state.bean),
    tweak: { dose: entry.dose / cups, water: entry.water / cups, temp: entry.temp, grind: entry.grind, shift: entry.shift || 0 },
  };
  navigateTo(entry.rid);
}

export function deleteEntry(id) {
  entries = entries.filter((e) => e.id !== id);
  if (!writeLocal(entries)) $("logStatus").textContent = "Couldn't delete. Try again.";
  drawJournal();
}

function logBrew() {
  const r = session.current;
  const entry = {
    id: newId("l"),
    ts: Date.now(),
    rid: r.id,
    name: r.name,
    cups: r.cups,
    dose: r.dose,
    water: r.water,
    temp: r.temp,
    grind: r.grind,
    shift: r.shift,
    bean: state.bean,
    taste: session.taste === "off" ? null : session.taste, // "off" without a reason isn't worth keeping
    note: $("note").value.slice(0, MAX_NOTE),
  };

  const list = [entry, ...entries];
  if (!writeLocal(list)) {
    $("saveMsg").textContent = "Couldn't save: this phone's storage for the app is full.";
    return;
  }
  entries = list;
  drawJournal();

  const count = entries.filter((e) => e.rid === r.id).length;
  const bag = useCoffee(r.dose);
  clearTaste();
  $("note").value = "";
  $("saveRow").hidden = true;
  $("afterSave").hidden = false;
  $("saveMsg").textContent = `Your ${ordinalNumber(count)} ${r.name}.${bag ? ` ${Math.round(bag.left)} g left in the bag.` : ""}`;
  drawBackupNudge();
}

/** 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st... */
function ordinalNumber(n) {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suffix}`;
}

/* ---------- setup ---------- */

export function initLog() {
  $("save").onclick = logBrew;
  entries = readLocal();
  drawJournal();
}
