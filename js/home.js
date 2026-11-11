/* Brew tab (home): a greeting and your AeroPress recipes as cards. */
import { state, session, findRecipe } from "./state.js";
import { $, esc, greeting, clockTime, formatTime } from "./util.js";
import { recipeFor } from "./brew.js";

export function drawHome() {
  const greet = $("greet");
  greet.textContent = greeting(state.name);
  greet.style.animation = "none"; // replay the fade each time you come home
  void greet.offsetWidth;
  greet.style.animation = "";

  drawRunningBanner();
  $("recipeCards").innerHTML = session.recipes.map((r) => recipeCard(recipeFor(r.id, state.bean, 1))).join(""); // cards show 1 cup
}

function recipeCard(r) {
  const tags = [];
  if (state.run?.recipeId === r.id) tags.push("brewing");
  if (r.mine) tags.push("mine");
  else if (r.tweaked) tags.push("yours");
  if (r.drink === "milk") tags.push("milk");
  if (r.served === "iced") tags.push("iced");

  return `
    <a class="rcard${state.recipeId === r.id ? " last" : ""}" href="#${r.id}">
      <div class="rcard-top">
        <b>${esc(r.name)}</b>
        <span class="tags">${tags.map((t) => `<span class="tag">${t}</span>`).join("")}</span>
      </div>
      <p class="src">${r.dose} g coffee to ${r.water} g, ${formatTime(r.timeline.at(-1).at)}</p>
    </a>`;
}

/** If you left during a brew, it keeps running; show it on top. */
function drawRunningBanner() {
  const recipe = state.run && findRecipe(state.run.recipeId);
  $("running").hidden = !recipe;
  if (!recipe) return;
  $("running").href = `#${recipe.id}`;
  $("running").innerHTML = `Brewing ${esc(recipe.name)}, started ${clockTime(state.run.startedAt)}. Tap to open.`;
}
