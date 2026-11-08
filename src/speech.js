// Read-aloud with the browser's speechSynthesis, using the most natural *on-device* voice available
// (see src/engine/voices.js). On iPad the best results come from a downloaded "Enhanced" or "Premium"
// voice (Settings → Accessibility → Spoken Content → Voices → English) — the game picks it up by itself.
// iOS only lets speech start after a user gesture, so unlockSpeech() runs on the first tap.
import { settings, load } from './save.js';
import { pickVoice, voiceStyle, speakable, speechParts } from './engine/voices.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null;
let unlocked = false;

function choose() {
  if (!synth) return;
  try { voice = pickVoice(synth.getVoices(), load('voice', null)); } catch (e) { voice = null; }
}
if (synth) {
  choose();
  if (synth.addEventListener) synth.addEventListener('voiceschanged', choose);
  else synth.onvoiceschanged = choose;
}

export const speechAvailable = !!synth;
export function currentVoiceName() { return voice ? voice.name : '(browser default)'; }

export function unlockSpeech() {
  if (!synth || unlocked) return;
  unlocked = true;
  if (!voice) choose();
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  } catch (e) { /* optional */ }
}

/**
 * Speak `text`. `mood`: 'question' (unhurried), 'cheer' (bright), 'count' or 'calm'.
 * `queue: true` adds to what is already being said instead of interrupting.
 */
export function speak(text, { queue = false, mood = 'calm', onEnd } = {}) {
  if (!synth || !settings.speech) { if (onEnd) onEnd(); return; }
  try {
    if (!voice) choose();
    // Marked letters ({A}) are spoken as separate one-letter utterances, so they sound like letter names.
    const parts = speechParts(text).map(speakable).filter(Boolean);
    if (!parts.length) { if (onEnd) onEnd(); return; }
    if (!queue) synth.cancel();
    const style = voiceStyle(mood, voice);
    parts.forEach((words, i) => {
      const u = new SpeechSynthesisUtterance(words);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-GB';
      u.rate = style.rate;
      u.pitch = style.pitch;
      if (onEnd && i === parts.length - 1) u.onend = onEnd;
      synth.speak(u);
    });
  } catch (e) { if (onEnd) onEnd(); }
}

export function stopSpeech() {
  try { if (synth) synth.cancel(); } catch (e) { /* ignore */ }
}
