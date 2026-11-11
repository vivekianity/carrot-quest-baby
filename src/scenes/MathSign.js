// MathSign (baby edition): overlay scene. A wooden sign slides up, Hoppy says the question out loud
// ("Find big B!", "How many carrots?") and 2–4 big bubbles float underneath. A 3-year-old can't read,
// so the voice carries the question; the big 🔊 button says it again.
// 1st miss → a helping hint: the letter/number appears on the sign to match, or the carrots are
//            counted together one by one.
// 2nd miss → the right bubble glows and Hoppy says "Tap it!". No red X, no buzzer, no way to fail.
// (The scene keeps the name MathSign so the level code is shared with Carrot Quest.)
import { sfx, unlockAudio } from '../audio.js';
import { speak, unlockSpeech, speechAvailable } from '../speech.js';
import { settings } from '../save.js';
import { numberWords, letterName, glyph } from '../engine/questions.js';
import { createPraise } from '../engine/praise.js';

const FONT = 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif';
const INK = '#5a3518';
const GREEN = '#2f7a24';
const FAINT = '#c9a77a';
const BOARD_Y = 250;
const BUBBLE_Y = 598;
const praise = createPraise();

/** What to call the answer out loud: "big B", "little b", "seven". */
function answerWords(q) {
  if (q.kind === 'upper') return `big ${letterName(q.answer)}`;
  if (q.kind === 'lower' || q.kind === 'match') return `little ${letterName(q.answer)}`;
  return numberWords(Number(q.answer));
}

export class MathSignScene extends Phaser.Scene {
  constructor() { super('MathSign'); }

  init(data) {
    this.q = data.question;
    this.onDone = data.onDone;
    this.onCorrect = data.onCorrect || null;
    this.progress = data.progress || null;   // { index, total } for multi-question boss gates
    this.attempts = 0;
    this.locked = true;
    this.startTime = 0;
    this.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // With speech off there is no way to hear the question, so the letter/number is shown from the start.
    this.silent = !speechAvailable || !settings.speech;
  }

  create() {
    const q = this.q;
    this.input.on('pointerdown', () => { unlockAudio(); unlockSpeech(); });

    this.backdrop = this.add.rectangle(640, 360, 1280, 720, 0x1d3347, 1).setAlpha(0);
    this.tweens.add({ targets: this.backdrop, alpha: 0.3, duration: 300 });

    // --- The sign -------------------------------------------------------------------------
    this.board = this.add.container(640, 720 + 260);
    const postL = this.add.image(-300, 120, 'signpost').setOrigin(0.5, 0);
    const postR = this.add.image(300, 120, 'signpost').setOrigin(0.5, 0);
    const sign = this.add.image(0, 0, 'sign');
    this.caption = this.add.text(0, -178, '', {
      fontFamily: FONT, fontSize: '38px', fontStyle: 'bold', color: '#ffffff', stroke: INK, strokeThickness: 9,
    }).setOrigin(0.5).setAlpha(0);
    // A big "say it again" button: the question is spoken, so it must be easy to hear twice.
    this.speakBtn = this.add.image(392, -128, 'btnSpeak').setScale(1.15).setInteractive({ useHandCursor: true });
    this.speakBtn.on('pointerdown', () => {
      this.tweens.add({ targets: this.speakBtn, scale: 1.0, duration: 90, yoyo: true });
      speak(q.speech, { mood: 'question' });
    });
    this.content = this.add.container(0, 0);
    this.board.add([postL, postR, sign, this.content, this.caption, this.speakBtn]);
    this.buildPrompt();

    // Boss rounds: a row of little carrots shows how many questions are done.
    if (this.progress) {
      const { index, total } = this.progress;
      for (let i = 0; i < total; i++) {
        const c = this.add.image(-410 + i * 40, -168, 'mini-carrot').setScale(1.3).setAlpha(i < index ? 1 : 0.3);
        if (i === index && !this.reduceMotion) this.tweens.add({ targets: c, alpha: 1, scale: 1.55, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.board.add(c);
      }
    }

    sfx.signUp();
    this.tweens.add({ targets: this.board, y: BOARD_Y, duration: 650, ease: 'Back.easeOut', onComplete: () => this.showBubbles() });

    this.sparkles = this.add.particles(0, 0, 'sparkle', {
      lifespan: 700, speed: { min: 120, max: 320 }, angle: { min: 0, max: 360 },
      scale: { start: 1.4, end: 0 }, rotate: { min: 0, max: 360 }, emitting: false,
    }).setDepth(20);
  }

  // --- What the sign shows ------------------------------------------------------------------
  // find (upper/lower/number):  [ ? ]           the answer appears in the slot as the first-miss hint
  // match:                      B  →  [ ? ]     little b appears in the slot as the hint
  // count:                      🥕🥕🥕🥕  [ ? ]   the carrots are counted together as the hint
  bigText(x, y, str, size, color = INK) {
    return this.add.text(x, y, glyph(str), { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color })
      .setOrigin(0.5).setShadow(0, 4, '#f6d7a8', 0, false, true);
  }

  buildPrompt() {
    const q = this.q;
    let slotX = 0;
    if (q.kind === 'match') {
      this.content.add(this.bigText(-190, -4, q.show, 170));
      this.content.add(this.bigText(0, -4, '→', 90, '#b48a5e'));
      slotX = 190;
    } else if (q.kind === 'count') {
      this.buildCarrots(q.carrots);
      slotX = 300;
    }
    this.slot = this.add.image(slotX, 0, 'slot').setScale(q.kind === 'count' ? 1 : 1.25);
    this.slotText = this.bigText(slotX, -4, '?', 130, '#b48a5e');
    this.content.add([this.slot, this.slotText]);
    if (this.silent && q.kind !== 'count') this.setSlot(q.answer, FAINT);
  }

  /** 1–5 carrots in one row; 6–10 as two rows of five (like a ten-frame), so they're easy to count. */
  buildCarrots(n) {
    const perRow = n <= 5 ? n : 5;
    const rows = Math.ceil(n / 5);
    const cell = 92, cx = -120;
    this.carrots = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / 5), c = i % 5;
      const inRow = r < rows - 1 ? 5 : n - 5 * r;
      const x = cx + (c - (Math.max(perRow, inRow) - 1) / 2) * cell;
      const y = rows === 1 ? 0 : (r === 0 ? -58 : 62);
      const img = this.add.image(x, y, 'carrot').setScale(0).setAngle(-8 + (i % 3) * 8);
      this.content.add(img);
      this.tweens.add({ targets: img, scale: rows === 1 ? 1.7 : 1.45, duration: 260, delay: 250 + i * 60, ease: 'Back.easeOut' });
      this.carrots.push(img);
    }
  }

  setSlot(text, color = INK) {
    this.slotText.setText(glyph(text)).setColor(color);
  }

  // --- Answer bubbles -----------------------------------------------------------------------
  showBubbles() {
    const n = this.q.choices.length;
    // 5–6 bubbles (letter questions) are drawn smaller so they all fit in one row (still ≥ 140 px to tap).
    const gap = n >= 5 ? 210 : n > 3 ? 270 : n === 3 ? 310 : 360;
    const s = this.bubbleScale = n >= 5 ? 0.8 : 1;
    this.bubbles = this.q.choices.map((value, i) => {
      const x = 640 + (i - (n - 1) / 2) * gap;
      const glow = this.add.image(x, BUBBLE_Y, 'glow').setAlpha(0).setScale(0.9 * s);
      const img = this.add.image(x, BUBBLE_Y, `bubble${i % 4}`).setScale(0);
      const txt = this.add.text(x, BUBBLE_Y - 6, glyph(value), {
        fontFamily: FONT, fontSize: value.length > 1 ? '84px' : '104px', fontStyle: 'bold', color: INK, stroke: '#ffffff', strokeThickness: 10,
      }).setOrigin(0.5).setScale(0);
      img.setInteractive(new Phaser.Geom.Circle(90, 88, 88), Phaser.Geom.Circle.Contains);
      const b = { value, img, txt, glow, x, out: false };
      img.on('pointerdown', () => this.choose(b));
      this.tweens.add({ targets: [img, txt], scale: s, duration: 380, delay: 90 * i, ease: 'Back.easeOut' });
      if (!this.reduceMotion) {
        this.tweens.add({ targets: [img, txt], y: '-=10', duration: 1100 + i * 130, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 400 + i * 120 });
      }
      return b;
    });
    speak(this.q.speech, { mood: 'question' });
    // A short pause so a tap meant for jumping can't answer by accident.
    this.time.delayedCall(650, () => { this.locked = false; this.startTime = this.time.now; });
  }

  choose(b) {
    if (this.locked || b.out) return;
    if (b.value === this.q.answer) { this.success(b); return; }
    this.fadeOut(b);
    this.miss();
  }

  fadeOut(b) {
    b.out = true;
    b.img.disableInteractive();
    this.tweens.add({ targets: [b.img, b.txt], alpha: 0.28, scale: 0.78 * (this.bubbleScale || 1), duration: 350, ease: 'Quad.easeOut' });
  }

  // --- Misses -------------------------------------------------------------------------------
  miss() {
    this.attempts++;
    sfx.tryAgain();
    if (!this.reduceMotion) {
      this.tweens.add({ targets: this.board, angle: { from: -2, to: 2 }, duration: 110, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => this.board.setAngle(0) });
    }
    // With only one bubble left there is nothing to choose: go straight to "tap it".
    const left = this.bubbles.filter((o) => !o.out).length;
    if (this.attempts === 1 && left > 1) this.hint();
    else this.showAnswer();
  }

  setCaption(text) {
    this.caption.setText(text);
    this.tweens.add({ targets: this.caption, alpha: 1, duration: 200 });
  }

  /** First miss: show what the answer looks like, or count the carrots together. */
  hint() {
    const q = this.q;
    if (q.kind === 'count') { this.countTogether(); return; }
    this.setSlot(q.answer, INK);
    this.tweens.add({ targets: this.slotText, scale: { from: 0.4, to: 1 }, duration: 380, ease: 'Back.easeOut' });
    const words = answerWords(q);
    this.setCaption(`Look! ${glyph(q.answer)}`);
    const line = q.kind === 'match'
      ? `Big ${letterName(q.value)} and little ${letterName(q.value)} are friends. Little ${letterName(q.value)} looks like this! Can you find it?`
      : `Look, this is ${words}! Can you find ${words}?`;
    speak(line, { mood: 'cheer' });
  }

  countTogether() {
    const q = this.q;
    this.locked = true;
    this.setCaption("Let's count together!");
    speak("Let's count together!", { mood: 'cheer' });
    const step = 900, start = 1300;
    this.carrots.forEach((img, i) => {
      this.time.delayedCall(start + i * step, () => {
        const base = img.scale;
        this.tweens.add({ targets: img, scale: base * 1.3, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
        const label = this.add.text(img.x, img.y + 2, String(i + 1), {
          fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: '#ffffff', stroke: INK, strokeThickness: 8,
        }).setOrigin(0.5).setScale(0);
        this.content.add(label);
        this.tweens.add({ targets: label, scale: 1, duration: 220, ease: 'Back.easeOut' });
        sfx.count(i);
        speak(numberWords(i + 1), { mood: 'count' });
      });
    });
    this.time.delayedCall(start + q.carrots * step + 300, () => {
      this.setCaption('How many?');
      speak('How many carrots?', { queue: true, mood: 'question' });
      this.locked = false;
    });
  }

  /** Second miss: the right bubble glows. */
  showAnswer() {
    const q = this.q;
    this.bubbles.forEach((b) => { if (b.value !== q.answer && !b.out) this.fadeOut(b); });
    const right = this.bubbles.find((b) => b.value === q.answer);
    this.pulse(right.glow, 0.9);
    if (q.kind !== 'count') this.setSlot(q.answer, INK);
    this.setCaption(`It's ${glyph(q.answer)}! Tap it!`);
    speak(`It's ${answerWords(q)}! Tap it!`, { mood: 'cheer' });
  }

  pulse(glow, alpha) {
    glow.setAlpha(alpha);
    if (!this.reduceMotion) {
      this.tweens.add({ targets: glow, scale: { from: 0.92 * (this.bubbleScale || 1), to: 1.08 * (this.bubbleScale || 1) }, alpha: { from: alpha * 0.8, to: alpha }, duration: 750, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  // --- Right answer -------------------------------------------------------------------------
  success(b) {
    this.locked = true;
    const q = this.q;
    const firstTry = this.attempts === 0;
    const ms = this.time.now - this.startTime;
    sfx.correct();
    this.sparkles.explode(this.reduceMotion ? 6 : 18, b.x, BUBBLE_Y);
    this.tweens.add({ targets: [b.img, b.txt], scale: 1.35 * (this.bubbleScale || 1), alpha: 0, duration: 300, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: b.glow, alpha: 0, duration: 200 });
    this.bubbles.forEach((o) => { if (o !== b) this.tweens.add({ targets: [o.img, o.txt], alpha: 0, scale: 0.5 * (this.bubbleScale || 1), duration: 250 }); });

    this.setSlot(q.answer, GREEN);
    this.tweens.add({ targets: this.slotText, scale: { from: 1.3, to: 1 }, duration: 260, ease: 'Back.easeOut' });
    const cheer = praise.next(firstTry).text;
    this.setCaption(cheer);
    if (this.onCorrect) this.time.delayedCall(120, () => this.onCorrect());
    speak(`${cheer} ${q.said}`, { mood: 'cheer' });

    this.time.delayedCall(firstTry ? 1900 : 2300, () => this.close({ firstTry, attempts: this.attempts + 1, ms }));
  }

  close(result) {
    sfx.signDown();
    this.tweens.add({ targets: this.backdrop, alpha: 0, duration: 400 });
    this.tweens.add({
      targets: this.board, y: 720 + 300, duration: 450, ease: 'Back.easeIn',
      onComplete: () => {
        const done = this.onDone;
        this.scene.stop();
        if (done) done(result);
      },
    });
  }
}
