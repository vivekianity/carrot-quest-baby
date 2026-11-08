// Level configs from GAME_DESIGN §3, baby edition (pure data + helpers; no Phaser, no DOM).
//
//  items       what this level asks (see src/engine/questions.js):
//                upper 'A-F' (find big letters) · lower 'a-e' (little letters) · match 'A-E' (big ↔ little)
//                number [lo, hi] (find the numeral) · count [lo, hi] (how many carrots?)
//  maxChoices  most bubbles a question can have here (each item starts at 2 and grows as it is learned)
//  element     the new platform element this level introduces
//  boss        the world's boss at the end of the second level

export const WORLDS = {
  meadow:   { name: 'Meadow Hills',    emoji: '🌼', boss: 'crow' },
  mushroom: { name: 'Mushroom Forest', emoji: '🍄', boss: 'owl' },
  beach:    { name: 'Sunny Beach',     emoji: '🏖️', boss: 'crab' },
  snow:     { name: 'Snowy Peaks',     emoji: '❄️', boss: 'penguin' },
  candy:    { name: 'Candy Clouds',    emoji: '🍭', boss: 'raccoon' },
};

export const LEVELS = [
  { id: '1-1', world: 'meadow',   maxChoices: 3, element: 'flat',      items: { upper: 'A-E', number: [1, 3], count: [1, 3] } },
  { id: '1-2', world: 'meadow',   maxChoices: 3, element: 'platforms', items: { upper: 'A-J', number: [1, 5], count: [1, 5] }, boss: 'crow' },
  { id: '2-1', world: 'mushroom', maxChoices: 3, element: 'mushrooms', items: { upper: 'A-M', lower: 'a-e', number: [1, 5], count: [1, 5] } },
  { id: '2-2', world: 'mushroom', maxChoices: 3, element: 'bridges',   items: { lower: 'a-j', match: 'A-E', number: [1, 10], count: [1, 5] }, boss: 'owl' },
  { id: '3-1', world: 'beach',    maxChoices: 4, element: 'turtles',   items: { upper: 'A-Z', lower: 'a-m', number: [1, 10], count: [1, 10] } },
  { id: '3-2', world: 'beach',    maxChoices: 4, element: 'swim',      items: { lower: 'a-m', match: 'A-M', number: [1, 10], count: [1, 10] }, boss: 'crab' },
  { id: '4-1', world: 'snow',     maxChoices: 4, element: 'ice',       items: { upper: 'A-Z', lower: 'a-z', number: [11, 15], count: [1, 10] } },
  { id: '4-2', world: 'snow',     maxChoices: 4, element: 'lifts',     items: { match: 'A-Z', number: [11, 20], count: [1, 10] }, boss: 'penguin' },
  { id: '5-1', world: 'candy',    maxChoices: 4, element: 'clouds',    items: { upper: 'A-Z', lower: 'a-z', match: 'A-Z', number: [1, 20] } },
  { id: '5-2', world: 'candy',    maxChoices: 4, element: 'rainbows',  items: { upper: 'A-Z', lower: 'a-z', match: 'A-Z', number: [1, 20], count: [1, 10] }, boss: 'raccoon' },
];

const EVERYTHING = { upper: 'A-Z', lower: 'a-z', match: 'A-Z', number: [1, 20], count: [1, 10] };

// After 5-2: Endless Meadow — a freshly generated level every round, mixing everything.
// The learning engine's weights (missed items ×3) do most of the choosing here.
export const ENDLESS = { id: 'endless', world: 'meadow', maxChoices: 4, element: 'endless', items: EVERYTHING, unlockAfter: '5-2' };

const copyItems = (items) => Object.fromEntries(Object.entries(items).map(([k, v]) => [k, Array.isArray(v) ? [...v] : v]));

/** Full config for a level id. Every answer is a tap on a bubble. */
export function levelConfig(id) {
  if (id === ENDLESS.id) {
    return { ...ENDLESS, items: copyItems(ENDLESS.items), answer: 'bubbles', boss: null, worldName: 'Endless Meadow' };
  }
  const base = LEVELS.find((l) => l.id === id);
  if (!base) throw new Error(`Unknown level ${id}`);
  return { ...base, items: copyItems(base.items), answer: 'bubbles', boss: base.boss || null, worldName: WORLDS[base.world].name };
}

export const LEVEL_IDS = LEVELS.map((l) => l.id);
