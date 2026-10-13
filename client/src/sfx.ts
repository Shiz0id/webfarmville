import type { MusicStyle } from '@farm/shared';
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
  splash() {
    noise(0.35, { vol: 0.22, freq: 1400, q: 0.7, slide: 0.4 });
    tone(320, 0.12, { type: 'sine', vol: 0.12, slide: 0.5, delay: 0.02 });
  },
  plop() {
    tone(520, 0.12, { type: 'sine', vol: 0.18, slide: 0.45 });
  },
  reel() {
    if (throttled('reel', 70)) return;
    tone(1800 + Math.random() * 300, 0.02, { type: 'square', vol: 0.025 });
  },
  catch() {
    [67, 72, 76, 79, 84].forEach((n, i) => tone(NOTE(n), 0.28, { type: 'triangle', vol: 0.13, delay: i * 0.07 }));
    tone(NOTE(91), 0.5, { type: 'sine', vol: 0.06, delay: 0.38 });
  },
  swoosh() {
    noise(0.18, { vol: 0.12, freq: 2500, q: 0.5, slide: 0.5 });
  },
  /** A soft wooden blip for buttons, a little higher each time in a run. */
  tap() {
    if (throttled('tap', 45)) return;
    const f = 620 + Math.random() * 60;
    tone(f, 0.05, { type: 'sine', vol: 0.09, slide: 1.25 });
    tone(f * 1.5, 0.03, { type: 'triangle', vol: 0.025, delay: 0.005 });
  },
  /** A panel opening: two bright notes stepping up. */
  open() {
    if (throttled('open', 120)) return;
    tone(NOTE(79), 0.09, { type: 'sine', vol: 0.11 });
    tone(NOTE(86), 0.14, { type: 'sine', vol: 0.09, delay: 0.06 });
    noise(0.08, { vol: 0.03, freq: 3200, q: 0.6, slide: 1.4 });
  },
  /** A panel closing: the same notes stepping down. */
  close() {
    if (throttled('close', 120)) return;
    tone(NOTE(84), 0.08, { type: 'sine', vol: 0.08 });
    tone(NOTE(77), 0.12, { type: 'sine', vol: 0.07, delay: 0.05 });
  },
  /** A soft rumbly purr: filtered noise pulsing about 25 times a second. */
  purr(seconds = 1.4) {
    const a = ctx();
    if (!a || !audioSettings.sfx || throttled('purr', 600)) return;
    const t = a.currentTime;
    const src = a.createBufferSource();
    src.buffer = noiseBuffer(a, seconds + 0.1);
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    const g = a.createGain();
    g.gain.value = 0;
    const lfo = a.createOscillator();
    lfo.frequency.value = 24;
    const depth = a.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(g.gain);
    const env = a.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.9, t + 0.25);
    env.gain.setValueAtTime(0.9, t + seconds - 0.35);
    env.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    src.connect(lp).connect(g).connect(env).connect(sfxBus);
    lfo.start(t);
    src.start(t);
    lfo.stop(t + seconds + 0.05);
    src.stop(t + seconds + 0.05);
  },
};

/** A distant rumble with a soft crack up front. */
export function thunder(): void {
  noise(0.25, { vol: 0.08, freq: 900, q: 0.6, slide: 0.4 });
  const a = ctx();
  if (!a || !audioSettings.sfx) return;
  const t = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, 3.2);
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(220, t);
  lp.frequency.exponentialRampToValueAtTime(60, t + 3);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.7, t + 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
  src.connect(lp).connect(g).connect(sfxBus);
  src.start(t + 0.08);
  src.stop(t + 3.2);
}

export type AmbientSound = 'none' | 'rain' | 'storm' | 'wind';
let ambient: { kind: AmbientSound; stop: () => void } | null = null;

/** A looping weather bed (rain patter or wind). Safe to call often. */
export function setAmbient(kind: AmbientSound): void {
  const want = audioSettings.sfx ? kind : 'none';
  if ((ambient?.kind ?? 'none') === want) return;
  ambient?.stop();
  ambient = null;
  const a = ac; // Never create the context here: wait for a user gesture.
  if (!a || want === 'none' || a.state !== 'running') return;
  const t = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, 2);
  src.loop = true;
  const f1 = a.createBiquadFilter();
  const f2 = a.createBiquadFilter();
  const g = a.createGain();
  const vol = want === 'storm' ? 0.16 : want === 'rain' ? 0.1 : 0.07;
  if (want === 'wind') {
    f1.type = 'bandpass';
    f1.frequency.value = 500;
    f1.Q.value = 0.8;
    f2.type = 'lowpass';
    f2.frequency.value = 1400;
    // Gusts: a slow wobble in volume and pitch.
    const lfo = a.createOscillator();
    lfo.frequency.value = 0.13;
    const depth = a.createGain();
    depth.gain.value = 260;
    lfo.connect(depth).connect(f1.frequency);
    lfo.start();
    src.addEventListener('ended', () => lfo.stop());
  } else {
    f1.type = 'highpass';
    f1.frequency.value = want === 'storm' ? 500 : 900;
    f2.type = 'lowpass';
    f2.frequency.value = 5200;
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 2);
  src.connect(f1).connect(f2).connect(g).connect(sfxBus);
  src.start(t);
  ambient = {
    kind: want,
    stop: () => {
      const n = a.currentTime;
      g.gain.cancelScheduledValues(n);
      g.gain.setValueAtTime(g.gain.value, n);
      g.gain.exponentialRampToValueAtTime(0.0001, n + 1.2);
      src.stop(n + 1.3);
    },
  };
}

let noiseCache: AudioBuffer | null = null;
function noiseBuffer(a: AudioContext, seconds: number): AudioBuffer {
  if (noiseCache && noiseCache.duration >= seconds) return noiseCache;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * Math.max(seconds, 2)), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (noiseCache = buf);
}

/** A burst of filtered noise (splashes, swooshes). */
function noise(dur: number, o: { vol: number; freq: number; q: number; slide?: number }): void {
  const a = ctx();
  if (!a || !audioSettings.sfx) return;
  const t = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, dur);
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(o.freq, t);
  if (o.slide) bp.frequency.exponentialRampToValueAtTime(o.freq * o.slide, t + dur);
  bp.Q.value = o.q;
  const g = a.createGain();
  g.gain.setValueAtTime(o.vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(sfxBus);
  src.start(t);
  src.stop(t + dur + 0.05);
}

// ---------------------------------------------------------------------------
// Music box: an endless, gently varying arpeggio. Each seasonal event has its
// own style (a spooky waltz for Halloween, sleigh bells for winter, ...).

interface Style {
  chords: number[][];
  patterns: number[][];
  beat: number;
  /** A soft high "tinkle" on the off-beats (sleigh bells, chimes). */
  bells?: boolean;
  /** A ghostly "ooo" now and then. */
  ooo?: boolean;
}

const STYLES: Record<MusicStyle, Style> = {
  default: {
    chords: [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]],
    patterns: [[0, 1, 2, 3, 2, 1, 2, 1], [0, 2, 1, 3, 2, 3, 1, 2], [0, 1, 2, 1, 3, 2, 1, 2]],
    beat: 0.34,
  },
  spooky: {
    chords: [[57, 60, 64, 69], [53, 57, 60, 65], [50, 53, 57, 62], [52, 56, 59, 64]],
    patterns: [[0, 2, 3, 2, 1, 2], [0, 3, 2, 1, 2, 3]],
    beat: 0.3,
    ooo: true,
  },
  jingle: {
    chords: [[60, 64, 67, 72], [65, 69, 72, 77], [67, 71, 74, 79], [60, 64, 67, 72]],
    patterns: [[0, 1, 2, 1, 3, 2, 1, 2], [2, 2, 2, 1, 2, 2, 2, 3]],
    beat: 0.3,
    bells: true,
  },
  pentatonic: {
    chords: [[60, 62, 64, 67, 69], [57, 60, 62, 64, 67], [55, 57, 60, 62, 64], [57, 60, 64, 67, 69]],
    patterns: [[0, 2, 4, 3, 2, 1, 2, 4], [4, 3, 2, 0, 1, 2, 3, 2]],
    beat: 0.38,
  },
  sweet: {
    chords: [[65, 69, 72, 77], [62, 65, 69, 74], [58, 62, 65, 70], [60, 64, 67, 72]],
    patterns: [[0, 2, 3, 2, 1, 2], [0, 1, 2, 3, 2, 1]],
    beat: 0.33,
  },
  jig: {
    chords: [[67, 71, 74, 79], [60, 64, 67, 72], [62, 66, 69, 74], [67, 71, 74, 79]],
    patterns: [[0, 1, 2, 3, 2, 1], [2, 1, 0, 1, 2, 3]],
    beat: 0.22,
  },
  folk: {
    chords: [[62, 66, 69, 74], [57, 61, 64, 69], [59, 62, 66, 71], [55, 59, 62, 67]],
    patterns: [[0, 1, 2, 3, 2, 1, 2, 1], [0, 2, 3, 2, 1, 2, 3, 2]],
    beat: 0.36,
  },
  sunny: {
    chords: [[60, 64, 67, 72], [65, 69, 72, 77], [60, 64, 67, 72], [67, 71, 74, 79]],
    patterns: [[0, 2, 1, 3, 0, 2, 1, 3], [0, 1, 2, 3, 3, 2, 1, 0]],
    beat: 0.28,
  },
  party: {
    chords: [[60, 64, 67, 72], [67, 71, 74, 79], [57, 60, 64, 69], [65, 69, 72, 77]],
    patterns: [[0, 1, 2, 3, 2, 3, 2, 1], [3, 2, 3, 1, 2, 0, 1, 2]],
    beat: 0.26,
    bells: true,
  },
};

let style: Style = STYLES.default;

/** Switch the music box to a seasonal style. */
export function setMusicStyle(name: MusicStyle): void {
  style = STYLES[name] ?? STYLES.default;
}

let musicTimer = 0;
let step = 0;
let nextTime = 0;

function scheduleMusic(): void {
  const a = ctx();
  if (!a) return;
  const beat = style.beat;
  const barLen = style.patterns[0].length;
  while (nextTime < a.currentTime + 0.4) {
    const bar = Math.floor(step / barLen);
    const chord = style.chords[bar % style.chords.length];
    const pattern = style.patterns[Math.floor(bar / 4) % style.patterns.length];
    const note = chord[pattern[step % barLen] % chord.length] + 12;
    const delay = Math.max(0, nextTime - a.currentTime);
    tone(NOTE(note), 0.9, { type: 'sine', vol: 0.11, delay, bus: 'music', attack: 0.004 });
    tone(NOTE(note + 12), 0.4, { type: 'sine', vol: 0.025, delay, bus: 'music', attack: 0.004 });
    if (step % barLen === 0) tone(NOTE(chord[0] - 12), 2.4, { type: 'triangle', vol: 0.05, delay, bus: 'music' });
    if (style.bells && step % 2 === 1) tone(NOTE(96 + (step % 4 === 1 ? 0 : 3)), 0.12, { type: 'sine', vol: 0.012, delay, bus: 'music' });
    if (style.ooo && step % 24 === 3) tone(NOTE(chord[2] + 24), 1.6, { type: 'sine', vol: 0.018, delay, bus: 'music', slide: 0.94, attack: 0.3 });
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

let unlocked = false;

// Browsers happily keep a page's sound going in a background tab (that's how
// music sites work), so a game has to hush itself when you look away.
document.addEventListener('visibilitychange', () => {
  if (!ac || !unlocked) return;
  if (document.hidden) void ac.suspend();
  else void ac.resume();
});

/** Browsers only allow audio after a user gesture. */
export function unlockAudioOnGesture(): void {
  const unlock = () => {
    const a = ctx();
    unlocked = true;
    if (!document.hidden) void a?.resume();
    if (audioSettings.music) startMusic();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
