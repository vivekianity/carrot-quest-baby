// Learning engine (GAME_DESIGN §7, baby edition) — pure: no Phaser, no DOM. One instance per child profile.
//
//  - Every item is tracked on its own by its key ('U:B' big B, 'L:b' little b, 'M:B' match B↔b,
//    'N:7' number 7, 'C:4' count 4 carrots): attempts, right first try, average answer time, last seen.
//  - Mastered = right on the first try MASTERY_RUN times in a row, each in under MASTERY_MS.
//    A first-try miss (or a slow answer) starts the run again; a miss on a mastered item makes it
//    "learning" again.
//  - Recently missed items are MISSED_WEIGHT× more likely to be picked; mastered items still come back
//    now and then (MASTERED_WEIGHT).
//  - Bubbles grow with the child: 2 for a new item, 3 once it has been got right first time twice,
//    4 once it is mastered (never more than the level allows).
//
// Saved shape (plain JSON):
//  { v: 2, seq, facts: { 'U:B': { n, ok, ms, last, run, m, miss } } }

export const MASTERY_RUN = 3;
export const MASTERY_MS = 10000;
export const MISSED_WEIGHT = 3;
export const MASTERED_WEIGHT = 0.3;
export const RECENT_WINDOW = 30;      // a miss counts as "recent" for this many answers
export const OK_FOR_THREE = 2;        // first-try rights before an item gets a third bubble

const KEY_RE = /^[ULMNC]:[A-Za-z0-9]+$/;

function emptyFact() {
  return { n: 0, ok: 0, ms: 0, last: 0, run: 0, m: 0, miss: null };
}

/** A fresh, empty record (what a new profile starts with). */
export function emptyMastery() {
  return { v: 2, seq: 0, facts: {} };
}

export function createMastery(saved = null) {
  const data = emptyMastery();
  if (saved && typeof saved === 'object') {
    data.seq = Number(saved.seq) || 0;
    if (saved.facts && typeof saved.facts === 'object') {
      for (const [k, f] of Object.entries(saved.facts)) if (KEY_RE.test(k)) data.facts[k] = { ...emptyFact(), ...f };
    }
  }

  const get = (key) => data.facts[key] || null;

  const api = {
    /** 'new' (never seen), 'learning' or 'mastered'. */
    status(key) {
      const f = get(key);
      if (!f || !f.n) return 'new';
      return f.m ? 'mastered' : 'learning';
    },

    fact(key) { const f = get(key); return f ? { ...f } : null; },

    /** True if this item was missed on the first try recently and not yet answered right since. */
    recentlyMissed(key) {
      const f = get(key);
      return !!f && f.miss !== null && data.seq - f.miss < RECENT_WINDOW;
    },

    /** Picking weight: missed ×3, mastered ×0.3, everything else ×1. */
    weight(key) {
      if (api.recentlyMissed(key)) return MISSED_WEIGHT;
      if (api.status(key) === 'mastered') return MASTERED_WEIGHT;
      return 1;
    },

    /** How many bubbles to offer for this item: 2 → 3 → 4 as it is learned, capped at `max`. */
    choicesFor(key, max = 4) {
      const f = get(key);
      let n = 2;
      if (f && f.m) n = 4;
      else if (f && f.ok >= OK_FOR_THREE && !api.recentlyMissed(key)) n = 3;
      return Math.max(2, Math.min(n, max));
    },

    /**
     * Record how a question went. `firstTry`: right on the first try; `ms`: time to answer.
     * Returns what changed: { mastered, lost }.
     */
    record(key, { firstTry, ms = 0, now = Date.now() } = {}) {
      if (!KEY_RE.test(key)) throw new Error(`Bad item key ${key}`);
      const f = data.facts[key] || (data.facts[key] = emptyFact());
      data.seq++;
      f.n++;
      f.ms = Math.round(f.ms + ((Math.max(0, ms) - f.ms) / f.n));
      f.last = now;
      const out = { mastered: false, lost: false };
      if (firstTry) {
        f.ok++;
        f.miss = null;
        f.run = ms < MASTERY_MS ? f.run + 1 : 0;
        if (!f.m && f.run >= MASTERY_RUN) { f.m = 1; out.mastered = true; }
      } else {
        f.run = 0;
        f.miss = data.seq;
        if (f.m) { f.m = 0; out.lost = true; }
      }
      return out;
    },

    /** True when every key in the list is mastered (used for the sticker book). */
    allMastered(keys) { return keys.length > 0 && keys.every((k) => api.status(k) === 'mastered'); },

    /** Counts of new / learning / mastered among the given keys. */
    summary(keys) {
      const out = { new: 0, learning: 0, mastered: 0 };
      for (const k of keys) out[api.status(k)]++;
      return out;
    },

    toJSON() {
      return { v: 2, seq: data.seq, facts: JSON.parse(JSON.stringify(data.facts)) };
    },
  };
  return api;
}
