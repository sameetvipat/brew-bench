/* Brew tab (home): a greeting and "what are you brewing with today?" with your brewers. */
import { BREWERS } from "./recipes.js";
import { state, session, findRecipe } from "./state.js";
import { $, esc, greeting, clockTime, plural } from "./util.js";
import { icon } from "./icons.js";

export function drawHome() {
  const greet = $("greet");
  greet.textContent = greeting(state.name);
  greet.style.animation = "none"; // replay the fade each time you come home
  void greet.offsetWidth;
  greet.style.animation = "";

  drawRunningBanner();

  const lastBrewer = findRecipe(state.recipeId)?.brewer;
  $("brewerGrid").innerHTML = state.brewers
    .map((brewer) => {
      const count = session.recipes.filter((r) => r.brewer === brewer).length;
      const note = brewer === lastBrewer ? "last used" : plural(count, "recipe");
      return `<a class="brewer-card" href="#brewer/${brewer}">${icon(brewer)}<b>${BREWERS[brewer]}</b><span>${note}</span></a>`;
    })
    .join("");

}

/** A long brew (cold brew, kaapi) keeps running after you leave; show it on top. */
function drawRunningBanner() {
  const recipe = state.run && findRecipe(state.run.recipeId);
  $("running").hidden = !recipe;
  if (!recipe) return;
  $("running").href = `#${recipe.id}`;
  $("running").innerHTML = `Brewing ${esc(recipe.name)}, started ${clockTime(state.run.startedAt)}. Tap to open.`;
}
