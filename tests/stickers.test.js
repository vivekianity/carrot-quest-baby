import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STICKERS, GROUPS, earnedStickers, unseenStickers, newlyEarnedGroups, stickerById } from '../src/engine/stickers.js';
import { createMastery, MASTERY_RUN } from '../src/engine/mastery.js';

test('five boss stickers and ten champion rosettes', () => {
  assert.equal(STICKERS.filter((s) => s.kind === 'boss').length, 5);
  assert.equal(STICKERS.filter((s) => s.kind === 'group').length, 10);
  assert.deepEqual(GROUPS.map((g) => g.badge), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(stickerById('group-upper-am').keys.length, 13);
  assert.equal(stickerById('group-num-11').keys.length, 10);
  assert.equal(stickerById('group-count-6').keys[0], 'C:6');
});

test('every letter A–Z (big, little, matching), number 1–20 and count 1–10 belongs to exactly one group', () => {
  const all = GROUPS.flatMap((g) => g.keys);
  assert.equal(new Set(all).size, all.length);
  assert.equal(all.length, 26 * 3 + 20 + 10);
});

test('earned: bosses by finished levels, groups by mastery', () => {
  const m = createMastery();
  for (const k of stickerById('group-count-1').keys) for (let i = 0; i < MASTERY_RUN; i++) m.record(k, { firstTry: true, ms: 500 });
  const earned = earnedStickers({ isDone: (id) => id === '1-2', allMastered: (keys) => m.allMastered(keys) });
  assert.deepEqual(earned.sort(), ['boss-crow', 'group-count-1']);
  assert.deepEqual(unseenStickers(earned, ['boss-crow']), ['group-count-1']);
});

test('newlyEarnedGroups finds the group completed by the item just mastered', () => {
  const m = createMastery();
  const keys = stickerById('group-count-1').keys;
  for (const k of keys.slice(0, -1)) for (let i = 0; i < MASTERY_RUN; i++) m.record(k, { firstTry: true, ms: 500 });
  const last = keys[keys.length - 1];
  assert.deepEqual(newlyEarnedGroups(last, (ks) => m.allMastered(ks)), []);
  for (let i = 0; i < MASTERY_RUN; i++) m.record(last, { firstTry: true, ms: 500 });
  assert.deepEqual(newlyEarnedGroups(last, (ks) => m.allMastered(ks)).map((s) => s.id), ['group-count-1']);
});
