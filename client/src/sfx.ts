import { attachMusic, startMusic as startTracks, stopMusic } from './music/engine';
// Tiny synthesized sound effects (and the bus the music box plays through).
// No audio files: everything is made with WebAudio oscillators at runtime.
// During a festival the UI sounds pick up a little holiday flourish.

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

const MUSIC_VOL = 0.22;

let ac: AudioContext | null = null;
let sfxBus: GainNode;
let musicBus: GainNode;

function ctx(): AudioContext | null {
  if (ac) return ac;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ac = new AC();
  sfxBus = ac.createGain();
  sfxBus.gain.value = 0.5;
  sfxBus.connect(ac.destination);
  musicBus = ac.createGain();
  musicBus.gain.value = audioSettings.music ? MUSIC_VOL : 0;
  musicBus.connect(ac.destination);
  attachMusic(ac, musicBus, noiseBuffer);
  return ac;
}

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  delay?: number;
  slide?: number;
  attack?: number;
}

function tone(freq: number, dur: number, o: ToneOpts = {}): void {
  const a = ctx();
  if (!a || !audioSettings.sfx) return;
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
  osc.connect(g).connect(sfxBus);
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

// A run of quick pops climbs a pentatonic ladder, so sweeping a whole field
// sounds like a happy little tune rather than one sound on repeat.
const LADDER = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const runs = new Map<string, { at: number; step: number }>();
function ladder(name: string): number {
  const now = performance.now();
  const r = runs.get(name);
  const step = r && now - r.at < 450 ? Math.min(r.step + 1, LADDER.length - 1) : 0;
  runs.set(name, { at: now, step });
  return 2 ** (LADDER[step] / 12);
}

// ---------------------------------------------------------------------------
// Holiday flourishes: during a festival, a few UI sounds pick up a little
// extra (sleigh bells in winter, a bubbling cauldron at Halloween, ...).

type Moment = 'open' | 'coin' | 'quest' | 'levelUp' | 'cheer';

const chime = (notes: number[], gap: number, o: { vol?: number; dur?: number; delay?: number; type?: OscillatorType } = {}) =>
  notes.forEach((n, i) => tone(NOTE(n), o.dur ?? 0.5, { type: o.type ?? 'sine', vol: o.vol ?? 0.05, delay: (o.delay ?? 0) + i * gap }));

const fx = {
  sleigh(delay = 0, shakes = 4) {
    for (let i = 0; i < shakes; i++) {
      const d = delay + i * 0.07 + Math.random() * 0.015;
      noise(0.07, { vol: 0.05, freq: 7500, q: 0.8, type: 'highpass', delay: d });
      tone(3520 + Math.random() * 300, 0.09, { vol: 0.012, delay: d });
      tone(4700 + Math.random() * 300, 0.07, { vol: 0.008, delay: d + 0.01 });
    }
  },
  /** A rising whistle, a soft bang and a shower of crackles. */
  firework(delay = 0) {
    tone(700, 0.45, { type: 'sine', vol: 0.025, slide: 2.6, delay, attack: 0.05 });
    noise(0.4, { vol: 0.08, freq: 500, q: 0.6, type: 'lowpass', delay: delay + 0.45 });
    for (let i = 0; i < 9; i++) noise(0.03, { vol: 0.035, freq: 5000 + Math.random() * 2000, q: 1, delay: delay + 0.55 + Math.random() * 0.6 });
  },
  crackle(delay = 0, n = 8, spread = 0.4) {
    for (let i = 0; i < n; i++) noise(0.025, { vol: 0.045, freq: 2500 + Math.random() * 3000, q: 1.2, delay: delay + Math.random() * spread });
  },
  chirp(delay = 0, base = 2600) {
    tone(base, 0.07, { vol: 0.035, slide: 1.35, delay });
    tone(base * 1.1, 0.06, { vol: 0.03, slide: 1.4, delay: delay + 0.09 });
  },
  windChime(delay = 0) {
    const notes = [88, 91, 93, 96, 98, 100, 103];
    for (let i = 0; i < 3; i++) tone(NOTE(notes[Math.floor(Math.random() * notes.length)]), 1.4, { vol: 0.025, delay: delay + i * 0.11 + Math.random() * 0.05 });
  },
  gong(delay = 0, f = 196) {
    [1, 1.48, 2.1].forEach((r, i) => tone(f * r, 1.8 - i * 0.4, { vol: 0.05 / (i + 1), slide: 0.995, delay, attack: 0.01 }));
  },
  bell(delay = 0, f = 1568) {
    tone(f, 1.1, { vol: 0.04, delay });
    tone(f * 2.4, 0.5, { vol: 0.012, delay });
  },
  bubble(delay = 0) {
    for (let i = 0; i < 3; i++) tone(200 + Math.random() * 160, 0.08, { vol: 0.06, slide: 2.4, delay: delay + i * 0.09 + Math.random() * 0.04 });
  },
  hoot(delay = 0) {
    tone(392, 0.28, { vol: 0.06, slide: 0.92, delay, attack: 0.06 });
    tone(370, 0.45, { vol: 0.06, slide: 0.9, delay: delay + 0.38, attack: 0.08 });
  },
  ghost(delay = 0) {
    tone(NOTE(76), 1, { vol: 0.03, slide: 0.84, delay, attack: 0.25 });
  },
  heartbeat(delay = 0) {
    tone(80, 0.12, { vol: 0.16, slide: 0.6, delay });
    tone(75, 0.14, { vol: 0.12, slide: 0.6, delay: delay + 0.16 });
  },
  gobble(delay = 0) {
    for (let i = 0; i < 5; i++) tone(330 - i * 12, 0.06, { type: 'triangle', vol: 0.05, slide: 1.25, delay: delay + i * 0.055 });
  },
  knock(delay = 0) {
    tone(520, 0.05, { vol: 0.07, slide: 0.8, delay });
    tone(500, 0.05, { vol: 0.05, slide: 0.8, delay: delay + 0.1 });
  },
  sparkle(delay = 0) {
    chime([96, 100, 103, 108], 0.04, { vol: 0.025, dur: 0.25, delay });
  },
  blower(delay = 0) {
    tone(520, 0.3, { type: 'sawtooth', vol: 0.02, slide: 1.5, delay, attack: 0.03 });
  },
  drop(delay = 0) {
    tone(600, 0.1, { vol: 0.06, slide: 2.3, delay });
  },
};

const FLAVORS: Record<string, Partial<Record<Moment, () => void>>> = {
  winter: { open: () => fx.sleigh(0, 3), coin: () => fx.sleigh(0.05, 2), quest: () => fx.sleigh(0, 7), levelUp: () => fx.sleigh(0.1, 12), cheer: () => fx.sleigh(0, 5) },
  new_year: { open: () => fx.blower(), coin: () => fx.sparkle(0.05), quest: () => fx.firework(0.2), levelUp: () => (fx.firework(0.1), fx.firework(0.6)), cheer: () => fx.crackle(0.05, 6) },
  lunar_new_year: { open: () => fx.gong(0, 392), coin: () => fx.bell(0.05, 2093), quest: () => fx.crackle(0.15, 12, 0.6), levelUp: () => (fx.gong(0.05), fx.crackle(0.5, 16, 0.8)), cheer: () => fx.crackle(0, 6) },
  valentines: { open: () => fx.heartbeat(), coin: () => fx.sparkle(0.05), quest: () => (fx.heartbeat(), chime([84, 88, 91, 96], 0.07, { delay: 0.3, type: 'triangle' })), levelUp: () => (fx.heartbeat(0.05), fx.heartbeat(0.7)), cheer: () => fx.heartbeat() },
  st_patricks: { open: () => fx.sparkle(), coin: () => fx.sparkle(0.04), quest: () => chime([86, 88, 86, 88, 91], 0.06, { vol: 0.04, dur: 0.2 }), levelUp: () => chime([79, 83, 86, 91, 95, 98], 0.06, { vol: 0.04, type: 'triangle', delay: 0.1 }), cheer: () => fx.sparkle() },
  spring: { open: () => fx.chirp(), coin: () => fx.chirp(0.06, 3000), quest: () => (fx.chirp(0.1), fx.chirp(0.35, 3200)), levelUp: () => (fx.chirp(0.1), fx.chirp(0.4, 3200), fx.chirp(0.7, 2800)), cheer: () => fx.chirp(0, 3100) },
  hanami: { open: () => fx.windChime(), coin: () => fx.bell(0.05, 2349), quest: () => fx.windChime(0.1), levelUp: () => (fx.windChime(0.1), fx.windChime(0.6)), cheer: () => fx.windChime() },
  earth_day: { open: () => fx.chirp(), coin: () => fx.drop(0.05), quest: () => (fx.drop(0.1), fx.chirp(0.3)), levelUp: () => (fx.chirp(0.1), fx.chirp(0.45, 3300)), cheer: () => fx.drop() },
  tanabata: { open: () => fx.windChime(), coin: () => fx.sparkle(0.05), quest: () => chime([100, 96, 93, 91, 88], 0.08, { vol: 0.03, delay: 0.1 }), levelUp: () => (fx.windChime(0.1), fx.sparkle(0.5)), cheer: () => fx.sparkle() },
  mid_autumn: { open: () => fx.bell(0, 1175), coin: () => fx.bell(0.05, 1760), quest: () => fx.gong(0.1, 294), levelUp: () => (fx.gong(0.05, 294), fx.windChime(0.5)), cheer: () => fx.bell(0, 1568) },
  summer: { open: () => tone(NOTE(84), 0.4, { vol: 0.04, delay: 0.02 }), coin: () => tone(NOTE(91), 0.35, { vol: 0.03, delay: 0.05 }), quest: () => fx.firework(0.2), levelUp: () => (fx.firework(0.1), fx.firework(0.5), fx.firework(0.9)), cheer: () => fx.crackle(0.05, 5) },
  harvest: { open: () => fx.knock(), coin: () => tone(NOTE(79), 0.3, { type: 'triangle', vol: 0.04, delay: 0.05 }), quest: () => chime([67, 71, 74, 79], 0.03, { type: 'triangle', vol: 0.04, dur: 0.4, delay: 0.1 }), levelUp: () => fx.knock(0.1), cheer: () => fx.knock() },
  halloween: { open: () => fx.bubble(), coin: () => fx.bubble(0.05), quest: () => fx.ghost(0.1), levelUp: () => (fx.hoot(0.2), fx.ghost(0.9)), cheer: () => fx.bubble() },
  diwali: { open: () => fx.bell(), coin: () => fx.bell(0.05, 2093), quest: () => (fx.bell(0.1), fx.crackle(0.3, 10, 0.5)), levelUp: () => (fx.bell(0.05), fx.bell(0.35, 2093), fx.crackle(0.6, 14, 0.7)), cheer: () => fx.crackle(0, 6) },
  thanksgiving: { open: () => fx.knock(), coin: () => tone(NOTE(79), 0.3, { type: 'triangle', vol: 0.04, delay: 0.05 }), quest: () => fx.gobble(0.15), levelUp: () => fx.gobble(0.3), cheer: () => fx.gobble() },
};

let flavor: Partial<Record<Moment, () => void>> = {};

/** Give the UI sounds a festival's flourish (or none). */
export function setSfxFlavor(eventId: string | null): void {
  flavor = (eventId && FLAVORS[eventId]) || {};
}

function flourish(m: Moment, ms = 250): void {
  if (flavor[m] && !throttled(`flavor:${m}`, ms)) flavor[m]!();
}

export const sfx = {
  pop() {
    if (throttled('pop', 40)) return;
    const f = 520 * ladder('pop') * (1 + Math.random() * 0.03);
    tone(f, 0.12, { type: 'sine', vol: 0.25, slide: 1.9 });
    tone(f * 2, 0.08, { type: 'triangle', vol: 0.08, delay: 0.02 });
  },
  coin() {
    if (throttled('coin', 60)) return;
    tone(NOTE(88), 0.08, { type: 'square', vol: 0.05 });
    tone(NOTE(93), 0.22, { type: 'square', vol: 0.05, delay: 0.07 });
    flourish('coin', 500);
  },
  plant() {
    if (throttled('plant', 40)) return;
    tone(300 * ladder('plant') * (1 + Math.random() * 0.03), 0.1, { type: 'triangle', vol: 0.18, slide: 1.6 });
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
  /** A big sweep: a quick sparkly flourish. */
  cheer() {
    [84, 88, 91, 96].forEach((n, i) => tone(NOTE(n), 0.18, { type: 'sine', vol: 0.09, delay: i * 0.05 }));
    flourish('cheer', 800);
  },
  quest() {
    [72, 76, 79, 84].forEach((n, i) => tone(NOTE(n), 0.3, { type: 'triangle', vol: 0.14, delay: i * 0.09 }));
    flourish('quest');
  },
  levelUp() {
    [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => tone(NOTE(n), 0.35, { type: 'square', vol: 0.06, delay: i * 0.1 }));
    [60, 64, 67].forEach((n) => tone(NOTE(n), 1.2, { type: 'triangle', vol: 0.08, delay: 0.6 }));
    flourish('levelUp');
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
    flourish('open', 400);
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
function noiseBuffer(a: BaseAudioContext, seconds: number): AudioBuffer {
  if (noiseCache && noiseCache.duration >= seconds) return noiseCache;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * Math.max(seconds, 2)), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (noiseCache = buf);
}

/** A burst of filtered noise (splashes, swooshes). */
function noise(dur: number, o: { vol: number; freq: number; q: number; slide?: number; delay?: number; type?: BiquadFilterType }): void {
  const a = ctx();
  if (!a || !audioSettings.sfx) return;
  const t = a.currentTime + (o.delay ?? 0);
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, dur);
  const bp = a.createBiquadFilter();
  bp.type = o.type ?? 'bandpass';
  bp.frequency.setValueAtTime(o.freq, t);
  if (o.slide) bp.frequency.exponentialRampToValueAtTime(o.freq * o.slide, t + dur);
  bp.Q.value = o.q;
  const g = a.createGain();
  g.gain.setValueAtTime(o.vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(sfxBus);
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.05);
}

export function startMusic(): void {
  if (ctx() && audioSettings.music) startTracks();
}

export function setMusic(on: boolean): void {
  audioSettings.music = on;
  saveSettings();
  if (ac) musicBus.gain.setTargetAtTime(on ? MUSIC_VOL : 0, ac.currentTime, 0.2);
  if (on) startMusic();
  else stopMusic();
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
