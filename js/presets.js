// Camera presets.
//
// A preset describes where the camera looks and from which direction, rather
// than a fixed position, so it keeps working while islands float, spin and
// come apart:
//
//   anchor     what the camera is attached to (see world.anchors):
//              world, drift, ny, tw, crossroads, twWindow, nyWindow,
//              suitcase, lighthouse, windowIsland, tinyHouse, stairs, wall, airplane,
//              subway, busStop, grove, henge, bridgeWindow, ladder, ladderWindow, luggage
//   frame      'world' (default): angles are measured in world space
//              'local': angles are measured in the anchor's own frame, so the
//              camera follows it as it turns (used for windows + crossroads)
//   target     [x, y, z] offset from the anchor (in the chosen frame)
//   azimuth    degrees around the vertical axis (0 = looking from +z)
//   elevation  degrees above the horizon (also the controller's Camera angle)
//   distance   how far the camera sits from the target. With an orthographic
//              camera this doesn't change size, but it decides what is in
//              front of the near plane — keep it small for close-ups so the
//              camera sits just outside a wall, never inside one.
//   zoom       orthographic zoom (1 ≈ one island fills the frame height)
//   durationScale  multiplies the controller's transition duration
//   atmosphere optional ATMOSPHERES id applied on activation
//   effects    optional state overrides applied on activation
//              (timezone, windowLight, halftone, clouds, ...)
//   overlay    'airplane' shows the airplane-window frame
//   sun        { at: [u, v], r } pins the sun to a screen spot (Manhattanhenge)

export const CAMERA_PRESETS = [
  {
    id: 'overview', name: 'World Overview',
    anchor: 'world', target: [0, 0.5, -1], azimuth: 0, elevation: 30, distance: 140, zoom: 0.56,
    effects: { timezone: 0.35 },
  },
  {
    id: 'newyork', name: 'New York Island',
    anchor: 'ny', target: [0, 1.8, 0], azimuth: -12, elevation: 24, distance: 90, zoom: 1.25,
    atmosphere: 'dusk',
  },
  {
    id: 'taiwan', name: 'Taiwan Island',
    anchor: 'tw', target: [0, 1.2, 0], azimuth: 14, elevation: 27, distance: 90, zoom: 1.35,
    atmosphere: 'between',
  },
  {
    id: 'window', name: 'Window Close-Up',
    anchor: 'twWindow', frame: 'local', target: [0, -0.02, 0.1], azimuth: 10, elevation: 6, distance: 6, zoom: 15,
    durationScale: 1.6, atmosphere: 'late', effects: { windowLight: 1 },
  },
  {
    id: 'crossroads', name: 'Crossroads',
    anchor: 'crossroads', frame: 'local', target: [0, 0.4, 0], azimuth: 45, elevation: 40, distance: 40, zoom: 2.3,
  },
  {
    id: 'suitcase', name: 'Suitcase Island',
    anchor: 'suitcase', target: [0, 0.6, 0], azimuth: -24, elevation: 14, distance: 30, zoom: 4.2,
    atmosphere: 'between',
  },
  {
    id: 'lighthouse', name: 'Lighthouse',
    anchor: 'lighthouse', target: [0, 2.6, 0], azimuth: 18, elevation: 10, distance: 50, zoom: 2.1,
    atmosphere: 'late',
  },
  {
    id: 'between', name: 'Between Islands',
    anchor: 'world', target: [0, 0, -1], azimuth: 0, elevation: 6, distance: 140, zoom: 0.68,
    effects: { timezone: 0.5 },
  },
  {
    id: 'timezones', name: 'Different Timezones',
    anchor: 'world', target: [0, 0.5, -1], azimuth: 0, elevation: 20, distance: 140, zoom: 0.66,
    atmosphere: 'twilight', effects: { timezone: 1 },
  },
  {
    id: 'airplane', name: 'Airplane Window',
    anchor: 'drift', target: [0, 0, 0], azimuth: 8, elevation: 72, distance: 120, zoom: 1.0,
    durationScale: 1.4, overlay: 'airplane', effects: { timezone: 0.45 },
  },
  {
    id: 'nywindow', name: 'New York Window',
    anchor: 'nyWindow', frame: 'local', target: [0, -0.02, 0.1], azimuth: -12, elevation: 5, distance: 6, zoom: 14,
    durationScale: 1.6, atmosphere: 'dusk', effects: { windowLight: 1 },
  },
  {
    id: 'henge', name: 'Manhattanhenge',
    anchor: 'henge', frame: 'local', target: [0, 1.6, 0], azimuth: 90, elevation: 2, distance: 2.4, zoom: 4.4,
    durationScale: 1.4, atmosphere: 'henge', effects: { timezone: 1, twHour: 7 },
    sun: { at: [0.5, 0.36], r: 0.06 },
  },
  {
    id: 'bridge', name: 'Bridge Window',
    anchor: 'bridgeWindow', frame: 'local', target: [0, -0.2, -2.2], azimuth: 62, elevation: 10, distance: 14, zoom: 2.6,
    durationScale: 1.4, atmosphere: 'twilight', effects: { windowLight: 1 },
  },
  {
    id: 'ladder', name: 'Ladder to a Window',
    anchor: 'ladder', target: [0, 4.6, 0], azimuth: -10, elevation: 8, distance: 40, zoom: 1.75,
    durationScale: 1.4, atmosphere: 'twilight', effects: { windowLight: 1 },
  },
  {
    id: 'luggage', name: 'Baggage Belt',
    anchor: 'luggage', target: [0, 1.0, 0], azimuth: 25, elevation: 20, distance: 40, zoom: 2.4,
    atmosphere: 'between',
  },
  {
    id: 'plane', name: 'Airliner',
    anchor: 'airplane', target: [0, 0, 0], azimuth: 30, elevation: 62, distance: 30, zoom: 3.2,
    atmosphere: 'harbor',
  },
  {
    id: 'subway', name: 'Subway Island',
    anchor: 'subway', target: [0, 0.6, 0], azimuth: 20, elevation: 28, distance: 40, zoom: 3.0,
    atmosphere: 'late', effects: { windowLight: 1 },
  },
  {
    id: 'busstop', name: 'Bus Stop Island',
    anchor: 'busStop', target: [0, 0.8, 0], azimuth: -5, elevation: 16, distance: 40, zoom: 3.0,
    atmosphere: 'dawn',
  },
  {
    id: 'grove', name: 'Grove Island',
    anchor: 'grove', target: [0, 0.6, 0], azimuth: 10, elevation: 22, distance: 40, zoom: 3.2,
    atmosphere: 'lawn',
  },
  {
    id: 'flyers', name: 'Flying Houses',
    anchor: 'world', target: [0, 4, -1], azimuth: -25, elevation: -8, distance: 140, zoom: 0.62,
    atmosphere: 'between', effects: { timezone: 0.4 },
  },
];

export const presetById = (id) => CAMERA_PRESETS.find(p => p.id === id) || CAMERA_PRESETS[0];

// The autonomous camera tour (Controller → Camera → Tour) walks through these.
export const TOUR = ['overview', 'newyork', 'crossroads', 'henge', 'bridge', 'ladder', 'luggage', 'subway', 'between', 'busstop', 'taiwan', 'window', 'timezones', 'flyers', 'lighthouse', 'suitcase', 'airplane'];
export const TOUR_SECONDS = 30;
