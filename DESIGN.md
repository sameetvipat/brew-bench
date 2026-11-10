# Brew Bench: guide, design and plan

## 1. Why this exists

While brewing, you switch between Claude and a clock to remember the recipe, the bloom time and the measurements. Afterwards you want to remember how the cup tasted, so the next one is better. It's for you alone. You brew on an Android phone, and your data stays with you: on the phone, plus a backup file.

**The job, in one line:** with wet hands and a hot kettle, tell me exactly what to do next and when. Afterwards, let me note how it tasted in a few seconds.

Everything in the app has to serve that job. Anything that doesn't gets removed.

## 2. What went wrong

The current build answers every request by adding something, so every screen asks for attention:

| Too much | Example |
|---|---|
| Questions | The 9-step setup asks about drinks, temperature, grinder, cups and alerts before you have brewed once. |
| Recipes | 19 recipes, many for brewers you don't own. |
| Numbers | Ratio, source, days off roast and batch notes all compete with the one number you need. |
| Controls | Steppers, cups, bean picker, adjust, share, reset, past brews and log all sit on the same screen. |
| Places | Home, brewer, recipe, three brew stages, beans, log and settings. |

Brewing is a ritual, not a task. The app should feel like a calm, good tool on the counter, not like a dashboard.

## 3. Principles

1. **One thing at a time.** Each screen has one question or one action. If a screen needs a second button, ask whether it needs a second screen.
2. **The brew screen is the product.** Everything else exists to get you there or to remember what happened. Spend most of the craft there.
3. **Big numbers, few words.** "Pour to **120 g**" in large type beats a sentence. Read it from a metre away, with a glance.
4. **Fewer, better recipes.** Each brewer gets a house recipe and at most two others, each sourced and tested. More recipes live one tap away, never on the main path.
5. **Ask only when it matters.** No questions up front that a sensible default can answer. Ask for alerts the first time a brew is long, not during setup.
6. **Logging takes three seconds.** One tap for how it was. Details only if something was off.
7. **Crafted, not decorated.** Warmth comes from timing, motion, sound and type, not from ornaments. One accent colour. Every animation has a reason (water rising, a step settling in).
8. **Yours, private.** It's a web app installed on your phone's home screen. It works offline, and your data stays on the phone with a backup file you own.

## 4. The experience

There are three tabs: **Today**, **Journal** and **Beans**. There is no settings tab; your name and brewers live behind your greeting.

### First open: two steps, not nine

```
┌───────────────────────┐   ┌───────────────────────┐
│                       │   │ What do you brew with?│
│   Brew Bench          │   │                       │
│                       │   │ [AeroPress] [V60]     │
│   Your recipe and     │   │ [Muslin]   [Filter]   │
│   timer for the       │   │ [Channi]   [French p.]│
│   brewers you own.    │   │ [Espresso]            │
│                       │   │                       │
│   Your name ____      │   │                       │
│                       │   │                       │
│   [ Continue ]        │   │   [ Start brewing ]   │
└───────────────────────┘   └───────────────────────┘
```

### Today

```
┌───────────────────────┐
│ Good morning, Sameet  │
│                       │
│ ┌───────────────────┐ │   <- last brew, one tap to repeat
│ │ Again?            │ │
│ │ Hoffmann AeroPress│ │
│ │ Yesterday, loved  │ │
│ └───────────────────┘ │
│                       │
│ [AeroPress] [Muslin]  │   <- your brewers, big
│ [Filter]              │
│                       │
│ Today  Journal  Beans │
└───────────────────────┘
```

Tapping a brewer shows its 1–3 recipes as large cards: the name, one line on what the cup tastes like, and the time. "More recipes" sits at the bottom.

### Get ready: a checklist, not a dashboard

```
┌───────────────────────┐
│ ‹ AeroPress           │
│ Hoffmann AeroPress    │
│ Clean, sweet, 3 min   │
│                       │
│ Cups      − 1 +       │
│                       │
│ ○ 11 g coffee,        │   <- tap each as you gather it
│   medium-fine         │
│ ○ 200 g water, 99°C   │
│ ○ Rinse the filter    │
│                       │
│ Bean: Blue Tokai ▾    │
│                       │
│ [   I'm ready   ]     │
└───────────────────────┘
```

The checklist ticks off with a soft haptic. It stops you starting the timer before the kettle is hot.

### Brew: the heart of the app

```
┌───────────────────────┐
│ Step 2 of 4      0:52 │
│                       │
│                       │
│      Pour to          │
│      200 g            │   <- the one number, huge
│                       │
│  ━━━━━━━━━━━░░░░░░    │   <- fills until the next step
│      next in 0:23     │
│                       │
│  Then: swirl gently   │
│                       │
│                       │
│  tap anywhere to pause│
└───────────────────────┘
```

- **One step card at a time.** It slides up as the next step begins, with a soft chime and a buzz (where the phone allows).
- **Counts down to the next step, not up from zero.** That countdown is what you were using a clock for.
- **The screen stays awake.** Tap anywhere to pause. Pausing shows Resume and Stop.
- **Batches:** "Batch 1 of 2". Between batches it shows "Empty and rinse", then "Start batch 2".

### How was it?

```
┌───────────────────────┐
│ How was it?           │
│                       │
│  [Loved it]           │
│  [Fine]               │
│  [Something's off]    │   <- only this asks more:
│                       │      sour / bitter / weak / strong
│                       │      then one suggestion:
│                       │      "Try 1 g more coffee"
│ Add a note            │      [Use it next time]
│                       │
│ [ Save ]   skip       │
└───────────────────────┘
```

The coffee used comes out of the bean bag automatically. The screen ends with a quiet line, like "Your 12th AeroPress".

### Journal

Brews are listed by day: recipe, bean, how it was, the note. Tap one to brew it again. Filter by brewer or bean. A small month strip at the top shows brew days. It replaces the full calendar grid.

### Beans

One card per bag. It has a freshness bar (days off roast), a grams-left bar and your rating. "Add a bag" is a single short form. A bag running low says so on Today.

## 5. Look and feel

- **Mood:** an early-morning kitchen. Warm dark background, one crema accent, generous space.
- **Type:** one system sans. Numbers are large and tabular. Step amounts are the biggest thing on any screen.
- **Motion:** step cards slide up. The progress bar fills like water. Nothing bounces, and every animation respects "reduce motion".
- **Sound and touch:** a soft two-note chime instead of beeps, and a short buzz at each step.
- **Brewer drawings:** line drawings for brewers only. They match in stroke and weight, and are drawn once with care.
- **Words:** short and kind. "Pour to 200 g." "Nice. Same again tomorrow?" No jargon on the main path.

## 6. What stays, changes and goes

| Keep | Change | Remove |
|---|---|---|
| Sourced recipes in `recipes/*.md` | Recipes: 1–3 per brewer on the main path, the rest under "More" | The drinks, served, grinder, cups and alerts setup questions |
| Cups and batches | Timer: one step card that counts down to the next step | The dial with tick marks, the stat tiles, the ratio line, the source line on the main path |
| Your version per recipe and bean | Taste: Loved / Fine / Off, with detail only for Off | "Adjust recipe" steppers (your version comes from taste suggestions; one small "Edit numbers" stays in recipe info) |
| Bean register and ratings | Log: Journal list with a month strip | The full calendar grid, "Past brews" on the brew screen |
| Your data on your phone | Setup: name and brewers only | The Settings tab (moves behind the greeting) |

Only your brewers show (AeroPress, muslin cloth, South Indian filter). The other recipe files stay in `recipes/`, but they only appear if you add that brewer.

## 7. Where the app and your data live

- **The app: GitHub Pages** (free, HTTPS). On Android: "Install app" in Chrome. On iPhone: Share, then "Add to Home Screen" in Safari. Either way it opens from the home screen and runs offline. The code and recipes are public, which is harmless; nobody's data ever goes to the web.
- **Data: only on the phone**, in the app's own storage. It's there every time the app opens, survives app updates, and nothing has to be loaded. The app asks the browser to keep it permanently. iPhone: apps added to the Home Screen are exempt from Safari's 7-day clean-up.
- **One backup file holds everything** as readable JSON: your name and brewers, your versions of recipes, beans and the full journal. The format is the same on every phone, so it also moves you between phones.
- **How the backup is written depends on what the browser can do.** The app checks for itself (`'showSaveFilePicker' in window`) and never asks what device you have.
  - **Android (Chrome):** automatic. You pick the file once (Downloads or a Drive folder), and every log and bean change rewrites it. If Chrome asks again for permission after a restart, it asks during your Save tap. If writing fails, the brew is still saved, and a quiet "Backup not updated" line offers a fix.
  - **iPhone, or any browser without file writing:** a one-tap "Back up" opens the share sheet to save the file to Files or iCloud Drive, with a reminder when the last backup is over a week old.
- **Restore from backup** loads the file on a new phone or after clearing data.
- **What erases data:** only clearing the browser's data for the site, or removing the app. The backup covers both. The app's address must never change, because the data belongs to that address.
- **Moving off claude.ai's database:** what you've already logged gets imported once.
- **No accounts, no servers, no login.**
- **iPhone limits:** no buzz, because iPhone browsers can't vibrate; the chime carries it. The screen stays on while brewing on iOS 16.4 and later.

## 8. Plan

Each phase is one working session and ends with something you can use on your phone. The app goes on your phone early, so every later phase is tested where you actually brew.

| # | Phase | What | Done when |
|---|---|---|---|
| 0 | Cut | Two-step setup (name, brewers). Remove drinks, served, grinder, cups and alerts questions, stat tiles, adjust steppers, calendar grid, past brews, settings tab. Main-path recipes: AeroPress (Hoffmann, Adler with milk, Iced), muslin (steep, cold brew), filter (kaapi, iced kaapi). | The app does less, and nothing you use daily is missing. |
| 1 | On your phone | Git repo, GitHub Pages, web app manifest, offline caching, ask the browser to keep data permanently. | It's on your Android home screen and opens offline; a quick check on an iPhone too. |
| 2 | Brew screen | One step card counting down to the next step, huge amounts, chime and buzz, screen kept awake, tap to pause, batches. | You brew a full AeroPress without touching the phone after Start. |
| 3 | Get ready + taste | Checklist screen. Loved / Fine / Off with one suggestion. Coffee deducted from the bag. | Logging a brew takes under 5 seconds. |
| 4 | Backup file | Automatic on Android (pick once, rewritten on every change); one-tap Back up with a weekly reminder elsewhere; restore from file; import the old log. | You clear the browser's data, restore, and everything is back. |
| 5 | Today, Journal, Beans | Last brew to repeat, Journal list with a month strip, bean cards with freshness and grams-left bars, low-bag nudge. | "What did I brew Tuesday and how was it" takes two taps. |
| 6 | Craft | Chime sound, transitions, empty states, every word on every screen, a final pass on the drawings. | You'd show it to someone without explaining anything. |

**Your part:** a GitHub account before phase 1, then trying each phase on your phone with real brews and telling me what feels off.

## 9. How we decide later

When a new idea comes up, ask:

1. Does it help in the moment of brewing, or in remembering how it went?
2. Can it be a sensible default instead of a question?
3. Does it add something to a screen? Then what does it replace?

If the answers are no, no and nothing, it doesn't go in.
