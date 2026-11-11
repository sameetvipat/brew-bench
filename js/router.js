/*
 * Screens by URL hash:
 *   ""             home
 *   #setup         change your name (forced as a welcome on first run)
 *   #welcome       the welcome again
 *   #beans         Beans tab: bean register
 *   #journal       Journal tab: your brews
 *   #aero-hoff     brew screen for one recipe
 */
import { state, session, findRecipe } from "./state.js";
import { $ } from "./util.js";
import { openBrew } from "./brew.js";
import { drawHome } from "./home.js";
import { drawSetup } from "./setup.js";
import { drawShelf } from "./shelf.js";
import { leaveTimer, enterTimer } from "./timer.js";
import { drawJournal } from "./journal.js";
import { icon } from "./icons.js";

const SCREENS = ["setup", "home", "brew", "beans", "journal"];
const TAB_FOR = { home: "home", beans: "beans", journal: "journal" }; // screens that show the bottom tabs

function screenFor(hash) {
  const name = hash.split("/")[0];
  if (!state.setupDone || name === "welcome") return { screen: "setup", fromStart: true };
  if (name === "setup") return { screen: "setup" };
  if (name === "beans") return { screen: "beans" };
  if (name === "journal" || name === "log") return { screen: "journal" };
  if (findRecipe(name)) return { screen: "brew", recipeId: name };
  return { screen: "home" };
}

export function route() {
  const { screen, recipeId, fromStart } = screenFor(decodeURIComponent(location.hash.slice(1)));

  leaveTimer();
  // a re-brew draft belongs to one recipe; drop it anywhere else
  if (session.draft && !(screen === "brew" && session.draft.key.startsWith(`${recipeId}|`))) session.draft = null;

  if (screen === "setup") drawSetup(fromStart);
  if (screen === "home") drawHome();
  if (screen === "beans") drawShelf();
  if (screen === "journal") drawJournal();
  if (screen === "brew") {
    openBrew(recipeId);
    enterTimer(recipeId);
  }

  for (const id of SCREENS) $(id).hidden = id !== screen;
  $("tabs").hidden = !TAB_FOR[screen];
  for (const tab of $("tabs").querySelectorAll("[data-tab]")) {
    if (tab.dataset.tab === TAB_FOR[screen]) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  }
  window.scrollTo(0, 0);
}

/** Open a recipe, even if it is already the current hash. */
export function navigateTo(recipeId) {
  if (location.hash === `#${recipeId}`) route();
  else location.hash = recipeId;
}

/** Back to home without adding a history entry. */
export function goHome() {
  history.replaceState(null, "", location.pathname + location.search);
  route();
}

export function initRouter() {
  window.addEventListener("hashchange", route);
  for (const name of ["tabBrew", "tabBeans", "tabLog"]) $(name).outerHTML = icon(name, "tab-ico");
}
