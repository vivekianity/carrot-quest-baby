import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMastery, MASTERY_RUN, MASTERY_MS, MISSED_WEIGHT, MASTERED_WEIGHT } from '../src/engine/mastery.js';

test('new items are new; three fast first-try rights in a row master an item', () => {
  const m = createMastery();
  assert.equal(m.status('U:A'), 'new');
  for (let i = 0; i < MASTERY_RUN - 1; i++) m.record('U:A', { firstTry: true, ms: 2000 });
  assert.equal(m.status('U:A'), 'learning');
  assert.equal(m.record('U:A', { firstTry: true, ms: 2000 }).mastered, true);
  assert.equal(m.status('U:A'), 'mastered');
});

test('a slow answer or a miss restarts the run; a miss on a mastered item un-masters it', () => {
  const m = createMastery();
  m.record('N:5', { firstTry: true, ms: 1000 });
  m.record('N:5', { firstTry: true, ms: MASTERY_MS + 1 });
  m.record('N:5', { firstTry: true, ms: 1000 });
  m.record('N:5', { firstTry: true, ms: 1000 });
  assert.equal(m.status('N:5'), 'learning');
  m.record('N:5', { firstTry: true, ms: 1000 });
  assert.equal(m.status('N:5'), 'mastered');
  assert.equal(m.record('N:5', { firstTry: false }).lost, true);
  assert.equal(m.status('N:5'), 'learning');
});

test('weights: missed items ×3, mastered ×0.3', () => {
  const m = createMastery();
  m.record('L:b', { firstTry: false });
  assert.equal(m.weight('L:b'), MISSED_WEIGHT);
  for (let i = 0; i < MASTERY_RUN; i++) m.record('C:3', { firstTry: true, ms: 500 });
  assert.equal(m.weight('C:3'), MASTERED_WEIGHT);
  assert.equal(m.weight('U:Q'), 1);
});

test('choicesFor: 2 → 3 → 4 as an item is learned, a recent miss drops back to 2', () => {
  const m = createMastery();
  assert.equal(m.choicesFor('M:A'), 2);
  m.record('M:A', { firstTry: true, ms: 500 });
  assert.equal(m.choicesFor('M:A'), 2);
  m.record('M:A', { firstTry: true, ms: 500 });
  assert.equal(m.choicesFor('M:A'), 3);
  m.record('M:A', { firstTry: true, ms: 500 });
  assert.equal(m.choicesFor('M:A'), 4);
  assert.equal(m.choicesFor('M:A', 3), 3);
  m.record('M:A', { firstTry: false });
  assert.equal(m.choicesFor('M:A'), 2);
});

test('allMastered and summary over a list of keys', () => {
  const m = createMastery();
  for (const k of ['C:1', 'C:2']) for (let i = 0; i < MASTERY_RUN; i++) m.record(k, { firstTry: true, ms: 500 });
  assert.equal(m.allMastered(['C:1', 'C:2']), true);
  assert.equal(m.allMastered(['C:1', 'C:3']), false);
  assert.equal(m.allMastered([]), false);
  assert.deepEqual(m.summary(['C:1', 'C:2', 'C:3']), { new: 1, learning: 0, mastered: 2 });
});

test('saves and loads as plain JSON; junk keys are dropped', () => {
  const m = createMastery();
  m.record('U:A', { firstTry: true, ms: 900 });
  const json = JSON.parse(JSON.stringify(m.toJSON()));
  json.facts['3x4'] = { n: 1 };
  const back = createMastery(json);
  assert.deepEqual(back.fact('U:A'), m.fact('U:A'));
  assert.equal(back.fact('3x4'), null);
  assert.throws(() => m.record('nonsense', { firstTry: true }));
});
