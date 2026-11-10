/*
 * Brew log: saving brews and the entries behind the Journal tab.
 * When published on claude.ai the log syncs to your account; otherwise it stays in this browser.
 */
import { $, newId } from "./util.js";
import { state, session, save, tweakKey, findRecipe, CUP_CHOICES } from "./state.js";
import { TASTES, clearTaste } from "./brew.js";
import { useCoffee } from "./shelf.js";
import { drawJournal } from "./journal.js";
import { navigateTo } from "./router.js";

const LOCAL_KEY = "brew-bench-log";
const MAX_NOTE = 2000;

let entries = []; // newest first
let cloud = null; // claude.ai db collection, when available

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** Per-cup value of a log entry (entries store totals plus cups). */
const perCup = (entry, key) => +(entry[key] / (entry.cups || 1)).toFixed(1);

/** All entries, newest first (for the journal). */
export const allEntries = () => entries;

/** Entries changed: redraw the journal. */
function drawLog() {
  drawJournal();
}

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

export async function deleteEntry(id) {
  try {
    if (cloud) return await cloud.doc(id).delete(); // the snapshot listener redraws
    entries = readLocal().filter((e) => e.id !== id);
    writeLocal(entries);
    drawLog();
  } catch {
    $("logStatus").textContent = "Couldn't delete. Try again.";
  }
}

async function logBrew() {
  const r = session.current;
  const entry = {
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

  $("save").disabled = true;
  try {
    if (cloud) {
      await cloud.add(entry);
    } else {
      const list = [{ ...entry, id: newId("l") }, ...readLocal()];
      if (!writeLocal(list)) throw new Error("local storage full");
      entries = list;
      drawLog();
    }
    const count = entries.filter((e) => e.rid === r.id).length + (cloud ? 1 : 0); // local list already has it
    const bag = useCoffee(r.dose);
    clearTaste();
    $("note").value = "";
    $("saveRow").hidden = true;
    $("afterSave").hidden = false;
    $("saveMsg").textContent = `Your ${ordinalNumber(count)} ${r.name}.${bag ? ` ${Math.round(bag.left)} g left in the bag.` : ""}`;
  } catch (err) {
    $("saveMsg").textContent = err?.code === "quota_exceeded" ? "Log full. Delete old entries." : "Couldn't save. Try again.";
  } finally {
    $("save").disabled = false;
  }
}

/** 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st... */
function ordinalNumber(n) {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
  return `${n}${suffix}`;
}

/* ---------- setup ---------- */

export function initLog() {
  $("save").onclick = logBrew;
}

function useLocal() {
  cloud = null;
  entries = readLocal();
  $("logStatus").textContent = "Your log is saved on this device.";
  drawLog();
}

/** Show the local log right away, then switch to the account log when running on claude.ai. */
export async function startSync() {
  entries = readLocal();
  drawLog();
  if (!window.claude?.use) return useLocal();

  try {
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    const uid = user ? await user.id() : null;
    if (!db || !uid) return useLocal();

    cloud = db.doc(`data/users/${uid}/log`).collection("brews");
    cloud
      .orderBy("ts", "desc")
      .limit(200)
      .onSnapshot((snap) => {
        entries = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        if (!snap.metadata.fromCache) $("logStatus").textContent = "Your log is synced to your account.";
        drawLog();
      }, useLocal);
  } catch {
    useLocal();
  }
}
