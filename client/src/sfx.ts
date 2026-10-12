// Tiny synthesized sound effects and a gentle music-box tune. No audio files:
// everything is made with WebAudio oscillators at runtime.

const SETTINGS_KEY = 'farm.audio';

interface AudioSettings {
  sfx: boolean;
  music: boolean;
}

function loadSettings(): AudioSettings {
  try {
    return { sfx: true, music: true, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return { sfx: true, music: true };
  }
}

export const audioSettings = loadSettings();

function saveSettings(): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(audioSettings));
  } catch {
    /* ignore */
  }
}

let ac: AudioContext | null = null;
let sfxBus: GainNode;
let musicBus: GainNode;
let echo: DelayNode;

function ctx(): AudioContext | null {
  if (ac) return ac;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ac = new AC();
  sfxBus = ac.createGain();
  sfxBus.gain.value = 0.5;
  sfxBus.connect(ac.destination);
  musicBus = ac.createGain();
  musicBus.gain.value = audioSettings.music ? 0.22 : 0;
  // A soft echo makes the music box feel dreamy.
  echo = ac.createDelay();
  echo.delayTime.value = 0.33;
  const fb = ac.createGain();
  fb.gain.value = 0.3;
  const wet = ac.createGain();
  wet.gain.value = 0.35;
  musicBus.connect(ac.destination);
  musicBus.connect(echo);
  echo.connect(fb).connect(echo);
  echo.connect(wet).connect(ac.destination);
  return ac;
}

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  delay?: number;
  slide?: number;
  attack?: number;
  bus?: 'sfx' | 'music';
}

function tone(freq: number, dur: number, o: ToneOpts = {}): void {
  const a = ctx();
  if (!a) return;
  if (o.bus !== 'music' && !audioSettings.sfx) return;
  const t = a.currentTime + (o.delay ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * o.slide), t + dur);
  const vol = o.vol ?? 0.2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + (o.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(o.bus === 'music' ? musicBus : sfxBus);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

const NOTE = (n: number) => 440 * 2 ** ((n - 69) / 12);

const lastPlayed = new Map<string, number>();
function throttled(name: string, ms: number): boolean {
  const now = performance.now();
  if ((lastPlayed.get(name) ?? 0) + ms > now) return true;
  lastPlayed.set(name, now);
  return false;
}

export const sfx = {
  pop() {
    if (throttled('pop', 40)) return;
    const f = 520 + Math.random() * 160;
    tone(f, 0.12, { type: 'sine', vol: 0.25, slide: 1.9 });
    tone(f * 2, 0.08, { type: 'triangle', vol: 0.08, delay: 0.02 });
  },
  coin() {
    if (throttled('coin', 60)) return;
    tone(NOTE(88), 0.08, { type: 'square', vol: 0.05 });
    tone(NOTE(93), 0.22, { type: 'square', vol: 0.05, delay: 0.07 });
  },
  plant() {
    if (throttled('plant', 40)) return;
    tone(300 + Math.random() * 60, 0.1, { type: 'triangle', vol: 0.18, slide: 1.6 });
  },
  plow() {
    if (throttled('plow', 40)) return;
    tone(140, 0.14, { type: 'triangle', vol: 0.28, slide: 0.5 });
    tone(90, 0.1, { type: 'sine', vol: 0.18, delay: 0.03 });
  },
  place() {
    tone(NOTE(72), 0.1, { type: 'triangle', vol: 0.18 });
    tone(NOTE(79), 0.18, { type: 'triangle', vol: 0.15, delay: 0.07 });
  },
  click() {
    if (throttled('click', 30)) return;
    tone(880, 0.04, { type: 'sine', vol: 0.08 });
  },
  error() {
    tone(220, 0.12, { type: 'triangle', vol: 0.15 });
    tone(185, 0.18, { type: 'triangle', vol: 0.15, delay: 0.1 });
  },
  quest() {
    [72, 76, 79, 84].forEach((n, i) => tone(NOTE(n), 0.3, { type: 'triangle', vol: 0.14, delay: i * 0.09 }));
  },
  levelUp() {
    [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => tone(NOTE(n), 0.35, { type: 'square', vol: 0.06, delay: i * 0.1 }));
    [60, 64, 67].forEach((n) => tone(NOTE(n), 1.2, { type: 'triangle', vol: 0.08, delay: 0.6 }));
  },
  bark() {
    tone(420, 0.09, { type: 'triangle', vol: 0.22, slide: 0.7 });
    tone(470, 0.1, { type: 'triangle', vol: 0.22, slide: 0.65, delay: 0.14 });
  },
  meow() {
    tone(700, 0.35, { type: 'sine', vol: 0.16, slide: 1.35, attack: 0.05 });
    tone(1400, 0.3, { type: 'sine', vol: 0.03, slide: 1.3, attack: 0.05 });
  },
  help() {
    [79, 83, 86].forEach((n, i) => tone(NOTE(n), 0.2, { type: 'sine', vol: 0.15, delay: i * 0.06 }));
  },
};

// ---------------------------------------------------------------------------
// Music box: an endless, gently varying arpeggio over I–vi–IV–V.

const CHORDS = [
  [60, 64, 67, 72],
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [55, 59, 62, 67],
];
const PATTERNS = [
  [0, 1, 2, 3, 2, 1, 2, 1],
  [0, 2, 1, 3, 2, 3, 1, 2],
  [0, 1, 2, 1, 3, 2, 1, 2],
];
// Halloween: a playful minor-key waltz of a music box (Am – F – Dm – E).
const SPOOKY_CHORDS = [
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [50, 53, 57, 62],
  [52, 56, 59, 64],
];
const SPOOKY_PATTERNS = [
  [0, 2, 3, 2, 1, 2],
  [0, 3, 2, 1, 2, 3],
];
let spooky = false;

/** Switch the music box to its Halloween tune. */
export function setSpookyMusic(on: boolean): void {
  spooky = on;
}

let musicTimer = 0;
let step = 0;
let nextTime = 0;

function scheduleMusic(): void {
  const a = ctx();
  if (!a) return;
  const beat = spooky ? 0.3 : 0.34;
  const barLen = spooky ? 6 : 8;
  while (nextTime < a.currentTime + 0.4) {
    const bar = Math.floor(step / barLen);
    const chords = spooky ? SPOOKY_CHORDS : CHORDS;
    const patterns = spooky ? SPOOKY_PATTERNS : PATTERNS;
    const chord = chords[bar % chords.length];
    const pattern = patterns[Math.floor(bar / 4) % patterns.length];
    const note = chord[pattern[step % barLen]] + 12;
    const delay = Math.max(0, nextTime - a.currentTime);
    tone(NOTE(note), 0.9, { type: 'sine', vol: 0.11, delay, bus: 'music', attack: 0.004 });
    tone(NOTE(note + 12), 0.4, { type: 'sine', vol: 0.025, delay, bus: 'music', attack: 0.004 });
    if (step % barLen === 0) tone(NOTE(chord[0] - 12), 2.4, { type: 'triangle', vol: 0.05, delay, bus: 'music' });
    // A spooky little "ooo" on some bars.
    if (spooky && step % 24 === 3) tone(NOTE(chord[2] + 24), 1.6, { type: 'sine', vol: 0.018, delay, bus: 'music', slide: 0.94, attack: 0.3 });
    // Occasional rests keep it from feeling mechanical.
    nextTime += step % (barLen * 2) === barLen * 2 - 1 ? beat * 2 : beat;
    step++;
  }
}

export function startMusic(): void {
  const a = ctx();
  if (!a || musicTimer) return;
  nextTime = a.currentTime + 0.2;
  musicTimer = window.setInterval(scheduleMusic, 120);
}

export function setMusic(on: boolean): void {
  audioSettings.music = on;
  saveSettings();
  if (ac) musicBus.gain.setTargetAtTime(on ? 0.22 : 0, ac.currentTime, 0.2);
  if (on) startMusic();
}

export function setSfx(on: boolean): void {
  audioSettings.sfx = on;
  saveSettings();
}

/** Browsers only allow audio after a user gesture. */
export function unlockAudioOnGesture(): void {
  const unlock = () => {
    const a = ctx();
    void a?.resume();
    if (audioSettings.music) startMusic();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
