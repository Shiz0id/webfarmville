# 🌻 Meadowbrook Farm

A cozy isometric farming game for the browser, in the spirit of classic social farm games and Animal Crossing.
Plow and plant, raise animals, grow an orchard, craft goods in workshops, decorate with 150+ wholesome
decorations (including seasonal holiday sets), and visit your neighbors to help out and send gifts.

All of the art is drawn in code at startup, so there are no image assets to download or license.

## Features

- **Crops**: 16 crops plus 16 seasonal specials, from 1-minute strawberries to 12-hour cranberries. Crops grow in
  real time (even while you're offline) and wither if left too long. Drag across a field to plant or harvest it
  all.
- **Animals & trees**: 8 animals and 8 fruit trees that produce on a cycle. Animals blink, swish their tails and
  hop around.
- **Crafting**: 7 workshops with 30 recipes and queued production slots.
- **Cooking mini-games** in the spirit of Cooking Mama. Chop, stir, crack eggs, whisk, knead, flip and mind the
  heat to turn farm ingredients into 15 home-cooked dishes. Cook perfectly and you make two.
- **Mama Marigold**: a jolly bear who strolls onto your farm each day to brag about her garden and bring you a
  home-cooked meal. You can visit her kitchen garden too.
- **Villager order board**: deliver produce, goods and dishes to the villagers for bonus coins and thank-you
  decorations.
- **Mystery gifts**: surprise presents that drop while you farm and unwrap into decorations.
- **About 320 decorations** in six collections:
  - *core*: flowers, plants, fences, paths, furniture, lights, water and whimsy
  - *holiday lifestyle*
  - *Gardening Mama-style horticulture*
  - *Halloween Spooktacular*
  - *Countryside nostalgia*: red barn, tractor, treehouse and a playground
  - *Festivals & parties*

  Windmills spin, flames flicker, fountains splash, ghosts float and trees sway. A **Decor Catalog** tracks
  everything you've collected.
- **15 seasonal events**: Lunar New Year, Valentine's Day, St. Patrick's Day, Cherry Blossom Viewing, the
  Spring Egg Hunt, Earth Day, the Summer Festival, the Star Festival, the Mid-Autumn Moon Festival, the Harvest
  Festival, Halloween, the Festival of Lights, Thanksgiving, the Winter Holidays and New Year. Each one has:
  - its own **currency** that drops while you farm, and a **token shop** of exclusives
  - an event crop and costumed **visitors** (trick-or-treaters, carolers, lion dancers, egg hunters and more)
  - animals in **costumes**
  - a quest chain
  - its own music-box tune, particles, lighting and title screen
- **Villagers**: Mayor Maple, Henrietta, Penny, Rosie, Grandma Fern and Mama Marigold, each with a painted
  portrait, quests and a themed farm you can visit and help.
- **Ribbons**: FarmVille-style yellow, white, red and blue ribbons for lifetime milestones.
- **Coziness**:
  - A procedural music box and synthesized sound effects (no audio files).
  - Day/night lighting from your local clock, with glowing lamps and fireflies.
  - Seasonal weather and grass, drifting clouds and butterflies, and a puppy and kitten who wander your farm.
  - Coins that fly to your HUD, and farm postcards you can save.
- **Progression**: 50 levels, land expansions from 14×14 up to 30×30, a daily bonus and a charm rating.
- **Neighbors**: visit friends' farms and fertilize, revive, water or feed them (5 helps per neighbor per day),
  send daily gifts, and read the farm-news feed.
- **Server-authoritative**: the same rules run on the client for instant feedback and on the server to validate
  them, with seeded randomness so both sides always agree.

## Tech

| Package   | What                                                                                |
| --------- | ----------------------------------------------------------------------------------- |
| `shared/` | Game content and rules (a pure reducer), used by both client and server             |
| `server/` | Express 5 + Node's built-in SQLite (`node:sqlite`): accounts, farms, neighbors, gifts |
| `client/` | Phaser 3 + Vite + TypeScript, with a DOM overlay for the UI                         |

Requires **Node 22.13+**. Node's built-in SQLite prints an "experimental" warning, which is harmless.

## Getting started

```bash
npm install
npm run dev          # server on :3001, client on http://localhost:5173
```

Open http://localhost:5173, create a farmer, and start farming. To try the neighbor features, register a
second farmer in a private window and send a neighbor request.

### Production

```bash
npm run build        # builds client/dist
npm start            # serves the API and the built client on http://localhost:3001
```

Environment variables:

| Variable          | Default        | Purpose                                                       |
| ----------------- | -------------- | ------------------------------------------------------------- |
| `PORT`            | `3001`         | HTTP port                                                     |
| `FARM_DB`         | `data/farm.db` | SQLite database file                                          |
| `FARM_ALL_EVENTS` | unset          | Set to `1` to unlock every seasonal shop (handy for testing)  |

### Checks

```bash
npm test             # game-rule and API tests (vitest)
npm run typecheck    # TypeScript across all packages
```

There are also two helper scripts:

- `node scripts/art-sheet.mjs <module|all> out.png` renders a contact sheet of the generated art. Modules are
  `crops`, `trees`, `animals`, `buildings`, `goods`, `ground`, `decorations`, `seasonal`, `lifestyle`,
  `horticulture`, `spooky_a`/`spooky_b`, `country_a`/`country_b`, `festivals_a`/`festivals_b`, `halloween`,
  `events_a` through `events_e`, `cooking`, `portraits`, `pets` and `fx`. You can also view
  it live at http://localhost:5173/art-preview.html?mod=all.
- `node scripts/smoke.mjs <screenshot-dir> <url>` drives a real browser through a play session. Two companion
  scripts check other features: `scripts/halloween-check.mjs` covers seasonal visitors and the token shop
  (try `?debug&event=winter`), and `scripts/cooking-check.mjs` covers the kitchen mini-games. Point it at a
  running game with `?debug` in the URL, for example `http://localhost:3001/?debug` after `npm run build &&
  npm start`.

## Controls

- **Click** things to harvest, collect or open them. **Drag** across crops to harvest a whole field.
- Use the **toolbar** to switch between Hand, Plow, Seeds, Market, Move, Store and Sell.
- **Drag** empty ground (or right-drag) to pan the camera. **Scroll** or pinch to zoom. **WASD** or the arrow
  keys also pan.
- **R** flips a decoration while placing or moving it. **Esc** or right-click cancels.
- Add `?hour=22` to the URL to preview night time (or any hour of the day), and `?event=winter` (or any event id)
  to preview an event's look, music and visitors any time of year.

## Adding content

Content lives in `shared/src/content/`. Add a crop, animal, building, recipe, decoration or quest there, then
paint its art in the matching `client/src/art/*.ts` module. `client/src/art/manifest.ts` lists the texture keys
each module must provide. Anything missing shows up as a placeholder crate in the game and as "Missing" on the
art contact sheet.
