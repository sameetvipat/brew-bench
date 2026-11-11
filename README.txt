Brew Bench
==========
AeroPress recipes, a step timer, a journal and a bean register. Tweak and save your own version per bean.

Run it
  python3 -m http.server      (in this folder)
  open http://localhost:8000

Browsers block loading the recipe files from a double-clicked index.html,
so it needs the local server above. Live version:
https://sameetvipat.github.io/brew-bench/

Your data stays on your phone. The backup file (Journal tab) holds all of it.

Files
  index.html          markup: setup, Brew tab (home, brew), Beans tab, Journal tab
  style.css           look: dark, native-app feel
  sw.js               offline copy of the app
  js/main.js          entry point: loads recipes, starts each part
  js/router.js        which screen shows, from the URL hash
  js/setup.js         welcome and your name
  js/home.js          greeting and recipe cards
  js/journal.js       Journal tab: brews by day
  js/recipelist.js    one brewer's recipe cards
  js/brew.js          brew screen: get ready, rating, your version
  js/timer.js         timer, beeps, alerts, dial
  js/shelf.js         bean register and ratings
  js/log.js           saving brews
  js/backup.js        backup file: automatic in Chrome, share/download elsewhere; restore
  js/state.js         what is saved on this device
  js/recipes.js       reads recipes/*.md, checks and scales them
  js/icons.js         AeroPress drawing and tab icons
  js/util.js          small helpers
  recipes/*.md        one recipe per file; format in recipes/README.md
  recipes/index.json  which recipes show, in order
