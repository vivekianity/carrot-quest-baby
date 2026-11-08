// Question generation for Carrot Quest Baby (pure: no Phaser, no DOM). Pass an `rng` for repeatable tests.
//
// Five kinds of question, all answered by tapping one of 2–4 big bubbles. Hoppy says every question
// out loud (a 3-year-old can't read), and the sign shows a picture when one is needed.
//   upper   "Find big B!"                      bubbles: B, F, K        key 'U:B'
//   lower   "Find little b!"                   bubbles: b, h, m        key 'L:b'
//   match   sign shows B, "Find little b!"     bubbles: b, e, s        key 'M:B'
//   number  "Find the number 7!"               bubbles: 7, 2, 12       key 'N:7'
//   count   sign shows 4 carrots, "How many?"  bubbles: 4, 2, 6        key 'C:4'

/** Small seeded random generator (returns 0 ≤ x < 1). */
export function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 0..100 in words, for speech ("twenty-one"). */
export function numberWords(n) {
  if (n < 0 || !Number.isInteger(n)) return String(n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n === 100) return 'one hundred';
  return String(n);
}

/** Children learn the "school" shapes of a and g (ɑ, ɡ), so those are what the game shows. */
export const glyph = (s) => String(s).replace(/a/g, 'ɑ').replace(/g/g, 'ɡ');

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * A letter inside a spoken sentence, marked as {A}. Voices read a letter inside a sentence as a word
 * ("big A" → "big uh", spellings like "ay" → "aye"), so speak() says each marked letter as its own
 * one-letter utterance — and a lone capital letter is always read as its name.
 */
export const letterName = (ch) => `{${String(ch).toUpperCase()}}`;

/** Things that are easy to mix up; never offered against each other until the item is mastered. */
const LOOKALIKES = [['b', 'd'], ['b', 'p'], ['d', 'q'], ['p', 'q'], ['m', 'w'], ['n', 'u'], ['i', 'l'], ['i', 'j'],
  ['M', 'W'], ['N', 'Z'], ['E', 'F'], ['O', 'Q'], ['C', 'G'], ['I', 'L'], ['6', '9'], ['12', '21']];
export const lookalike = (x, y) => LOOKALIKES.some(([p, q]) => (p === x && q === y) || (p === y && q === x));

export const KINDS = ['upper', 'lower', 'match', 'number', 'count'];
const PREFIX = { upper: 'U', lower: 'L', match: 'M', number: 'N', count: 'C' };
const KIND_OF = Object.fromEntries(Object.entries(PREFIX).map(([k, p]) => [p, k]));

export const itemKey = (kind, value) => `${PREFIX[kind]}:${value}`;
export function parseKey(key) {
  const [p, v] = String(key).split(':');
  const kind = KIND_OF[p];
  if (!kind || v === undefined || v === '') return null;
  return { kind, value: kind === 'number' || kind === 'count' ? Number(v) : v };
}

/** 'A-F' → ['A', … 'F']. */
export function letterRange(spec) {
  const [from, to] = String(spec).toUpperCase().split('-');
  const i = ALPHABET.indexOf(from), j = ALPHABET.indexOf(to || from);
  return i < 0 || j < i ? [] : ALPHABET.slice(i, j + 1);
}
export const range = ([lo, hi]) => Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);

/**
 * Every item a level can ask, from its spec:
 *   { upper: 'A-F', lower: 'a-e', match: 'A-E', number: [1, 5], count: [1, 3] }
 * Items are { kind, value, key }. Upper/match values are capitals, lower values are small letters.
 */
export function itemsFor(spec) {
  const out = [];
  const add = (kind, values) => values.forEach((value) => out.push({ kind, value, key: itemKey(kind, value) }));
  if (spec.upper) add('upper', letterRange(spec.upper));
  if (spec.lower) add('lower', letterRange(spec.lower).map((c) => c.toLowerCase()));
  if (spec.match) add('match', letterRange(spec.match));
  if (spec.number) add('number', range(spec.number));
  if (spec.count) add('count', range(spec.count));
  return out;
}

const LOWER = ALPHABET.map((c) => c.toLowerCase());

/** What goes on the bubbles for an item: the answer, the level's pool of wrong answers, and the wider pool. */
function answerAndPool(item, spec) {
  const { kind, value } = item;
  if (kind === 'upper') return { answer: value, pool: spec.upper ? letterRange(spec.upper) : ALPHABET, wide: ALPHABET };
  if (kind === 'lower') return { answer: value, pool: spec.lower ? letterRange(spec.lower).map((c) => c.toLowerCase()) : LOWER, wide: LOWER };
  if (kind === 'match') return { answer: value.toLowerCase(), pool: spec.match ? letterRange(spec.match).map((c) => c.toLowerCase()) : LOWER, wide: LOWER };
  if (kind === 'number') return { answer: String(value), pool: range(spec.number || [1, 20]).map(String), wide: range([1, 20]).map(String) };
  const hi = Math.min(10, Math.max(spec.count ? spec.count[1] : 10, value + 2));
  return { answer: String(value), pool: range([1, hi]).map(String), wide: range([1, 10]).map(String) };
}

/**
 * `count` different wrong answers from the level's range (widened to A–Z / 1–20 when it is too small).
 * Look-alikes (b/d, 6/9 …) are left out unless `allowLookalikes`.
 */
export function wrongAnswers(item, spec, count, { rng = Math.random, allowLookalikes = false } = {}) {
  const { answer, pool, wide } = answerAndPool(item, spec);
  const ok = (v) => v !== answer && (allowLookalikes || !lookalike(v, answer));
  let cands = [...new Set(pool)].filter(ok);
  if (cands.length < count) cands = [...new Set([...cands, ...wide.filter(ok)])];
  if (item.kind === 'count') {
    // Counts 1–3 away come first, so the carrots really have to be counted.
    const n = Number(answer);
    const near = shuffle(cands.filter((v) => Math.abs(Number(v) - n) <= 3), rng);
    const far = shuffle(cands.filter((v) => Math.abs(Number(v) - n) > 3), rng);
    return [...near, ...far].slice(0, count);
  }
  return shuffle(cands, rng).slice(0, count);
}

/** A ready-to-show question with shuffled bubbles. */
export function makeQuestion(item, spec = {}, { choices = 2, rng = Math.random, allowLookalikes = false } = {}) {
  const { kind, value } = item;
  const { answer } = answerAndPool(item, spec);
  const q = {
    kind, value, answer, key: item.key, id: item.key,
    choices: shuffle([answer, ...wrongAnswers(item, spec, choices - 1, { rng, allowLookalikes })], rng),
    show: null,        // a letter shown on the sign from the start (match questions)
    carrots: 0,        // carrots drawn on the sign (count questions)
  };
  const n = letterName(value);
  if (kind === 'upper') {
    Object.assign(q, { carve: '?', speech: `Find big ${n}!`, said: `That's big ${n}!` });
  } else if (kind === 'lower') {
    Object.assign(q, { carve: '?', speech: `Find little ${n}!`, said: `That's little ${n}!` });
  } else if (kind === 'match') {
    Object.assign(q, { show: value, carve: value, speech: `This is big ${n}. Find little ${n}!`, said: `Big ${n} and little ${n}!` });
  } else if (kind === 'number') {
    Object.assign(q, { carve: '?', speech: `Find the number ${numberWords(value)}!`, said: `That's ${numberWords(value)}!` });
  } else {
    Object.assign(q, { carrots: value, carve: '🥕', speech: 'How many carrots?', said: `${numberWords(value)} carrot${value === 1 ? '' : 's'}!` });
  }
  return q;
}

/**
 * Picks the questions for one play-through of a level.
 *  - never the same item twice in a row, and the kind of question changes whenever it can
 *  - each kind is equally likely (so 26 letters don't crowd out 3 counting questions)
 *  - items used less often in this level are preferred
 *  - an item missed on the first try comes back later (after at least one other question)
 *  - `mastery` (src/engine/mastery.js): missed items are picked more, known ones less, and the number
 *    of bubbles grows with how well the child knows the item (2 → 3 → 4, up to config.maxChoices)
 */
export function createQuestionPicker(config, { rng = Math.random, mastery = null } = {}) {
  const spec = config.items;
  const items = itemsFor(spec);
  if (!items.length) throw new Error('A level needs at least one kind of question');
  const maxChoices = config.maxChoices || 3;
  const weight = (it) => (mastery ? mastery.weight(it.key) : 1);

  let last = null;
  let served = 0;
  const seen = new Map();
  const comeBack = [];

  function pick() {
    let cands = items.filter((it) => !last || (it.key !== last.key && it.kind !== last.kind));
    if (!cands.length) cands = items.filter((it) => !last || it.key !== last.key);
    if (!cands.length) cands = items;
    const kinds = [...new Set(cands.map((it) => it.kind))];
    const kind = kinds[Math.floor(rng() * kinds.length)];
    const pool = cands.filter((it) => it.kind === kind);
    const ws = pool.map((it) => Math.max(0, weight(it)) / (1 + 2 * (seen.get(it.key) || 0)));
    const total = ws.reduce((s, w) => s + w, 0);
    if (total <= 0) return pool[Math.floor(rng() * pool.length)];
    let r = rng() * total;
    for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r < 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  return {
    next() {
      served++;
      let item = null;
      const due = comeBack.findIndex((c) => c.due <= served && (!last || c.item.key !== last.key));
      if (due >= 0) item = comeBack.splice(due, 1)[0].item;
      if (!item) item = pick();
      last = item;
      seen.set(item.key, (seen.get(item.key) || 0) + 1);
      const choices = mastery ? mastery.choicesFor(item.key, maxChoices) : Math.min(2, maxChoices);
      const allowLookalikes = !!mastery && mastery.status(item.key) === 'mastered';
      return makeQuestion(item, spec, { choices, rng, allowLookalikes });
    },
    /** Tell the picker how it went; a first-try miss brings the item back later in the level. */
    recordResult(q, firstTry) {
      if (firstTry || comeBack.some((c) => c.item.key === q.key)) return;
      comeBack.push({ item: { kind: q.kind, value: q.value, key: q.key }, due: served + 2 });
    },
    get pending() { return comeBack.map((c) => c.item.key); },
  };
}
