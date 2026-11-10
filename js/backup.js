/*
 * Backup file: one JSON file with everything (name, brewers, your recipe versions, beans, journal).
 *
 * Automatic where the browser can write to a file you pick (Chrome on Android and desktop):
 * pick the file once, and every change rewrites it a moment later. The file handle is kept in
 * IndexedDB so it survives restarts; Chrome may ask once more for permission after a restart.
 *
 * Elsewhere (iPhone, Firefox): "Back up now" shares or downloads the file, with a nudge after a week.
 * "Restore" loads a backup file and replaces what's on this phone.
 */
import { $, clockTime, shortDate, plural } from "./util.js";
import { state, save, STORAGE_KEY } from "./state.js";
import { allEntries, LOG_KEY } from "./log.js";

const FILE_NAME = "brew-bench-backup.json";
const WAIT_MS = 1500; // write once things settle, not on every keystroke
const STALE_DAYS = 7;

export const canAutoBackup = "showSaveFilePicker" in window;

let handle = null; // the picked file, when automatic backup is on
let needsPermission = false; // Chrome wants an OK before writing again
let timer = null;

/* ---------- the file's contents ---------- */

function backupJson() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    // use what's in memory below
  }
  const data = { app: "brew-bench", version: 1, savedAt: new Date().toISOString(), state: { ...saved, lastBackup: undefined }, log: allEntries() };
  return JSON.stringify(data, null, 2);
}

/* ---------- remembering the picked file (IndexedDB holds file handles) ---------- */

function idb(mode, work) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("brew-bench", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("kv");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      try {
        const tx = open.result.transaction("kv", mode);
        const req = work(tx.objectStore("kv"));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
      } catch (e) {
        reject(e); // e.g. a handle that can't be stored: fail cleanly instead of hanging
      }
    };
  });
}
const loadHandle = () => idb("readonly", (s) => s.get("backupFile")).catch(() => null);
const storeHandle = (h) => idb("readwrite", (s) => s.put(h, "backupFile")).catch(() => {}); // keeps working this visit even if not stored

/* ---------- writing ---------- */

/** Write the backup file now. Pass fromTap when called from a button, so Chrome may ask for permission. */
async function writeFile(fromTap = false) {
  if (!handle) return false;
  try {
    let permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission === "prompt" && fromTap) permission = await handle.requestPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      needsPermission = true;
      drawBackup();
      return false;
    }
    const writable = await handle.createWritable();
    await writable.write(backupJson());
    await writable.close();
    needsPermission = false;
    state.lastBackup = Date.now();
    save(false); // false: this save shouldn't schedule another backup
    drawBackup();
    return true;
  } catch {
    needsPermission = true; // file moved, deleted, or permission lost: one tap fixes it
    drawBackup();
    return false;
  }
}

/** Something changed: rewrite the backup a moment later (automatic backup only). */
export function scheduleBackup() {
  if (!handle) return;
  clearTimeout(timer);
  timer = setTimeout(() => writeFile(), WAIT_MS);
}

/** Pick the backup file (once), then write it. */
async function chooseFile() {
  try {
    handle = await window.showSaveFilePicker({
      suggestedName: FILE_NAME,
      types: [{ description: "Brew Bench backup", accept: { "application/json": [".json"] } }],
    });
  } catch {
    return; // cancelled
  }
  await storeHandle(handle);
  await writeFile(true);
  drawBackupNudge();
}

/** Without automatic backup: share the file (phone share sheet), or download it. */
async function backUpNow() {
  if (handle) return writeFile(true);
  const file = new File([backupJson()], FILE_NAME, { type: "application/json" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Brew Bench backup" });
    } else {
      const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(file), download: FILE_NAME });
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    }
  } catch (e) {
    if (e.name === "AbortError") return; // closed the share sheet
    $("backupStatus").textContent = "Couldn't make the backup. Try again.";
    return;
  }
  state.lastBackup = Date.now();
  save(false);
  drawBackup();
  drawBackupNudge();
}

/* ---------- restoring ---------- */

let pendingRestore = null;

async function readRestoreFile(file) {
  pendingRestore = null;
  try {
    const data = JSON.parse(await file.text());
    if (data?.app !== "brew-bench" || typeof data.state !== "object" || !Array.isArray(data.log)) throw new Error("not a backup");
    pendingRestore = data;
    const bags = Array.isArray(data.state.beans) ? data.state.beans.length : 0;
    $("restoreMsg").innerHTML =
      `Replace everything on this phone with the backup from ${shortDate(Date.parse(data.savedAt))} ` +
      `(${plural(data.log.length, "brew")}, ${plural(bags, "bag")})? ` +
      `<button type="button" class="link" id="restoreYes">Replace</button> <button type="button" class="link" id="restoreNo">Cancel</button>`;
  } catch {
    $("restoreMsg").textContent = "That file isn't a Brew Bench backup.";
  }
}

function applyRestore() {
  if (!pendingRestore) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingRestore.state));
  localStorage.setItem(LOG_KEY, JSON.stringify(pendingRestore.log));
  location.hash = "";
  location.reload(); // start fresh from the restored data
}

/* ---------- drawing ---------- */

function daysSince(ts) {
  return ts ? Math.floor((Date.now() - ts) / 864e5) : Infinity;
}

/** The Backup box on the Journal tab. */
export function drawBackup() {
  const last = state.lastBackup;
  const lastText = last ? `${daysSince(last) === 0 ? "today" : shortDate(last)}, ${clockTime(last)}` : "";

  let status;
  if (handle && needsPermission) status = "Backup is paused: Chrome needs your OK to keep writing to the file.";
  else if (handle) status = `Automatic backup is on. Last saved ${lastText || "just now"}.`;
  else if (canAutoBackup) status = "Not backed up yet. Choose a file once, and it updates itself after every change.";
  else status = last ? `Last backup ${lastText}.` : "Not backed up yet.";
  $("backupStatus").textContent = status;

  $("backupPick").hidden = !canAutoBackup || (Boolean(handle) && !needsPermission);
  $("backupPick").textContent = handle ? "Allow backup" : "Choose backup file";
  $("backupNow").hidden = canAutoBackup && !handle;
}

/** After saving a brew: offer automatic backup once, or nudge when the last manual backup is old. */
export function drawBackupNudge() {
  let html = "";
  if (canAutoBackup && !handle && !state.backupAsked) {
    html = `Keep a backup file that updates itself? <button type="button" class="link" data-backup="pick">Choose a file</button> <button type="button" class="link" data-backup="later">Not now</button>`;
  } else if (handle && needsPermission) {
    html = `Backup is paused. <button type="button" class="link" data-backup="allow">Allow it</button>`;
  } else if (!canAutoBackup && daysSince(state.lastBackup) >= STALE_DAYS) {
    html = `${state.lastBackup ? "Your last backup is over a week old." : "You haven't backed up yet."} <button type="button" class="link" data-backup="now">Back up now</button>`;
  }
  $("backupNudge").innerHTML = html;
  $("backupNudge").hidden = !html;
}

/* ---------- setup ---------- */

export async function initBackup() {
  handle = canAutoBackup ? await loadHandle() : null;
  if (handle) {
    needsPermission = (await handle.queryPermission({ mode: "readwrite" }).catch(() => "denied")) !== "granted";
  }

  $("backupPick").onclick = () => (handle ? writeFile(true) : chooseFile());
  $("backupNow").onclick = backUpNow;
  $("restoreFile").onchange = (e) => {
    if (e.target.files[0]) readRestoreFile(e.target.files[0]);
    e.target.value = ""; // the same file can be picked again
  };
  $("restoreMsg").onclick = (e) => {
    if (e.target.id === "restoreYes") applyRestore();
    if (e.target.id === "restoreNo") {
      pendingRestore = null;
      $("restoreMsg").textContent = "";
    }
  };
  $("backupNudge").onclick = (e) => {
    const action = e.target.dataset.backup;
    if (action === "pick") chooseFile();
    if (action === "allow") writeFile(true).then(drawBackupNudge);
    if (action === "now") backUpNow();
    if (action === "later") {
      state.backupAsked = true;
      save(false);
      drawBackupNudge();
    }
  };
  drawBackup();
}
