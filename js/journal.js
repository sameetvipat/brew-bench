/* Journal tab: your brews grouped by day, newest first. Tap "Again" to brew one with the same numbers. */
import { $, esc, dayKey, clockTime, formatTemp } from "./util.js";
import { findRecipe } from "./state.js";
import { allEntries, rebrew, deleteEntry } from "./log.js";
import { TASTES } from "./brew.js";

let confirmingId = null; // entry waiting for a second tap on "Delete"

/** "Today", "Yesterday", or "Tuesday, 10 November". */
function dayLabel(key) {
  const today = dayKey(Date.now());
  const yesterday = dayKey(Date.now() - 864e5);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return new Date(`${key}T12:00`).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
}

export function drawJournal() {
  const entries = allEntries();
  if (!entries.length) {
    $("journalList").innerHTML = `<p class="empty">No brews yet. Your first one shows up here.</p>`;
    return;
  }

  const days = new Map(); // dayKey -> entries, newest first (entries already are)
  for (const e of entries) {
    const key = dayKey(e.ts);
    if (!days.has(key)) days.set(key, []);
    days.get(key).push(e);
  }

  $("journalList").innerHTML = [...days]
    .map(([key, list]) => `<h3>${dayLabel(key)}</h3><ul class="rows">${list.map(entryRow).join("")}</ul>`)
    .join("");
}

function entryRow(e) {
  // older entries used beans/notes/tastes/coffee and text temperatures
  const bean = e.bean || e.beans;
  const note = e.note || e.notes;
  const taste = e.taste ? TASTES[e.taste] : (e.tastes || []).join(", ");
  const temp = typeof e.temp === "string" ? e.temp : formatTemp(e.temp);

  const details = [`${e.dose ?? e.coffee} g to ${e.water} g`, temp];
  if (e.cups > 1) details.push(`${e.cups} cups`);
  if (bean) details.push(bean);

  const again = findRecipe(e.rid) ? `<button type="button" class="btn small" data-load="${esc(e.id)}">Again</button>` : "";
  const label = confirmingId === e.id ? "Sure? Delete" : "Delete";

  return `
    <li>
      <div class="row-top"><b>${esc(e.name || "Older brew")}</b><span class="muted small">${clockTime(e.ts)}</span></div>
      <span class="muted small">${esc(details.join(", "))}${taste ? `. ${esc(taste)}` : ""}</span>
      ${note ? `<div class="notes">${esc(note)}</div>` : ""}
      <div class="btns">${again}<button type="button" class="btn small danger" data-del="${esc(e.id)}">${label}</button></div>
    </li>`;
}

export function initJournal() {
  $("journalList").onclick = (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    if (button.dataset.load) return rebrew(button.dataset.load);
    if (!button.dataset.del) return;
    if (confirmingId === button.dataset.del) {
      confirmingId = null;
      deleteEntry(button.dataset.del);
    } else {
      confirmingId = button.dataset.del;
      drawJournal();
    }
  };
}
