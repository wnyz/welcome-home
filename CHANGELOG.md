# Changelog

*A Temporary Island*, whnvr for Liminal Landing. The rounds of edits are
listed in the order they were requested, newest at the bottom.

---

## Round 0: free camera (temporary)

- **Mouse camera in the viewer, with no on-screen UI.** Drag to orbit,
  right-drag or Shift-drag to pan, scroll to zoom, double-click to reset.
  It works on top of presets and songs (`js/freecam.js`).

## Round 1: islands, stands, flying houses

- **Digital distortion removed.** That covers the glitch bursts in the
  windows and on screen, the *Digital distortion* slider, and the
  distortion effect on 在這座城市遺失了你.
- **Stands.** New York and Taiwan no longer have the cone under them. The
  small islands keep a shorter, blunt one.
- **Taiwan:**
  - a low-poly mountain range down the middle, with houses arranged around it
  - green ground
  - 招牌: color-block shop signs, vertical and over the shutters, with no text
  - 鐵皮屋頂: corrugated tin rooftop additions and rain covers
  - scooters, later removed in round 2
  - 電線桿 utility poles with wires, later moved into town in round 2
- **New York:**
  - red brick on most buildings
  - more buildings
  - Times Square-style billboards with abstract moving gradients and no
    text, at three heights: low over the shopfronts, mid on the walls, and
    high on the roofs
- **Flying houses.** 26 paper-cut houses in the reference palette, in
  different shapes and sizes. They float in zero gravity, tilt but never
  flip, and loop seamlessly.
- **Mid-size islands:** a subway entrance with green globe lamps, a bus
  stop, and a small grove.
- **New camera presets:** Subway Island, Bus Stop Island, Grove Island,
  Flying Houses.
- **URL option:** `viewer.html?preset=<id>` opens the viewer on a preset.

## Round 2: Manhattan, birds, Taiwan cleanup, sun + moon

- **New York becomes Manhattan.** It's a long, narrow island with two
  avenues and four cross streets, and one intersection with the signal and
  zebra crossings.
- **Skyscrapers.** Five generic towers in the middle (art deco, needle,
  two glass towers and an office slab). Their windows light up at night.
- **Taxis.** Twelve yellow cabs drive slowly, stop and drive again on loops
  around the avenues.
- **Water towers removed** from all buildings.
- **Suspension bridge** off the northern tip, ending in a large lit window
  standing in the air.
- **Manhattanhenge camera.** Street level down the avenue, with the sun
  setting between the buildings.
- **Bridge Window camera.** A side view of the bridge leading to the window.
- **Birds** are now just two flat wings in one color, flying above the
  buildings.
- **Taiwan:**
  - scooters removed
  - table, chairs and floor lamp removed
  - the grove island's lamp removed
  - poles now stand in the lanes beside the houses, with wires going in
    different directions. They move with the houses.
- **Sun and moon** over the islands, with stars.
- **Night slider.** The lights actually go down instead of just glowing.
- **Fix.** A timing bug on the first frame that had always been there.

## Round 3: time of day, ladder, baggage belt, airliner

- **Time slider (00:00–23:00).** This is Taiwan's clock, and New York is
  always 12 hours apart. Each island gets day, golden hour or night light
  from its own hour, with a sun or moon above it.
- **Night darkness** sets how dark night gets. At 100% the lights are almost
  off; only windows, screens, signs, skyscraper windows, subway globes and
  the lighthouse stay lit.
- **Split sky** goes from the blended sky to a hard split down the middle of
  the screen, one island's sky on each side, with a line between.
- **Removed:** the *Different timezones* slider and the sun/moon swap
  toggle, since the clock replaces them.
- **Clouds** stay and float everywhere.
- **Ladder.** A tall ladder standing upright in the air, with a lit window
  floating at its top. No island.
- **Baggage belt.** A long conveyor loop under and around both main
  islands, with suitcases riding it nonstop, past a new island with a hill
  of stacked luggage. No island stops spinning.
- **Airliner restyled** as a flat white plane with swept wings, a pale-blue
  stripe and a dark-blue offset shadow.
- **New camera presets:** Ladder to a Window, Baggage Belt, Airliner.

## Song 1 (完美落地)

- The airplane view is a cabin wall with three rounded windows, well apart,
  shades up, with clouds drifting past outside.
- The song starts in black and slowly fades in on the windows; leaving it,
  the windows fade out in 0.8 s.

## Saved views per song

- **Save camera view, time + sky.** In the controller, frame a shot in the
  viewer, set the time and sky, pick a song and press *Save view*. That
  song then opens on exactly that view, at that hour, under that sky. Saved
  songs show a red ● in the list.
- **Clear** removes a song's saved view.
- **Copy saved views as code** produces lines for `js/songs.js`.
- **Songs support new fields:** `pan`, `time` and `sky`.
- **Your 12 saved views written into `js/songs.js`,** so they work on any
  computer: 大人中, 紐約鄰居, 家, 在這座城市遺失了你, 超大行李, 不想去遠方,
  浴室, 在凌晨, 我想和你一起, 晚安台灣, 我在紐約打電話給你, 親愛的.

## Publishing and sharing

- **Pushed to GitHub:** https://github.com/wnyz/welcome-home
- **Live site:**
  - Controller: https://wnyz.github.io/welcome-home/control.html
  - Viewer at 1920 × 1080:
    https://wnyz.github.io/welcome-home/viewer.html?w=1920&h=1080
- **Share live.** The controller can now reach viewers on other computers
  (a friend's laptop, the projector machine, an OBS Browser Source) through
  a free public relay. Copy the link from the *Share live* panel. Everyone
  with it sees what you control, with a shared animation clock so every
  screen is at the same moment. The room code stays the same unless you
  press *New room code* or use another browser.

## Rounds 4–6: new songs, chain belt, portals

- **Songs 19–34** added to the playlist.
- **Baggage belt** is two rings linked like a chain, one round New York, one
  round Taiwan, passing through each other; 36 bags ride it.
- **Luggage island** in the middle, sitting a little below the belts.
- **Small street-light island** added.
- **Mountains** rebuilt so no faces are missing or clipping.
- **Skyscrapers** have rows of single windows; at night they stay calm
  (about 4 in 10 lit, a few change slowly once a loop, no flicker).
- **One sun and one moon** at all times.
- **Two portals** high in the sky facing each other, birds flying through
  them both ways (reworked in Round 7).
- **Spiral stairs** island; the ladder now leans; the airliner has a rounder
  body, wing fairings and engines.
- **All small and mid islands rotate** slowly (the lighthouse island stays put).

## Round 7: portals, weather, ambient motion, song scenes

- **Portals** are flat discs with a radial gradient (dark center, blue,
  lilac, pink, orange) whose color waves keep rippling outward. Both sides
  show the gradient.
- **Weather:** rain over Taiwan, snow over New York (small flakes). The
  Atmosphere panel has on/off switches and amount sliders for each.
- **Billboards** flow in five gradient styles: radial ripples, diagonal
  bands, a turning conic sweep, drifting color blobs and square ripples.
  Taiwan shop signs shimmer softly.
- **Camera clipping fixed:** normal views sit far back, so nothing in front
  gets cut off.
- **回家:** a bus pulls into the bus stop twice per loop, and three lights on
  the stop board count it in. Taiwan time 10:00.
- **浪流連:** the bridge window opens onto another world, a turning spiral
  of portal colors with a bright center and drifting sparks.
- **紐約鄰居:** taxis have headlights and tail lights that glow at night.
- **超大行李:** bags on the luggage piles jostle, and a few lift off, float,
  turn and settle back.
- **不想去遠方:** new Lookout view from inside a room on Taiwan, through the
  window to the mountains and neighbors. Curtains sway and a fan turns.
- **浴室:** new Bathroom view from inside a pink-tiled bathroom in a floating
  house, looking out at New York's towers. A duck bobs in the tub.
- **我想和你一起:** new Two Birds view following a pair of birds round Taiwan,
  with a little displacement.
- **晚安台灣:** a ring road round Taiwan with street lamps, and a little bus
  doing one lap per loop. New Road Trip view follows it.
- **我在紐約打電話給你:** twinkling Christmas lights on the fire-escape
  balconies.
- Songs whose view changed (`viewVersion: 2` in `js/songs.js`) ignore views
  saved earlier in the browser.

## Round 8: from the meeting notes

- **Big Apple** floating and slowly turning beside New York (it never lands).
  Camera: Big Apple.
- **Windmill island**: a small island with a windmill whose sails turn and a
  ring of flowers. Camera: Windmill Island.
- **Departures board** drifting high across the front of the world: split-flap
  rows of made-up dot glyphs (nothing readable) that riffle to new lines, plus
  status lights per row. Camera: Departures Board.
- **Ripple (memory blur)** slider in Style: the whole picture wavers like it's
  seen through water.
- **Lines only** style: outlines only, light on black, with no fills, glows or clouds.
- **Soft, breathing islands**: the island layers are quilted like a down
  jacket and swell and settle every 15 s; the small islands breathe too.
  Slider: Island breathing (Motion).
- **Earthquake houses**: houses rise and sink unevenly, and every 30 s a wave
  rolls across each island, lifting and shaking them (the two islands take
  turns). Slider: Earthquake (Motion).
- Any setting can be given in the viewer URL for checking looks, e.g.
  `viewer.html?preset=overview&stroke=lines&ripple=0.6`.

## Round 9: tweaks

- The round-island road has 10 street lamps instead of 22.
- The windmill is now a power-making wind turbine: tall white tower, three
  long blades with red tips, a small substation box, a red beacon at night.
  Flying houses keep clear of it.
- Earthquake no longer jumps or shakes: the ground swells in a slow, smooth
  wave, so houses rise and sink in turn.
- **Two Birds:** the birds fly against Taiwan's turn, so the island is seen
  turning behind them.
- **Performance:** boxes of the same size share one shape and outlines are
  worked out once per shape (about a quarter fewer shapes, faster loading);
  balcony lights cut to every other floor, half the bulbs (171 instead of 588).
- **Departures board** moved to drift behind the world, so it never passes in
  front of a close-up.

## Round 10: more song scenes

- The bridge floats on its own off New York's front-left, bobbing and
  swaying; its window shows soft rings drifting inward instead of a spiral.
- Night glows (lamps, car lights, bridge window, balcony bulbs) toned down.
- **Two Birds** view is now a fixed shot of Taiwan with the pair circling it.
- **魚:** neon fish spiral round the wind turbine. Camera: Windmill Island.
- **忽然之間:** a big floating alarm clock; the minute hand goes round once per
  loop, the second hand ticks. Camera: Big Clock.
- **我給的愛:** fireflies flicker round the window at the top of the ladder.
- **一桌菜:** new Dining Room view: a round red table set with dishes and rice
  bowls, steam rising, the window on Taiwan.
- **無眠:** rooftop billboards show dreamy scenes: drifting clouds, stars and
  a moon, liquid blobs, aurora, a sweeping light.
- **台北某個地方:** laundry poles on the Grove island, clothes blowing in the
  wind. Camera: Grove Island.
- **Love Lee:** the Big Apple camera orbits the apple once per loop.
- **未接來電:** rotary phones, mobile phones and radios drift between the
  islands; the phones buzz and light up every 15 s.

## Round 11: fish school, dreamy clock, phone cord, saved views

- **魚:** the neon fish are replaced by a soft school of 22 pastel fish (after
  the fish-tank project) that swims round the wind turbine together,
  stretching and bunching; light on performance (no simulation, loops).
- **忽然之間:** the clock has no bells; its face is a soft sky gradient with
  pastel dots, it breathes slightly out of shape, and time runs fast (minute
  hand every 10 s).
- **我給的愛:** fireflies are paler and less glowy.
- **未接來電:** radios removed; a red phone by New York and a blue phone by
  Taiwan, joined by a coiled blue phone cord hanging across the gap.
- **20 saved views written into `js/songs.js`:** 鹿港小鎮, 回家, 想厝的人, 想家,
  浪流連, 超大行李, 魚, 忽然之間, 抱著你, 我給的愛, 牽掛, 一桌菜, 無眠, 台北某個地方,
  愛我別走, San Francisco Street, Love Lee, Lucky, 未接來電, 勇氣.
  (一桌菜 now uses its saved Bridge framing and Love Lee its saved Crossroads
  framing; the Dining Room and Big Apple cameras are still in the camera list.)
