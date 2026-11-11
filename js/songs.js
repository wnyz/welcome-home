// Song scenes for the DJ set. Edit freely — this is the only place they live.
//
//   title, artist  shown in the controller
//   camera         a CAMERA_PRESETS id (see presets.js)
//   atmosphere     optional ATMOSPHERES id (config.js); otherwise the preset's
//   zoom           optional orthographic zoom; otherwise the preset's
//   angle          optional camera elevation in degrees; otherwise the preset's
//   orbit          optional extra azimuth in degrees (e.g. -45 on the crossroads
//                  looks straight down a street at street level)
//   pan            optional [x, y, z] shift of the look-at point
//   time           optional Taiwan hour 0-23 (New York is +12 h)
//   sky            optional ['#top', '#middle', '#bottom'] sky colors (overrides atmosphere)
//   float          floating / displacement intensity (0–1 floats, 1–5 comes apart)
//   birds          optional { count, speed }
//   effects        optional state overrides, e.g. { timezone, windowLight,
//                  halftone, clouds, cloudDensity, stroke }
//   note           why this view — for us, not shown on screen

export const SONG_SCENES = [
  {
    title: '完美落地', artist: 'Luantan Ascent, Fran',
    camera: 'airplane', atmosphere: 'harbor', float: 0.8,
    note: 'a perfect landing — we begin in the air, looking down',
  },
  {
    title: '鹿港小鎮', artist: '羅大佑',
    camera: 'taiwan', atmosphere: 'between', float: 0.9,
    effects: { timezone: 0.4 },
    note: 'the small town left behind',
  },
  {
    title: '回家', artist: 'Shunza',
    camera: 'between', atmosphere: 'dusk', float: 1,
    birds: { count: 14, speed: 1 },
    note: 'going home: the distance itself',
  },
  {
    title: '想厝的人', artist: '詹雅雯',
    camera: 'window', atmosphere: 'late', float: 0.6,
    effects: { windowLight: 1 },
    note: 'someone missing home — looking in',
  },
  {
    title: '想家', artist: '卓文萱',
    camera: 'timezones', atmosphere: 'twilight', float: 1,
    effects: { timezone: 1 },
    note: 'homesick: same sky, different hours',
  },
  {
    title: '浪流連', artist: 'EggPlantEgg',
    camera: 'overview', atmosphere: 'lawn', float: 2.8,
    birds: { count: 12, speed: 2 },
    note: 'wandering — the world starts to loosen',
  },
  {
    title: '大人中', artist: 'Crowd Lu',
    camera: 'taiwan', zoom: 2.897, angle: 32.5, orbit: -88.2, pan: [-37.46, -17.17, -14.05], time: 23, sky: ['#5aa6e6', '#efe6d4', '#79c25a'],  // saved view
    float: 1,
    note: 'becoming an adult: decisions at the crossroads',
  },
  {
    title: '紐約鄰居', artist: 'Gordon',
    camera: 'taiwan', zoom: 11.533, angle: 6.9, orbit: -16.7, pan: [-36.49, -2.98, -9.37], time: 23, sky: ['#1858cf', '#2f8ec2', '#86cf9e'],  // saved view
    float: 1,
    note: 'New York neighbors',
  },
  {
    title: '家', artist: 'Cheer Chen',
    camera: 'taiwan', zoom: 1.614, angle: 58.8, orbit: -168.5, pan: [2.55, -9.54, 6.01], time: 23, sky: ['#0d2c80', '#2a5fbf', '#e2675c'],  // saved view
    float: 0.5,
    effects: { windowLight: 0.85, timezone: 0.2 },
    note: 'home, in daylight this time',
  },
  {
    title: '在這座城市遺失了你', artist: '告五人',
    camera: 'taiwan', zoom: 1.482, angle: 57.7, orbit: -111.7, pan: [-26.67, -11.45, 1.11], time: 19, sky: ['#7fb3ea', '#f7d7c4', '#f3d98a'],  // saved view
    float: 2.4,
    effects: { windowLight: 1 },
    note: 'lost you in this city — the crossroads at night, coming apart',
  },
  {
    title: '超大行李', artist: 'G.U.T.S',
    camera: 'taiwan', zoom: 2.919, angle: 38.1, orbit: -30.3, pan: [-13.3, -20.38, 6.96], time: 6,  // saved view
    atmosphere: 'between', float: 1.2,
    note: 'oversized luggage',
  },
  {
    title: '不想去遠方', artist: 'Crowd Lu',
    camera: 'taiwan', zoom: 12.214, angle: 22.1, orbit: 78.4, pan: [-19.46, -8.55, 4.1], time: 18,  // saved view
    atmosphere: 'dawn', float: 0.4,
    note: "don't want to go far — morning on the island",
  },
  {
    title: '浴室', artist: 'deca joins',
    camera: 'taiwan', zoom: 4.061, angle: -0.1, orbit: 111.8, pan: [-15.29, 9.29, 3.56], time: 11, sky: ['#7fb3ea', '#f7d7c4', '#f3d98a'],  // saved view
    float: 0.7,
    effects: { windowLight: 1, halftone: 0.6 },
    note: 'a small lit room in a big city',
  },
  {
    title: '在凌晨', artist: 'Zhang Zhen Yue',
    camera: 'taiwan', zoom: 6.99, angle: -0.2, orbit: -112, pan: [-24.27, 0.58, -7.45], time: 13, sky: ['#0d2c80', '#2a5fbf', '#e2675c'],  // saved view
    float: 1.1,
    effects: { windowLight: 0.9, clouds: 0.9 },
    note: 'early hours: the light keeps searching',
  },
  {
    title: '我想和你一起', artist: 'Wendy Wander',
    camera: 'between', zoom: 0.731, angle: 46.6, orbit: 16.4, pan: [0, 0, 0], time: 8, sky: ['#0b74cf', '#f2a7b8', '#f3d66a'],  // saved view
    float: 1,
    birds: { count: 16, speed: 1 },
    note: 'I want to be with you — the birds keep crossing',
  },
  {
    title: '晚安台灣', artist: 'Fire EX.',
    camera: 'taiwan', zoom: 7.75, angle: 20.8, orbit: -19, pan: [-3.13, -5.61, -13.33], time: 0, sky: ['#0d2c80', '#2a5fbf', '#e2675c'],  // saved view
    float: 0.8,
    effects: { windowLight: 1, timezone: 0.3 },
    note: 'good night, Taiwan',
  },
  {
    title: '我在紐約打電話給你', artist: 'Waa Wei',
    camera: 'taiwan', zoom: 12.45, angle: 16.3, orbit: -61, pan: [-15.36, -8.36, -16.99], time: 0, sky: ['#3a3f9e', '#ff8a5a', '#ffcf6b'],  // saved view
    float: 1,
    effects: { timezone: 1 },
    note: 'calling from New York: one call, two times of day',
  },
  {
    title: '親愛的', artist: 'Deserts Chang',
    camera: 'taiwan', zoom: 2.265, angle: 0.6, orbit: 179.2, pan: [-15.4, 2.27, -18.51], time: 7, sky: ['#0d2c80', '#2a5fbf', '#e2675c'],  // saved view
    float: 4.6,
    birds: { count: 16, speed: 1 },
    note: 'dear — the world drifts apart, never fully settling',
  },
];
