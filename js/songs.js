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
    camera: 'taiwan', zoom: 2.162, angle: 25.1, orbit: 13.6, pan: [0, 0, 0], time: 11, sky: ['#5aa6e6', '#efe6d4', '#79c25a'],  // saved view
    float: 0.9,
    effects: { timezone: 0.4 },
    note: 'the small town left behind',
  },
  {
    title: '回家', artist: 'Shunza',
    camera: 'busstop', zoom: 3.258, angle: 16, orbit: 0, pan: [0, 0, 0], time: 10, sky: ['#1d56d6', '#b69ae4', '#ff4b3a'],  // saved view
    float: 1,
    birds: { count: 14, speed: 1 },
    note: 'going home: the bus pulls in at the stop (Taiwan 10:00)',
  },
  {
    title: '想厝的人', artist: '詹雅雯',
    camera: 'window', zoom: 3.695, angle: -1.2, orbit: -96.1, pan: [-0.24, 1.5, -6.22], time: 11, sky: ['#5aa6e6', '#efe6d4', '#79c25a'],  // saved view
    float: 0.6,
    effects: { windowLight: 1 },
    note: 'someone missing home — looking in',
  },
  {
    title: '想家', artist: '卓文萱',
    camera: 'window', zoom: 5.055, angle: -1.4, orbit: -40.8, pan: [-3.26, 1.13, 29.73], time: 19, sky: ['#3a3f9e', '#ff8a5a', '#ffcf6b'],  // saved view
    float: 1,
    effects: { timezone: 1 },
    note: 'homesick: same sky, different hours',
  },
  {
    title: '浪流連', artist: 'EggPlantEgg',
    camera: 'window', zoom: 3.807, angle: 5.8, orbit: 103.4, pan: [48.11, -8.07, 22.79], time: 5, sky: ['#7fb3ea', '#f7d7c4', '#f3d98a'],  // saved view
    float: 2.8,
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
    camera: 'taiwan', zoom: 2.981, angle: -2.1, orbit: -15.5, pan: [-15.36, -8.36, -16.99], time: 0, sky: ['#3a3f9e', '#ff8a5a', '#ffcf6b'],  // saved view
    float: 1.2,
    note: 'oversized luggage',
  },
  {
    title: '不想去遠方', artist: 'Crowd Lu',
    camera: 'lookout', time: 18, viewVersion: 2,
    float: 0.4,
    note: "don't want to go far: from a room, out to the mountains and the neighbors (Taiwan 18:00)",
  },
  {
    title: '浴室', artist: 'deca joins',
    camera: 'bathroom', time: 11, sky: ['#7fb3ea', '#f7d7c4', '#f3d98a'], viewVersion: 2,
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
    camera: 'twobirds', time: 8, sky: ['#0b74cf', '#f2a7b8', '#f3d66a'], viewVersion: 2,
    float: 1.8,                // a little displacement
    birds: { count: 16, speed: 1 },
    note: 'I want to be with you — the birds keep crossing',
  },
  {
    title: '晚安台灣', artist: 'Fire EX.',
    camera: 'roadtrip', time: 0, sky: ['#0d2c80', '#2a5fbf', '#e2675c'], viewVersion: 2,
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
  {
    title: '旅行的意義', artist: 'Cheer Chen',
    camera: 'plane', float: 1, time: 10,
    note: 'the meaning of travel: following the plane',
  },
  {
    title: '魚', artist: 'Cheer Chen',
    camera: 'flyers', zoom: 3.317, angle: 0.9, orbit: -118.8, pan: [24.5, 0.51, -18.79], time: 15, sky: ['#0b74cf', '#f2a7b8', '#f3d66a'],  // saved view
    float: 1.2, viewVersion: 2,
    note: 'neon fish spiraling round the wind turbine',
  },
  {
    title: '忽然之間', artist: 'Karen Mok',
    camera: 'overview', zoom: 2.374, angle: -20, orbit: -2.2, pan: [25.25, 16.79, -9.35], time: 10, sky: ['#5aa6e6', '#efe6d4', '#79c25a'],  // saved view
    float: 2.6, viewVersion: 2,
    note: 'suddenly: a big clock floating as the world comes apart',
  },
  {
    title: '抱著你', artist: 'Zhang Zhen Yue',
    camera: 'window', zoom: 7.775, angle: -6.9, orbit: -29.1, pan: [-0.99, -0.2, 2.17], time: 22, sky: ['#0d2c80', '#2a5fbf', '#e2675c'],  // saved view
    float: 0.6,
    effects: { windowLight: 1 },
    note: 'holding you: a lit room at night',
  },
  {
    title: '我給的愛', artist: 'Naiwen Yang',
    camera: 'ladder', zoom: 5.505, angle: -4.9, orbit: -164.4, pan: [-1.03, 2.93, -0.32], time: 11, sky: ['#0b74cf', '#f2a7b8', '#f3d66a'],  // saved view
    float: 0.8,
    effects: { windowLight: 1 },
    note: 'the love I gave: fireflies round the window at the top of the ladder',
  },
  {
    title: '牽掛', artist: 'Wu Bai',
    camera: 'bridge', zoom: 5.046, angle: 0.6, orbit: -171, pan: [1.98, 4.31, -0.36], time: 19, sky: ['#24357f', '#c48bb8', '#f6b26b'],  // saved view
    float: 0.8,
    note: 'worrying for someone: the bridge between two places',
  },
  {
    title: '一桌菜', artist: 'Cosmos People',
    camera: 'bridge', zoom: 8.815, angle: 13.4, orbit: -97.7, pan: [-27.63, -1.68, 21.47], time: 19, sky: ['#24357f', '#c48bb8', '#f6b26b'],  // saved view
    float: 0.8,
    note: 'a table of food: a round red table, the window on the island',
  },
  {
    title: '無眠', artist: 'sodagreen',
    camera: 'nywindow', zoom: 6.673, angle: 5, orbit: 0, pan: [0, 0, 0], time: 14, sky: ['#1d56d6', '#b69ae4', '#ff4b3a'],  // saved view
    float: 0.7,
    effects: { windowLight: 1 },
    note: 'sleepless: 2 a.m. in New York',
  },
  {
    title: '台北某個地方', artist: 'Cheer Chen',
    camera: 'taiwan', zoom: 5.715, angle: 9.7, orbit: -144.8, pan: [-12.64, -6.68, -6.86], time: 17, sky: ['#7fb3ea', '#f7d7c4', '#f3d98a'],  // saved view
    float: 0.8, viewVersion: 2,
    note: 'somewhere in Taipei: laundry drying in the wind',
  },
  {
    title: '愛我別走', artist: 'Zhang Zhen Yue',
    camera: 'taiwan', zoom: 4.017, angle: 7.9, orbit: -434.5, pan: [-8.6, -11.81, -4.36], time: 17, sky: ['#5aa6e6', '#efe6d4', '#79c25a'],  // saved view
    float: 1,
    note: "don't leave: the luggage keeps going round",
  },
  {
    title: 'San Francisco Street', artist: 'Sun Rai',
    camera: 'crossroads', zoom: 4.312, angle: 85, orbit: 9.4, pan: [0.87, 0.4, -1.94], time: 23, sky: ['#5aa6e6', '#efe6d4', '#79c25a'],  // saved view
    float: 1,
    note: 'a street at night (New York 21:00)',
  },
  {
    title: 'Love Lee', artist: 'AKMU',
    camera: 'crossroads', zoom: 2.471, angle: 21.2, orbit: 53.8, pan: [0.87, 0.4, -1.94], time: 23, sky: ['#5aa6e6', '#efe6d4', '#79c25a'],  // saved view
    float: 1,
    birds: { count: 16, speed: 2 },
    note: 'light and playful: the camera orbits the Big Apple',
  },
  {
    title: 'Lucky', artist: 'Jason Mraz, Colbie Caillat',
    camera: 'busstop', zoom: 1.904, angle: -12.8, orbit: 1.6, pan: [-4.01, 11.27, 1.03], time: 11, sky: ['#7fb3ea', '#f7d7c4', '#f3d98a'],  // saved view
    float: 0.8,
    note: 'an easy afternoon at the bus stop',
  },
  {
    title: 'Soft Spot', artist: 'keshi',
    camera: 'grove', float: 0.8, time: 18,
    note: 'soft dusk in the grove',
  },
  {
    title: '未接來電', artist: 'Naiwen Yang',
    camera: 'grove', zoom: 1.856, angle: 0.9, orbit: 78.5, pan: [1.95, 7.85, 10.99], time: 18, sky: ['#24357f', '#c48bb8', '#f6b26b'],  // saved view
    float: 1,
    effects: { split: 1 },
    note: 'a missed call across the time difference: night | day, phones and radios adrift',
  },
  {
    title: '勇氣', artist: 'Zhang Zhen Yue',
    camera: 'grove', zoom: 1.078, angle: -15.4, orbit: -154.1, pan: [3.36, 7.24, 10.18], time: 11, sky: ['#5aa6e6', '#efe6d4', '#79c25a'],  // saved view
    float: 0.8,
    note: 'courage: the sun lined up down the street',
  },
];
