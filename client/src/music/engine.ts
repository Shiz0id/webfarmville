// The music box's player: synthesized instruments, a look-ahead scheduler and
// the playlist. Each track plays for a couple of minutes (a few times through,
// with the arrangement changing each time), rests a moment and hands over to
// another from the same playlist. Festivals have their own playlists; the rest
// of the year the farm's songs follow the clock and the sky.
//
// `?music=<playlist or track id>` picks what plays, for testing.

import { compose, stepSeconds, type HitEvent, type NoteEvent, type PercHit, type Song, type Timbre, type TrackDef } from './compose';
import { PLAYLISTS } from './tracks';

export type Mood = 'morning' | 'day' | 'evening' | 'night' | 'rain' | 'snow';

const LOOKAHEAD = 0.5;
const TICK_MS = 100;
/** Roughly how long a track plays before the next one. */
const TRACK_SECONDS = 150;
const FADE = 2.5;

let a: BaseAudioContext | null = null;
let master: AudioNode;
let noiseBuf: (a: BaseAudioContext, seconds: number) => AudioBuffer;
let echo: DelayNode;
let send: GainNode;

/** Hand the engine its audio context and the (mutable) music volume node. */
export function attachMusic(ac: BaseAudioContext, out: AudioNode, noise: (a: BaseAudioContext, seconds: number) => AudioBuffer): void {
  a = ac;
  master = out;
  noiseBuf = noise;
  // A soft echo makes the music box feel dreamy; the drums stay dry.
  send = ac.createGain();
  echo = ac.createDelay(1);
  echo.delayTime.value = 0.33;
  const fb = ac.createGain();
  fb.gain.value = 0.28;
  const wet = ac.createGain();
  wet.gain.value = 0.3;
  send.connect(echo);
  echo.connect(fb).connect(echo);
  echo.connect(wet).connect(out);
}

// --- what to play ------------------------------------------------------------------

let festival: string | null = null;
let moodOf: () => Mood = () => 'day';

function forced(): string | null {
  return new URLSearchParams(location.search).get('music');
}

function currentPlaylist(): string {
  const f = forced();
  if (f && PLAYLISTS[f]) return f;
  if (festival && PLAYLISTS[festival]) return festival;
  return moodOf();
}

/** Play a festival's playlist (or the farm's own songs when null). */
export function setPlaylist(eventId: string | null): void {
  const was = currentPlaylist();
  festival = eventId;
  if (playing && currentPlaylist() !== was) {
    fadeOut();
    nextAt = (a?.currentTime ?? 0) + FADE;
  }
}

/** Where the farm's own songs look for the time of day and the weather. */
export function setMusicMood(fn: () => Mood): void {
  moodOf = fn;
}

const recent: string[] = [];

function pickTrack(list: string): TrackDef {
  const f = forced();
  const pinned = f && Object.values(PLAYLISTS).flat().find((t) => t.id === f);
  if (pinned) return pinned;
  const tracks = PLAYLISTS[list];
  // A shuffle that avoids the last couple of songs.
  const fresh = tracks.filter((t) => !recent.includes(t.id));
  const pool = fresh.length ? fresh : tracks;
  const t = pool[Math.floor(Math.random() * pool.length)];
  recent.push(t.id);
  if (recent.length > Math.min(3, Math.floor(tracks.length / 2) + 1)) recent.shift();
  return t;
}

// --- the scheduler -----------------------------------------------------------------

interface Playing {
  track: TrackDef;
  list: string;
  song: Song;
  round: number;
  /** Context time of this round's first step. */
  start: number;
  /** When the track itself began. */
  began: number;
  ni: number;
  hi: number;
  out: GainNode;
  parts: Record<NoteEvent['part'] | 'perc', AudioNode>;
}

let playing: Playing | null = null;
let timer = 0;
/** When to start the next track, while resting between songs. */
let nextAt = 0;
const listeners: ((title: string | null) => void)[] = [];

export function onTrackChange(fn: (title: string | null) => void): void {
  listeners.push(fn);
}

export function nowPlaying(): { title: string; playlist: string } | null {
  return playing ? { title: playing.track.title, playlist: playing.list } : null;
}

export function startMusic(): void {
  if (!a || timer) return;
  nextAt = a.currentTime + 0.3;
  timer = window.setInterval(tick, TICK_MS);
}

export function stopMusic(): void {
  window.clearInterval(timer);
  timer = 0;
  fadeOut();
}

function begin(at: number): void {
  const ac = a!;
  const list = currentPlaylist();
  const track = pickTrack(list);
  const out = ac.createGain();
  out.gain.value = 1;
  out.connect(master);
  out.connect(send);
  const pan = (p: number, dry = false): AudioNode => {
    const g = ac.createGain();
    if (ac.createStereoPanner) {
      const sp = ac.createStereoPanner();
      sp.pan.value = p;
      g.connect(sp).connect(dry ? master : out);
    } else g.connect(dry ? master : out);
    return g;
  };
  // Percussion skips the echo but follows the track's fade.
  const perc = ac.createGain();
  perc.connect(master);
  const parts = { lead: pan(0), acc: pan(-0.28), bass: pan(0), counter: pan(0.3), bell: pan(0.45), ooo: pan(-0.4), perc };
  const step = stepSeconds(track);
  echo.delayTime.setTargetAtTime(Math.min(0.5, Math.max(0.22, step * 3)), at, 0.1);
  playing = { track, list, song: arrange(track, 0), round: 0, start: at, began: at, ni: 0, hi: 0, out, parts };
  for (const fn of listeners) fn(track.title);
}

/** One time through, in time order (the composer writes it part by part). */
function arrange(track: TrackDef, round: number): Song {
  const song = compose(track, round);
  song.notes.sort((x, y) => x.t - y.t);
  song.hits.sort((x, y) => x.t - y.t);
  return song;
}

/** Fade a track (and its dry drums) out and let it go. */
function release(p: Playing, from: number, fade: number): void {
  for (const g of [p.out, p.parts.perc as GainNode]) {
    g.gain.cancelScheduledValues(from);
    g.gain.setValueAtTime(g.gain.value, from);
    g.gain.linearRampToValueAtTime(0, from + fade);
  }
  window.setTimeout(() => {
    p.out.disconnect();
    p.parts.perc.disconnect();
  }, (from - a!.currentTime + fade + 1.5) * 1000);
}

function fadeOut(): void {
  const p = playing;
  playing = null;
  if (!p || !a) return;
  release(p, a.currentTime, FADE);
  for (const fn of listeners) fn(null);
}

function tick(): void {
  const ac = a;
  if (!ac || ac.state !== 'running') return;
  const horizon = ac.currentTime + LOOKAHEAD;
  if (!playing) {
    if (ac.currentTime + 0.1 >= nextAt) begin(Math.max(nextAt, ac.currentTime + 0.05));
    else return;
  }
  const p = playing!;
  const step = stepSeconds(p.track);
  const swing = p.track.meter !== 6 ? (p.track.swing ?? 0) : 0;
  const when = (t: number) => {
    const whole = Math.abs(t - Math.round(t)) < 1e-6 && Math.round(t) % 2 === 1;
    return p.start + (t + (whole ? swing : 0)) * step;
  };
  const { notes, hits } = p.song;
  while (p.ni < notes.length && when(notes[p.ni].t) < horizon) {
    const n = notes[p.ni++];
    play(n, Math.max(when(n.t), ac.currentTime), n.len * step, p.parts[n.part]);
  }
  while (p.hi < hits.length && when(hits[p.hi].t) < horizon) {
    const h = hits[p.hi++];
    drum(h, Math.max(when(h.t), ac.currentTime), p.parts.perc);
  }
  const end = p.start + p.song.steps * step;
  if (p.ni >= notes.length && p.hi >= hits.length && end < horizon) {
    const playlistChanged = currentPlaylist() !== p.list && !forced();
    if (!playlistChanged && end - p.began < TRACK_SECONDS) {
      // Once more, arranged a little differently.
      p.round++;
      p.song = arrange(p.track, p.round);
      p.start = end;
      p.ni = p.hi = 0;
    } else {
      // Let the last notes ring, rest, then something new.
      playing = null;
      release(p, end + 1, 2.5);
      nextAt = end + 3 + Math.random() * 4;
      for (const fn of listeners) fn(null);
    }
  }
}

// --- instruments -------------------------------------------------------------------

const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

interface Partial {
  /** Frequency ratio. */
  r: number;
  /** Relative level. */
  v: number;
  /** Decay time for this partial (s), for struck sounds. */
  d?: number;
  type?: OscillatorType;
}

interface Voice {
  partials: Partial[];
  /** Struck/plucked: rings for this long whatever the note length. */
  decay?: number;
  attack: number;
  release: number;
  vibrato?: { rate: number; depth: number; delay: number };
  /** Starts this far off pitch and slides in (a ratio, e.g. 0.97). */
  scoop?: number;
  lowpass?: number;
  gain: number;
}

const VOICES: Record<Timbre, Voice> = {
  musicbox: { partials: [{ r: 1, v: 1 }, { r: 2, v: 0.22, d: 0.4 }, { r: 5.4, v: 0.06, d: 0.12 }], decay: 1.4, attack: 0.003, release: 0.1, gain: 1 },
  celesta: { partials: [{ r: 1, v: 1 }, { r: 2, v: 0.3, d: 0.6 }, { r: 4, v: 0.08, d: 0.2 }], decay: 1.6, attack: 0.003, release: 0.1, gain: 0.95 },
  glock: { partials: [{ r: 1, v: 1 }, { r: 2.76, v: 0.25, d: 0.3 }, { r: 5.4, v: 0.08, d: 0.1 }], decay: 1.1, attack: 0.002, release: 0.1, gain: 0.85 },
  pluck: { partials: [{ r: 1, v: 1, type: 'triangle' }, { r: 2, v: 0.25, d: 0.2 }], decay: 0.7, attack: 0.004, release: 0.08, lowpass: 2200, gain: 1 },
  koto: { partials: [{ r: 1, v: 1, type: 'triangle' }, { r: 2, v: 0.35, d: 0.3 }, { r: 3, v: 0.12, d: 0.15 }], decay: 1.2, attack: 0.003, release: 0.1, scoop: 1.015, lowpass: 2600, gain: 0.95 },
  harp: { partials: [{ r: 1, v: 1, type: 'triangle' }, { r: 2, v: 0.2, d: 0.5 }], decay: 1.6, attack: 0.005, release: 0.15, lowpass: 1800, gain: 1 },
  kalimba: { partials: [{ r: 1, v: 1 }, { r: 5.95, v: 0.18, d: 0.06 }, { r: 2, v: 0.12, d: 0.3 }], decay: 0.9, attack: 0.002, release: 0.08, gain: 1.05 },
  marimba: { partials: [{ r: 1, v: 1 }, { r: 4, v: 0.2, d: 0.06 }, { r: 10, v: 0.04, d: 0.02 }], decay: 0.55, attack: 0.002, release: 0.06, gain: 1.15 },
  steel: { partials: [{ r: 1, v: 1 }, { r: 2, v: 0.4, d: 0.5 }, { r: 3.01, v: 0.15, d: 0.25 }, { r: 1.003, v: 0.4 }], decay: 1, attack: 0.004, release: 0.1, gain: 0.75 },
  flute: { partials: [{ r: 1, v: 1 }, { r: 2, v: 0.12 }, { r: 3, v: 0.04 }], attack: 0.07, release: 0.12, vibrato: { rate: 5, depth: 0.006, delay: 0.18 }, gain: 0.48 },
  whistle: { partials: [{ r: 1, v: 1 }, { r: 2, v: 0.18 }], attack: 0.025, release: 0.06, vibrato: { rate: 6, depth: 0.005, delay: 0.12 }, scoop: 0.985, gain: 0.42 },
  ocarina: { partials: [{ r: 1, v: 1 }, { r: 3, v: 0.03 }], attack: 0.05, release: 0.1, vibrato: { rate: 4.5, depth: 0.005, delay: 0.2 }, gain: 0.48 },
  erhu: { partials: [{ r: 1, v: 1, type: 'sawtooth' }, { r: 1.004, v: 0.4, type: 'sawtooth' }], attack: 0.09, release: 0.15, vibrato: { rate: 5.5, depth: 0.011, delay: 0.15 }, scoop: 0.97, lowpass: 1500, gain: 0.45 },
  reed: { partials: [{ r: 1, v: 1, type: 'square' }, { r: 1.006, v: 0.7, type: 'sawtooth' }], attack: 0.03, release: 0.08, vibrato: { rate: 5.8, depth: 0.003, delay: 0.1 }, lowpass: 1700, gain: 0.32 },
  organ: { partials: [{ r: 1, v: 1 }, { r: 2, v: 0.5 }, { r: 3, v: 0.25 }, { r: 4, v: 0.12 }], attack: 0.012, release: 0.08, vibrato: { rate: 6.5, depth: 0.003, delay: 0 }, gain: 0.55 },
  theremin: { partials: [{ r: 1, v: 1 }, { r: 2, v: 0.06 }], attack: 0.18, release: 0.3, vibrato: { rate: 5.5, depth: 0.018, delay: 0.1 }, scoop: 0.94, gain: 0.48 },
  sitar: { partials: [{ r: 1, v: 1, type: 'sawtooth' }, { r: 2.002, v: 0.25, d: 0.5 }, { r: 3, v: 0.2, d: 0.3, type: 'triangle' }], decay: 1.5, attack: 0.004, release: 0.15, scoop: 0.96, lowpass: 2400, gain: 0.85 },
  pad: { partials: [{ r: 1, v: 1, type: 'triangle' }, { r: 1.005, v: 0.8, type: 'triangle' }, { r: 2, v: 0.15 }], attack: 0.45, release: 0.7, lowpass: 1000, gain: 0.7 },
};

function play(n: NoteEvent, t: number, dur: number, out: AudioNode): void {
  const ac = a!;
  const v = VOICES[n.timbre];
  const f = hz(n.midi);
  const level = n.vol * v.gain;
  const ring = v.decay !== undefined ? Math.min(v.decay, dur + v.decay * 0.6) : dur + v.release;
  const stop = t + ring + 0.05;
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(level, t + v.attack);
  if (v.decay !== undefined) env.gain.exponentialRampToValueAtTime(0.0001, t + ring);
  else {
    env.gain.setValueAtTime(level, Math.max(t + v.attack, t + dur - 0.02));
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + v.release);
  }
  let dest: AudioNode = env;
  if (v.lowpass) {
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = v.lowpass;
    lp.Q.value = 0.4;
    lp.connect(env);
    dest = lp;
  }
  env.connect(out);
  let vib: OscillatorNode | null = null;
  let vibGain: GainNode | null = null;
  if (v.vibrato && dur > 0.25) {
    vib = ac.createOscillator();
    vib.frequency.value = v.vibrato.rate;
    vibGain = ac.createGain();
    vibGain.gain.setValueAtTime(0, t);
    vibGain.gain.linearRampToValueAtTime(f * v.vibrato.depth, t + v.vibrato.delay + 0.2);
    vib.connect(vibGain);
    vib.start(t);
    vib.stop(stop);
  }
  const total = v.partials.reduce((s, p) => s + p.v, 0);
  for (const p of v.partials) {
    const osc = ac.createOscillator();
    osc.type = p.type ?? 'sine';
    const pf = f * p.r;
    if (pf > 12000) continue;
    if (v.scoop) {
      osc.frequency.setValueAtTime(pf * v.scoop, t);
      osc.frequency.exponentialRampToValueAtTime(pf, t + 0.07);
    } else osc.frequency.setValueAtTime(pf, t);
    if (vibGain) vibGain.connect(osc.frequency);
    const g = ac.createGain();
    const pv = p.v / total;
    g.gain.setValueAtTime(pv, t);
    if (p.d) g.gain.exponentialRampToValueAtTime(Math.max(0.0001, pv * 0.01), t + p.d);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(stop);
  }
}

// --- drums -------------------------------------------------------------------------

const DRUM_VOL = 0.09;

function boom(t: number, out: AudioNode, f0: number, f1: number, dur: number, vol: number, type: OscillatorType = 'sine'): void {
  const ac = a!;
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function hiss(t: number, out: AudioNode, type: BiquadFilterType, freq: number, q: number, dur: number, vol: number, attack = 0.003): void {
  const ac = a!;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf(ac, 2);
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  // Start somewhere random in the noise so repeated hits don't sound identical.
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.05);
}

function ding(t: number, out: AudioNode, f: number, dur: number, vol: number): void {
  boom(t, out, f, f * 0.999, dur, vol);
}

function drum(h: HitEvent, t: number, out: AudioNode): void {
  const v = h.vol * DRUM_VOL;
  const kit: Record<PercHit, () => void> = {
    kick: () => boom(t, out, 130, 48, 0.2, v * 1.6),
    shaker: () => hiss(t, out, 'highpass', 6500, 0.7, 0.06, v * 0.6, 0.008),
    brush: () => hiss(t, out, 'bandpass', 3200, 0.5, 0.16, v * 0.7, 0.02),
    block: () => (ding(t, out, 980, 0.06, v * 0.9), ding(t, out, 2400, 0.02, v * 0.2)),
    bodhran: () => (boom(t, out, 150, 95, 0.12, v), hiss(t, out, 'lowpass', 700, 0.5, 0.05, v * 0.4)),
    bodhranLo: () => boom(t, out, 95, 55, 0.28, v * 1.4),
    taiko: () => (boom(t, out, 100, 52, 0.55, v * 1.8), hiss(t, out, 'lowpass', 350, 0.5, 0.15, v * 0.7)),
    taikoRim: () => (ding(t, out, 1500, 0.035, v * 0.6), hiss(t, out, 'bandpass', 3000, 1, 0.02, v * 0.4)),
    gong: () => {
      for (const [r, lv] of [[1, 1], [1.48, 0.5], [2.1, 0.35], [2.73, 0.2]] as const) boom(t, out, 98 * r * 1.01, 98 * r, 3.2, v * 0.7 * lv);
      hiss(t, out, 'bandpass', 600, 0.7, 0.4, v * 0.15, 0.02);
    },
    dha: () => (boom(t, out, 85, 125, 0.35, v * 1.2), ding(t, out, 420, 0.2, v * 0.5)),
    na: () => (ding(t, out, 560, 0.18, v * 0.7), ding(t, out, 1120, 0.08, v * 0.2)),
    tin: () => ding(t, out, 740, 0.12, v * 0.5),
    sleigh: () => {
      for (let k = 0; k < 3; k++) hiss(t + k * 0.012, out, 'highpass', 7000, 0.8, 0.07, v * 0.5);
      ding(t, out, 3520, 0.12, v * 0.12);
      ding(t + 0.01, out, 4700, 0.1, v * 0.08);
    },
    clap: () => {
      for (let k = 0; k < 3; k++) hiss(t + k * 0.01, out, 'bandpass', 1400, 1.2, 0.05 + k * 0.03, v * 0.7);
    },
    thump: () => boom(t, out, 72, 48, 0.16, v * 1.4),
    snare: () => (hiss(t, out, 'bandpass', 2600, 0.6, 0.12, v * 0.6), boom(t, out, 220, 160, 0.06, v * 0.5, 'triangle')),
    tock: () => (ding(t, out, 1650, 0.03, v * 0.6), ding(t, out, 820, 0.04, v * 0.3)),
    triangle: () => (ding(t, out, 2637, 0.9, v * 0.25), ding(t, out, 4186, 0.5, v * 0.1)),
  };
  kit[h.hit]();
}

// --- offline rendering ---------------------------------------------------------------

/** Plays a track into an offline context (scripts/music-check.mjs measures the mix with it). */
export async function renderTrack(id: string, seconds: number, rate = 22050): Promise<{ peak: number; rms: number }> {
  const track = Object.values(PLAYLISTS).flat().find((t) => t.id === id)!;
  const off = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
  const saved = { a, master, noiseBuf, echo, send };
  const out = off.createGain();
  out.gain.value = 0.22;
  out.connect(off.destination);
  let buf: AudioBuffer | null = null;
  attachMusic(off, out, (ac) => {
    if (buf) return buf;
    buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  });
  const step = stepSeconds(track);
  const swing = track.meter !== 6 ? (track.swing ?? 0) : 0;
  const lead = off.createGain();
  lead.connect(out);
  lead.connect(send);
  for (let round = 0, start = 0.05; start < seconds; round++) {
    const song = compose(track, round);
    const when = (t: number) => start + (t + (Math.abs(t - Math.round(t)) < 1e-6 && Math.round(t) % 2 === 1 ? swing : 0)) * step;
    for (const n of song.notes) if (when(n.t) < seconds) play(n, when(n.t), n.len * step, lead);
    for (const h of song.hits) if (when(h.t) < seconds) drum(h, when(h.t), out);
    start += song.steps * step;
  }
  ({ a, master, noiseBuf, echo, send } = saved);
  const rendered = await off.startRendering();
  let peak = 0;
  let sum = 0;
  for (let c = 0; c < 2; c++)
    for (const x of rendered.getChannelData(c)) {
      peak = Math.max(peak, Math.abs(x));
      sum += x * x;
    }
  return { peak, rms: Math.sqrt(sum / (2 * rendered.length)) };
}
