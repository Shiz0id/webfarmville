# 🌻 Meadowbrook Farm

A cozy isometric farming game for the browser, in the spirit of classic social farm games and Animal Crossing.
Plow and plant, raise animals, grow an orchard, craft goods in workshops, decorate with 150+ wholesome
decorations (including seasonal holiday sets), and visit your neighbors to help out and send gifts.

All of the art is drawn in code at startup, so there are no image assets to download or license.

## Features

- **Crops**: 16 crops, from 1-minute strawberries to 12-hour cranberries. Crops grow in real time (even while
  you're offline) and wither if you leave them too long. Drag across a field to plant or harvest it all at once.
- **Animals & trees**: 8 animals (including a beehive) and 8 fruit trees that produce on a cycle.
- **Crafting**: 7 workshops (windmill, dairy, bakery, jam kitchen, loom, juice stand and café) with 30 recipes
  and queued production slots.
- **Villager order board**: deliver produce and goods to the villagers for bonus coins, and sometimes a
  thank-you decoration.
- **Mystery gifts**: surprise presents that drop while you farm. Unwrap one to get a random decoration.
- **About 215 decorations** in three collections:
  - *Core*: flowers, plants, fences, paths, furniture, lights, water features, garden pieces and whimsy.
  - *Seasonal & holiday lifestyle*: Lunar New Year, Valentine's Day, St. Patrick's Day, the Spring Egg Hunt,
    the Summer Festival, the Harvest Festival, Halloween, the Festival of Lights, the Winter Holidays and New
    Year. These include festive scenes like hot cocoa stands, pumpkin-carving tables and picnics. Like Animal
    Crossing, each set can only be bought while its event is running.
  - *Gardening*: a Gardening Mama-inspired set of terracotta pots, seedling trays, bean teepees, smiling
    veggie planters, a bee hotel, blue-ribbon pumpkins and a glass greenhouse.

  Decorations add **charm**, which earns star ratings and a bigger daily bonus. A **Decor Catalog** tracks
  every decoration you've collected.
- **Villagers**: Mayor Maple, Henrietta, Penny, Rosie and Grandma Fern have painted portraits. They give the
  24-quest storyline, post orders and cheer you on in speech bubbles.
- **Coziness**:
  - A procedural music box and synthesized sound effects (no audio files).
  - Day/night lighting from your local clock, with lamps that glow and fireflies at night.
  - Seasonal falling leaves, petals or snow, and drifting cloud shadows.
  - Butterflies, a puppy and kitten who wander your farm (tap them!), and animals that hop.
  - Chimney smoke, sparkling ripe crops, and coins and items that fly to your HUD.
- **Progression**: 50 levels with unlocks, plus land expansions from 14×14 up to 30×30.
- **Neighbors**:
  - Send neighbor requests, visit friends' farms, and fertilize, revive, water or feed their crops and animals
    (5 helps per neighbor per day, rewarded with coins and XP).
  - Send one free gift per neighbor per day.
  - A farm-news feed tells you who helped you.
  - Everyone starts as neighbors with **Mayor Maple**, an NPC with a showcase farm.
- **Server-authoritative**: the same game rules run on the client (for instant feedback) and on the server (to
  validate them). Randomness such as orders and gifts uses a seed stored in each farm, so both sides always roll
  the same result.

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
  `horticulture`, `portraits`, `pets` and `fx`. You can also view
  it live at http://localhost:5173/art-preview.html?mod=all.
- `node scripts/smoke.mjs <screenshot-dir> <url>` drives a real browser through a play session. Point it at a
  running game with `?debug` in the URL, for example `http://localhost:3001/?debug` after `npm run build &&
  npm start`.

## Controls

- **Click** things to harvest, collect or open them. **Drag** across crops to harvest a whole field.
- Use the **toolbar** to switch between Hand, Plow, Seeds, Market, Move, Store and Sell.
- **Drag** empty ground (or right-drag) to pan the camera. **Scroll** or pinch to zoom. **WASD** or the arrow
  keys also pan.
- **R** flips a decoration while placing or moving it. **Esc** or right-click cancels.
- Add `?hour=22` to the URL to preview night time (or any hour of the day).

## Adding content

Content lives in `shared/src/content/`. Add a crop, animal, building, recipe, decoration or quest there, then
paint its art in the matching `client/src/art/*.ts` module. `client/src/art/manifest.ts` lists the texture keys
each module must provide. Anything missing shows up as a placeholder crate in the game and as "Missing" on the
art contact sheet.
