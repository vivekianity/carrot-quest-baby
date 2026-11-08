// The sticker book (GAME_DESIGN §8, baby edition) — pure: no Phaser, no DOM.
// One sticker per boss put to sleep (finishing that world's second level), and ten "champion"
// rosettes: big letters A–M and N–Z, little letters a–m and n–z, big ↔ little matching A–M and N–Z,
// numbers 1–10 and 11–20, and counting 1–5 and 6–10 — each earned when every item in it is mastered.

import { LEVELS, WORLDS } from './levels-config.js';
import { itemsFor } from './questions.js';

const BOSS_NAMES = { crow: 'Crow', owl: 'Owl', crab: 'Crab', penguin: 'Penguin', raccoon: 'Raccoon' };

// `badge` picks one of the ten rosette colours (badge-1 … badge-10); `label` is printed on it.
export const GROUPS = [
  { id: 'upper-am', label: 'A–M', name: 'Big A to M',       said: 'You know big {A} to {M}!',       items: { upper: 'A-M' } },
  { id: 'upper-nz', label: 'N–Z', name: 'Big N to Z',       said: 'You know big {N} to {Z}!',       items: { upper: 'N-Z' } },
  { id: 'lower-am', label: 'a–m', name: 'Little a to m',    said: 'You know little {A} to {M}!',    items: { lower: 'A-M' } },
  { id: 'lower-nz', label: 'n–z', name: 'Little n to z',    said: 'You know little {N} to {Z}!',    items: { lower: 'N-Z' } },
  { id: 'match-am', label: 'Aa–Mm', name: 'Matching A to M',  said: 'You can match {A} to {M}!',      items: { match: 'A-M' } },
  { id: 'match-nz', label: 'Nn–Zz', name: 'Matching N to Z',  said: 'You can match {N} to {Z}!',      items: { match: 'N-Z' } },
  { id: 'num-1',    label: '1–10',  name: 'Numbers 1 to 10',  said: 'You know numbers one to ten!',       items: { number: [1, 10] } },
  { id: 'num-11',   label: '11–20', name: 'Numbers 11 to 20', said: 'You know numbers eleven to twenty!', items: { number: [11, 20] } },
  { id: 'count-1',  label: '🥕5',  name: 'Counting to 5',    said: 'You can count to five!',     items: { count: [1, 5] } },
  { id: 'count-6',  label: '🥕10', name: 'Counting to 10',   said: 'You can count to ten!',      items: { count: [6, 10] } },
].map((g, i) => ({ ...g, keys: itemsFor(g.items).map((it) => it.key), badge: i + 1 }));

export const STICKERS = [
  ...LEVELS.filter((l) => l.boss).map((l) => ({
    id: `boss-${l.boss}`, kind: 'boss', boss: l.boss, level: l.id, world: l.world,
    name: `Sleepy ${BOSS_NAMES[l.boss]}`,
    hint: `Help ${BOSS_NAMES[l.boss]} fall asleep in level ${l.id}`,
    said: `${BOSS_NAMES[l.boss]} is fast asleep! Shh!`,
    worldName: WORLDS[l.world].name,
  })),
  ...GROUPS.map((g) => ({
    id: `group-${g.id}`, kind: 'group', group: g.id, badge: g.badge, label: g.label, keys: g.keys,
    name: g.name,
    hint: `Learn ${g.name.toLowerCase()}`,
    said: `${g.said} Champion!`,
  })),
];

export const stickerById = (id) => STICKERS.find((s) => s.id === id) || null;

/**
 * Which stickers are earned. `isDone(levelId)` says if a level is finished;
 * `allMastered(keys)` says if every item key in a list is mastered (from the learning engine).
 */
export function earnedStickers({ isDone, allMastered }) {
  return STICKERS.filter((s) => (s.kind === 'boss' ? isDone(s.level) : allMastered(s.keys))).map((s) => s.id);
}

/** Earned stickers the child hasn't looked at in the book yet (they get a "New!" badge and peel on). */
export function unseenStickers(earned, seen = []) {
  const s = new Set(seen);
  return earned.filter((id) => !s.has(id));
}

/**
 * Group stickers completed by `key` becoming mastered (so a toast can pop up in the level). Call it only
 * when `key` has just become mastered: a group containing it can't have been complete before.
 */
export function newlyEarnedGroups(key, allMastered) {
  return STICKERS.filter((s) => s.kind === 'group' && s.keys.includes(key) && allMastered(s.keys));
}
