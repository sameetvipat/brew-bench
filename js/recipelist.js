/* One brewer's recipes as cards: the main ones, then "more recipes" folded away. */
import { BREWERS } from "./recipes.js";
import { state, session } from "./state.js";
import { $, esc, formatTime, plural } from "./util.js";
import { icon } from "./icons.js";
import { recipeFor } from "./brew.js";

export function drawRecipeList(brewer) {
  const all = session.recipes.filter((r) => r.brewer === brewer);
  const main = all.filter((r) => !r.extra);
  const more = all.filter((r) => r.extra);
  $("bArt").innerHTML = icon(brewer);
  $("bName").textContent = BREWERS[brewer];
  $("bCount").textContent = plural(main.length, "recipe");
  const card = (r) => recipeCard(recipeFor(r.id, state.bean, 1)); // cards show 1 cup
  $("recipeCards").innerHTML =
    main.map(card).join("") +
    (more.length ? `<details class="more"><summary>${plural(more.length, "more recipe")}</summary><div class="cards">${more.map(card).join("")}</div></details>` : "");
}

function recipeCard(r) {
  const tags = [];
  if (state.run?.recipeId === r.id) tags.push("brewing");
  if (r.tweaked) tags.push("yours");
  if (r.drink === "milk") tags.push("milk");
  if (r.served === "iced") tags.push("iced");


  return `
    <a class="rcard${state.recipeId === r.id ? " last" : ""}" href="#${r.id}">
      <div class="rcard-top">
        <b>${esc(r.name)}</b>
        <span class="tags">${tags.map((t) => `<span class="tag">${t}</span>`).join("")}</span>
      </div>
      <p class="src">${r.dose} g coffee to ${r.water} g${r.out ? " out" : ""}, ${formatTime(r.timeline.at(-1).at)}</p>
    </a>`;
}
