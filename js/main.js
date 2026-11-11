/* Entry point: load the recipes, wire up each screen, then show the right one. */
import { loadRecipes } from "./recipes.js";
import { state, session, dropStaleRun } from "./state.js";
import { esc } from "./util.js";
import { initSetup } from "./setup.js";
import { initJournal } from "./journal.js";
import { initBrew } from "./brew.js";
import { initTimer } from "./timer.js";
import { initShelf } from "./shelf.js";
import { initLog } from "./log.js";
import { initBackup } from "./backup.js";
import { initRouter, route } from "./router.js";

try {
  session.recipes = [...(await loadRecipes()), ...state.myRecipes]; // the same objects, so edits to yours save in place
} catch (e) {
  document
    .querySelector(".app")
    .insertAdjacentHTML("afterbegin", `<p class="card-box">Couldn't load recipes: ${esc(e.message)}. Serve this folder over http, see README.</p>`);
  throw e;
}
dropStaleRun();

initSetup();
initJournal();
initShelf();
initBrew();
initTimer();
initLog();
initBackup();
initRouter();

route();

// offline copy of the app and step notifications; fine to fail (e.g. inside a sandboxed frame)
navigator.serviceWorker?.register("sw.js").catch(() => {});

// Ask the browser to never clear this app's data to free up space. Installed apps get a yes.
navigator.storage?.persist?.().catch(() => {});
