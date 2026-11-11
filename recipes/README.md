# Recipe format

Each AeroPress recipe is one `.md` file in this folder. Add its filename to `index.json` to show it in the app; the order in `index.json` is the order on the home screen.

Before adding a recipe, check it against its source. If no published standard exists, say so in `src`.

```md
---
id: aero-hoff                # unique, used in the URL (#aero-hoff)
drink: black                 # black | milk   (shows a "milk" tag)
served: hot                  # hot | iced     (shows an "iced" tag)
name: Hoffmann AeroPress
src: James Hoffmann, Ultimate AeroPress
dose: 11                     # grams of coffee for 1 cup
water: 200                   # grams of water for 1 cup
temp: 99                     # °C, 100 = just boiled
grind: Medium-fine
# optional:
# top: 120   (grams of water or milk added after pressing, for 1 cup)
# ice: 100   (grams of ice for 1 cup)
---

## Steps

- 0:00 Pour to {water} g. Plunger in 1 cm to stop drips.
- 2:00 Swirl gently.
```

## Rules

- A step is a line starting `- m:ss` followed by the text. Other lines are ignored, so you can add notes.
- The first step must be at `0:00`, and step times must go up.
- Amounts are placeholders that scale with cups and your tweaks: `{dose}`, `{water}`, `{ice}`, `{top}`, optionally followed by `*n` or `/n`, for example `{water*0.6}`.
- "Steep longer or shorter" tweaks move every step after the first.
