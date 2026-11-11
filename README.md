# A Temporary Island

*whnvr, for* Liminal Landing

A floating archipelago of temporary homes. **New York** is long and narrow
like Manhattan: two avenues and four cross streets, red-brick walk-ups with
fire escapes, a midtown of skyscrapers whose windows light up at night,
Times Square-style screens (abstract gradients, low, mid and high), yellow
cabs that drive, stop and drive again, and a suspension bridge off the
northern tip that ends in a lit window standing in the air. **Taiwan** is a
long green leaf of land with a mountain range down the middle, tiled
walk-ups, iron window cages and potted plants, rolling shutters, 鐵皮屋頂 tin
rooftop additions, color-block 招牌 shop signs, and 電線桿 utility poles in
the lanes between houses with wires strung every which way.
Three mid-size islands sit between: a subway entrance with green globe
lamps, a bus stop, and a small grove. A baggage belt loops underneath and
around everything, carrying suitcases past a hill of luggage, and a tall
ladder stands in the air with a window floating at its top. Around them are smaller islands: a
suitcase, a lighthouse that keeps searching, a window standing on its own,
a tiny house, stairs to nowhere, and a lone gable wall. Paper-cut houses
drift through the sky in zero gravity. Pigeons and sparrows (two flat
wings each) commute between the two main islands, and a flat white airliner
with a dark-blue shadow passes overhead. Each island can live
in its own time of day.

Built with Three.js (vendored in `lib/`, so it runs offline), an orthographic
camera, and procedural geometry only. There is no backend.

## Run it

ES modules need a local server, so opening the files directly won't work.
**Start the server from inside this folder** (the one with `viewer.html`):

```bash
cd path/to/temporary-island      # tip: type "cd ", then drag the folder into Terminal
python3 -m http.server 8080
```

Then open, in the same browser:

- **Controller**: http://localhost:8080/control.html
- **Viewer**: press *Open viewer* in the controller, or go to http://localhost:8080/viewer.html

The two pages sync live through `BroadcastChannel`, and settings persist in
`localStorage`. If the page shows a 404, the server was started from the
wrong folder.

## Performing

**Song scenes.** Click a song, then *Activate selected*. You can also
double-click a song, or use **←/→** to move to the previous or next scene
(**↑/↓** then **Enter** picks one). The camera, atmosphere, floating level and
birds all move together over the *transition duration*.

**Saving a view (and time) for a song.** Frame a shot in the viewer: drag to
orbit, right-drag (or Shift-drag) to pan, scroll to zoom, double-click to
reset. Set the *Time* slider and the sky (an atmosphere button or the three
colors). In the controller under *Save camera view, time + sky*, pick the
song and press *Save view*. That song now opens on exactly this view, at
this hour, under this sky (a red ● in the song list marks it). Saved views
live in this browser; *Copy saved views as code* gives you lines to paste
into `js/songs.js` so they're permanent and travel with the project.

**Camera presets** (keys **1–9, 0, -**):

| # | Preset | |
|---|---|---|
| 01 | World Overview | the whole archipelago |
| 02 | New York Island | brick, fire escapes, the crossroads |
| 03 | Taiwan Island | walk-ups, cages, plants, rooftops |
| 04 | Window Close-Up | slow approach into a caged Taiwanese window: a lit room, a curtain, a memory on the back wall |
| 05 | Crossroads | the intersection from above; lower the angle and orbit for street level |
| 06 | Suitcase Island | |
| 07 | Lighthouse | the searching beam |
| 08 | Between Islands | low and wide, emphasizing the empty space between |
| 09 | Different Timezones | sunset over New York and sunrise over Taiwan in one continuous sky |
| 10 | Airplane Window | high above, looking down through a cabin window as the world drifts below |
| 11 | New York Window | a fourth-floor window behind the fire escape |
| 12 | Manhattanhenge | street level down the avenue, the sun setting between the buildings |
| 13 | Bridge Window | the suspension bridge leading into its window |
| 14 | Ladder to a Window | a tall ladder standing in the air, a lit window at the top |
| 15 | Baggage Belt | the luggage hill, bags riding the belt past it |
| 16 | Airliner | following the flat white airliner from above |
| 17 | Subway Island | the subway stairs and their globe lamps |
| 18 | Bus Stop Island | the shelter, bench and stop sign |
| 19 | Grove Island | a few trees |
| 20 | Flying Houses | low angle from below, the houses drifting overhead |

Presets 12–20 have no number keys; click them in the controller. To open the
viewer straight on a preset, add `?preset=<id>` (e.g. `viewer.html?preset=subway`).

*Zoom*, *Camera angle* and *Orbit* adjust the current preset live. The
*Autonomous camera tour* walks through the presets every 30 s on its own.

**Floating / Displacement**
- 0–1: gentle floating, as before.
- 1–2: windows, roofs and fixtures begin to separate.
- 2–3.6: houses and streets disassemble.
- 3.6–5: everything, including the island layers, drifts apart into space.

Bringing the slider back down returns every object exactly to its place.
Each object has a stored home position and a fixed, seeded drift, so
nothing accumulates error or gets lost. The *Scattering* buttons jump to
four levels.

**Time.** The *Time* slider is Taiwan's clock (00:00–23:00); New York is
always 12 hours apart. Each island gets its own light from its hour: day,
golden hour, or night, with a sun or a moon above it. *Night darkness* sets
how dark night gets (at 100% the lights are almost off, and only windows,
screens, signs, skyscraper windows, the subway globes and the lighthouse
stay lit). *Split sky* goes from the usual blended sky to a hard split down
the middle of the screen, one island's sky on each side, with a line
between.

**Song 1 / Airplane Window** looks out through a row of five cabin windows,
shades up, with clouds drifting past.

**Style.** Choose between Stroke, Reduced stroke and No stroke. In No stroke,
shading contrast rises slightly so forms stay readable.

## Recording at 1920 × 1080

1. Open `viewer.html?w=1920&h=1080` and press **f** for fullscreen.
2. Set island rotation, bird speed and cloud drift to whole numbers (the
   sliders snap toward them).
3. Press *Restart loop at 0:00*, then record **2:00** for a seamless loop.

Camera moves and song scenes run on their own clock, separate from the
2-minute loop. They never reset the animation, so you can cut between views
mid-recording.

## Editing

- **Song scenes:** `js/songs.js` has one entry per song: camera, atmosphere,
  zoom, angle, orbit, float, birds, and other effects.
- **Camera presets:** `js/presets.js` gives each preset an anchor, angles,
  distance, zoom, transition scale, atmosphere and effects. Anchors are
  objects in the world, so presets follow islands as they float and turn.
- **Atmospheres and local times:** `ATMOSPHERES` and `TIMES` in `js/config.js`.
- **Memories behind windows:** add images to `MEMORY_IMAGES` in
  `js/memories.js`. Each window shader also accepts `fixedMem`, `light`,
  `curtain` and `depth` (see `windowMaterial` in `js/materials.js`), which is
  where per-window interiors and lighting can grow later.

## Files

```
viewer.html, control.html, css/
js/config.js        defaults, palette, atmospheres, local times, world layout
js/presets.js       camera presets (+ tour order)
js/songs.js         the 18 song scenes
js/viewer.js        renderer, post-processing (sky, timezones, halftone, grain,
                    airplane window), state easing, sync
js/control.js       controller UI
js/camera.js        camera rig + transitions
js/world.js         archipelago layout, satellites, airplane, displacement system
js/architecture.js  buildings, crossroads, lighthouse, suitcase, objects
js/materials.js     toon shader, stroke modes, window-room shader, light beam
js/memories.js      procedural window memories + hook for real images
js/clouds.js        atmospheric clouds
js/birds.js         pigeons + sparrows
lib/three.module.js Three.js r170
```

## Partial or simplified in this version

- **Birds** follow smooth looping routes: they circle one island, slow
  almost to a hover, cross over, circle the other island, and return. This
  is choreographed rather than simulated flocking.
- **Window interiors** are a convincing fake room (walls, floor, ceiling
  lamp, curtain, and a memory on the back wall). They are not real 3D
  interiors. Two windows are set up as hero windows for the close-ups.
- **Airplane Window** is a 2D cabin-window overlay in the post pass over the
  real 3D world. The visible airliner hides while you're "inside" it.
- **Street-level crossroads** is a low orthographic angle, not a true
  eye-level perspective. That keeps the 2.5D look but means no vanishing
  point.
- **The autonomous tour** runs on a fixed 30 s cycle with no random
  ordering.
