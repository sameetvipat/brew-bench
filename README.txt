Brew Bench
==========
Fixed, sourced recipes and a step timer. Tweak and save your own version per bean.

Run it
  python3 -m http.server      (in this folder)
  open http://localhost:8000

Browsers block loading the recipe files from a double-clicked index.html,
so it needs the local server above. The published claude.ai version syncs
the brew log to your account; locally it stays in this browser.

Files
  index.html          markup: setup, Brew tab (home, brewer, brew), Beans tab, Journal tab
  style.css           look: dark, native-app feel
  sw.js               shows step notifications when the screen is locked
  js/main.js          entry point: loads recipes, starts each part
  js/router.js        which screen shows, from the URL hash
  js/setup.js         setup: your name, then your brewers
  js/home.js          greeting and brewer cards
  js/journal.js       Journal tab: brews by day
  js/recipelist.js    one brewer's recipe cards
  js/brew.js          brew screen: get ready, rating, your version
  js/timer.js         timer, beeps, alerts, dial
  js/shelf.js         bean register and ratings
  js/log.js           saving brews
  js/state.js         what is saved on this device
  js/recipes.js       reads recipes/*.md, checks and scales them
  js/icons.js         brewer drawings and tab icons
  js/util.js          small helpers
  recipes/*.md        one recipe per file; format in recipes/README.md
  recipes/index.json  which recipes show, in order
