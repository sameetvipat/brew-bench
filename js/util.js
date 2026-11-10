/* Small DOM and formatting helpers shared by every screen. */

export const $ = (id) => document.getElementById(id);

/** Escape text before putting it inside HTML. */
export function esc(text) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  return String(text ?? "").replace(/[&<>"]/g, (c) => entities[c]);
}

/** Seconds as m:ss, or h:mm:ss for long brews. */
export function formatTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = String(s % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
}

/** Water temperature as shown to the user. null means a cold brew. */
export function formatTemp(temp) {
  if (temp == null) return "cold";
  return temp >= 100 ? "boiling" : `${temp}°C`;
}

/** "+15" / "-2": a signed number for "what changed" labels. */
export const signed = (n) => `${n > 0 ? "+" : ""}${n}`;

export const shortDate = (ts) => new Date(ts).toLocaleDateString([], { day: "numeric", month: "short" });

/** An id that stays unique even for two saves in the same millisecond. */
export const newId = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Local calendar day "2026-11-11" for a timestamp (en-CA formats dates as YYYY-MM-DD). */
export const dayKey = (ts) => new Date(ts).toLocaleDateString("en-CA");

export const clockTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** "Good morning, Sameet" and friends, from the hour on this device. */
export function greeting(name = "", hour = new Date().getHours()) {
  const to = name ? `, ${name}` : "";
  if (hour >= 5 && hour < 12) return `Good morning${to}`;
  if (hour >= 12 && hour < 17) return `Good afternoon${to}`;
  if (hour >= 17 && hour < 22) return `Good evening${to}`;
  return `Late night brew${to}?`;
}

/** "1 recipe", "4 recipes" */
export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
