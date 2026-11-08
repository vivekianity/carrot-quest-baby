import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, LEVEL_IDS, WORLDS, levelConfig, ENDLESS } from '../src/engine/levels-config.js';

test('ten levels across five worlds, a boss at the end of each world', () => {
  assert.equal(LEVELS.length, 10);
  assert.deepEqual(LEVEL_IDS, ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2', '5-1', '5-2']);
  for (const w of Object.keys(WORLDS)) assert.equal(LEVELS.filter((l) => l.world === w && l.boss).length, 1, w);
});

test('it starts gently: big letters, numbers to 3 and counting to 3, at most 3 bubbles', () => {
  const c = levelConfig('1-1');
  assert.deepEqual(c.items, { upper: 'A-E', number: [1, 3], count: [1, 3] });
  assert.equal(c.maxChoices, 3);
  assert.equal(c.answer, 'bubbles');
});

test('by the end every kind of question has appeared, with numbers up to 20', () => {
  const kinds = new Set(LEVELS.flatMap((l) => Object.keys(l.items)));
  assert.deepEqual([...kinds].sort(), ['count', 'lower', 'match', 'number', 'upper']);
  assert.equal(Math.max(...LEVELS.filter((l) => l.items.number).map((l) => l.items.number[1])), 20);
});

test('levelConfig copies (editing a config never changes the table) and knows Endless Meadow', () => {
  const a = levelConfig('2-2');
  a.items.number[1] = 99;
  assert.equal(levelConfig('2-2').items.number[1], 10);
  assert.equal(levelConfig(ENDLESS.id).worldName, 'Endless Meadow');
  assert.throws(() => levelConfig('9-9'));
});
