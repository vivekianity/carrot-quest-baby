import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mulberry32, numberWords, letterName, glyph, letterRange, itemsFor, itemKey, parseKey,
  wrongAnswers, makeQuestion, createQuestionPicker, lookalike,
} from '../src/engine/questions.js';
import { createMastery } from '../src/engine/mastery.js';
import { LEVELS, levelConfig } from '../src/engine/levels-config.js';

test('number words and letter names for speech', () => {
  assert.equal(numberWords(7), 'seven');
  assert.equal(numberWords(20), 'twenty');
  assert.equal(letterName('A'), '{A}');
  assert.equal(letterName('w'), '{W}', 'little letters are said by their capital, which voices read as a name');
});

test('school-style a and g are shown; everything else is unchanged', () => {
  assert.equal(glyph('a'), 'ɑ');
  assert.equal(glyph('g'), 'ɡ');
  assert.equal(glyph('Ag7b'), 'Aɡ7b');
});

test('letter ranges, item keys and parsing', () => {
  assert.deepEqual(letterRange('A-E'), ['A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(letterRange('a-c'), ['A', 'B', 'C']);
  assert.equal(letterRange('A-Z').length, 26);
  assert.equal(itemKey('lower', 'b'), 'L:b');
  assert.deepEqual(parseKey('N:12'), { kind: 'number', value: 12 });
  assert.deepEqual(parseKey('M:Q'), { kind: 'match', value: 'Q' });
  assert.equal(parseKey('X:1'), null);
});

test('itemsFor builds every item a level can ask', () => {
  const items = itemsFor({ upper: 'A-C', lower: 'a-b', match: 'A-A', number: [1, 3], count: [2, 3] });
  assert.deepEqual(items.map((i) => i.key), ['U:A', 'U:B', 'U:C', 'L:a', 'L:b', 'M:A', 'N:1', 'N:2', 'N:3', 'C:2', 'C:3']);
});

test('wrong answers: right type, distinct, never the answer, no look-alikes for new items', () => {
  const rng = mulberry32(3);
  for (let i = 0; i < 200; i++) {
    const w = wrongAnswers({ kind: 'lower', value: 'b' }, { lower: 'a-z' }, 3, { rng });
    assert.equal(w.length, 3);
    assert.equal(new Set(w).size, 3);
    for (const v of w) {
      assert.match(v, /^[a-z]$/);
      assert.notEqual(v, 'b');
      assert.ok(!lookalike(v, 'b'), `${v} looks like b`);
    }
  }
  const nums = wrongAnswers({ kind: 'number', value: 6 }, { number: [1, 10] }, 3, { rng });
  assert.ok(nums.every((v) => /^\d+$/.test(v) && v !== '6' && v !== '9'));
});

test('a small level range is widened so there are always enough wrong answers', () => {
  const w = wrongAnswers({ kind: 'upper', value: 'A' }, { upper: 'A-B' }, 3, { rng: mulberry32(1) });
  assert.equal(w.length, 3);
  assert.ok(w.every((v) => /^[A-Z]$/.test(v) && v !== 'A'));
});

test('counting wrong answers stay close to the right count (1–10)', () => {
  const rng = mulberry32(9);
  for (let n = 1; n <= 10; n++) {
    const w = wrongAnswers({ kind: 'count', value: n }, { count: [1, 10] }, 2, { rng });
    for (const v of w) { assert.ok(Math.abs(Number(v) - n) <= 3); assert.ok(Number(v) >= 1 && Number(v) <= 10); }
  }
});

test('makeQuestion: answer is among the bubbles, with speech and a sign picture', () => {
  const rng = mulberry32(2);
  const up = makeQuestion({ kind: 'upper', value: 'B', key: 'U:B' }, { upper: 'A-E' }, { choices: 3, rng });
  assert.equal(up.answer, 'B');
  assert.equal(up.choices.length, 3);
  assert.ok(up.choices.includes('B'));
  assert.equal(up.speech, 'Find big {B}!');
  assert.equal(up.carve, '?', 'the gate never gives the answer away');

  const m = makeQuestion({ kind: 'match', value: 'D', key: 'M:D' }, { match: 'A-E' }, { choices: 2, rng });
  assert.equal(m.show, 'D');
  assert.equal(m.answer, 'd');
  assert.ok(m.choices.every((c) => /^[a-z]$/.test(c)));

  const c = makeQuestion({ kind: 'count', value: 4, key: 'C:4' }, { count: [1, 5] }, { choices: 2, rng });
  assert.equal(c.carrots, 4);
  assert.equal(c.answer, '4');
  assert.equal(c.speech, 'How many carrots?');

  const n = makeQuestion({ kind: 'number', value: 17, key: 'N:17' }, { number: [11, 20] }, { choices: 4, rng });
  assert.equal(n.speech, 'Find the number seventeen!');
  assert.equal(n.choices.length, 4);
});

test('picker: never the same item twice in a row, and kinds take turns', () => {
  const p = createQuestionPicker(levelConfig('1-1'), { rng: mulberry32(4) });
  let prev = null;
  for (let i = 0; i < 100; i++) {
    const q = p.next();
    if (prev) { assert.notEqual(q.key, prev.key); assert.notEqual(q.kind, prev.kind); }
    prev = q;
  }
});

test('picker: every kind in a level gets asked', () => {
  for (const l of LEVELS) {
    const p = createQuestionPicker(levelConfig(l.id), { rng: mulberry32(7) });
    const kinds = new Set();
    for (let i = 0; i < 60; i++) kinds.add(p.next().kind);
    assert.deepEqual([...kinds].sort(), Object.keys(l.items).sort(), l.id);
  }
});

test('picker: a first-try miss comes back after another question', () => {
  const p = createQuestionPicker(levelConfig('1-2'), { rng: mulberry32(8) });
  const q = p.next();
  p.recordResult(q, false);
  assert.deepEqual(p.pending, [q.key]);
  assert.notEqual(p.next().key, q.key, 'not straight away');
  assert.equal(p.next().key, q.key, 'back after one other question');
});

test('picker: letter questions get 5 bubbles, 6 once the letter is known, in every level', () => {
  for (const l of LEVELS) {
    const p = createQuestionPicker(l, { rng: mulberry32(3) });
    for (let i = 0; i < 40; i++) {
      const q = p.next();
      if (['upper', 'lower', 'match'].includes(q.kind)) assert.equal(q.choices.length, 5, l.id);
      assert.equal(new Set(q.choices).size, q.choices.length, 'no repeated bubbles');
    }
  }
  const m = createMastery();
  const p = createQuestionPicker({ items: { lower: 'a-c' }, maxChoices: 3 }, { rng: mulberry32(1), mastery: m });
  assert.equal(p.next().choices.length, 5);
  for (const k of ['L:a', 'L:b', 'L:c']) { m.record(k, { firstTry: true, ms: 1000 }); m.record(k, { firstTry: true, ms: 1000 }); }
  assert.equal(p.next().choices.length, 6);
});

test('picker: number bubbles start at 2 and grow with the child, capped by the level', () => {
  const m = createMastery();
  const cfg = { items: { number: [2, 2] }, maxChoices: 3 };
  const p = createQuestionPicker(cfg, { rng: mulberry32(1), mastery: m });
  assert.equal(p.next().choices.length, 2);
  m.record('N:2', { firstTry: true, ms: 1000 });
  m.record('N:2', { firstTry: true, ms: 1000 });
  assert.equal(p.next().choices.length, 3);
  m.record('N:2', { firstTry: true, ms: 1000 });
  assert.equal(m.status('N:2'), 'mastered');
  assert.equal(p.next().choices.length, 3, 'level 1 never shows more than 3');
  const p4 = createQuestionPicker({ ...cfg, maxChoices: 4 }, { rng: mulberry32(1), mastery: m });
  assert.equal(p4.next().choices.length, 4);
});

test('every level config is valid', () => {
  for (const l of LEVELS) {
    const items = itemsFor(l.items);
    assert.ok(items.length > 0, l.id);
    assert.ok(l.maxChoices >= 2 && l.maxChoices <= 4, l.id);
    for (const it of items) {
      if (it.kind === 'number') assert.ok(it.value >= 1 && it.value <= 20);
      if (it.kind === 'count') assert.ok(it.value >= 1 && it.value <= 10);
    }
  }
});
