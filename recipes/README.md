# Recipe format

Each recipe is one `.md` file in this folder. Add its filename to `index.json` to show it in the app; the order in `index.json` is the order in the menu.

Before adding a recipe, check it against its source. If no published standard exists, say so in `src`.

```md
---
id: v60-tetsu                # unique, used in the URL (#v60-tetsu)
brewer: v60                  # aero | cloth | filter | v60 | esp | channi
kind: perc                   # imm | perc | esp | filter | cold
drink: black                 # black | milk
served: hot                  # hot | iced   (setup preferences sort by drink and served)
name: Tetsu Kasuya 4:6
src: Tetsu Kasuya, World Brewers Cup 2016, via Hario
dose: 20                     # grams of coffee for 1 cup
water: 300                   # grams of water for 1 cup (espresso: grams out)
temp: 92                     # °C, 100 = boiling, "cold" = no heat
grind: Coarse
# optional:
# milk: 200     ice: 100     top: 120     (grams for 1 cup, scaled with the dose)
# retain: 1.5   (grams of water the grounds hold back per gram of coffee; sets {brew})
# out: true     (espresso: "water" is grams in the cup)
# extra: true   (not on the main list: shown under "more recipes")
---

## Steps

- 0:00 Pour to {water*50/300} g.
- 0:45 Pour to {water*0.4} g.
```

## Rules

- A step is a line starting `- m:ss` (or `- h:mm:ss`) followed by the text. Other lines are ignored, so you can add notes.
- The first step must be at `0:00`, and step times must go up.
- Amounts are placeholders that scale with cups and your tweaks: `{dose}`, `{water}`, `{milk}`, `{ice}`, `{top}`, `{brew}`, optionally followed by `*n` or `/n`, for example `{water*0.6}` or `{dose*2}`.
- `kind: imm` (immersion) recipes get the "steep longer or shorter" tweak, which moves every step after the first.
