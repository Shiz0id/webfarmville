// The music box's composer. A track is a little song: a key and scale, a
// chord progression, a melody and an arrangement (accompaniment, bass,
// percussion). Melodies are either written out (the traditional holiday tunes)
// or composed from a seed: a motif is made once per phrase letter and then
// developed over the chords in a song form like AABA, so every track is a
// real, repeating tune rather than random noodling.
//
// Everything here is pure (no WebAudio), so tracks can be checked in tests.

export type Timbre =
  | 'musicbox'
  | 'celesta'
  | 'glock'
  | 'pluck'
  | 'koto'
  | 'harp'
  | 'kalimba'
  | 'marimba'
  | 'steel'
  | 'flute'
  | 'whistle'
  | 'ocarina'
  | 'erhu'
  | 'reed'
  | 'organ'
  | 'theremin'
  | 'sitar'
  | 'pad';
export type Accomp = 'none' | 'arp' | 'block' | 'alberti' | 'waltz' | 'strum' | 'pad' | 'broken';
export type Bass = 'none' | 'root' | 'pulse' | 'oompah' | 'walk' | 'drone' | 'bounce';
export type Perc = 'none' | 'shaker' | 'brush' | 'tick' | 'jig' | 'taiko' | 'tabla' | 'sleigh' | 'party' | 'heart' | 'march' | 'steel' | 'clock';
export type PercHit =
  | 'kick'
  | 'shaker'
  | 'brush'
  | 'block'
  | 'bodhran'
  | 'bodhranLo'
  | 'taiko'
  | 'taikoRim'
  | 'gong'
  | 'dha'
  | 'na'
  | 'tin'
  | 'sleigh'
  | 'clap'
  | 'thump'
  | 'snare'
  | 'tock'
  | 'triangle';

/** 4 = 4/4 in eighths (8 steps a bar), 3 = 3/4 in eighths (6), 6 = 6/8 (6 steps, two lilting beats). */
export type Meter = 3 | 4 | 6;

export interface TrackDef {
  id: string;
  title: string;
  /** Quarter-note beats a minute (dotted quarters in 6/8). */
  bpm: number;
  meter: Meter;
  /** The tonic in the melody's octave (MIDI). */
  key: number;
  scale: readonly number[];
  /** A chord per bar (or two, for a bar that changes halfway): a scale degree, or a symbol like 'E' or 'Dm'. */
  prog: readonly (ChordRef | readonly [ChordRef, ChordRef])[];
  /** A written-out melody (see parseTune). Otherwise one is composed from `seed`. */
  tune?: string;
  seed?: number;
  /** Phrase letters; the progression is split evenly between them. */
  form?: string;
  /** How busy a composed melody is (0 calm .. 1 chatty). */
  busy?: number;
  lead: Timbre;
  accomp?: Accomp;
  accompTimbre?: Timbre;
  bass?: Bass;
  perc?: Perc;
  /** Sings a harmony (or a bell echo) on alternate times through. */
  counter?: Timbre;
  /** A soft high tinkle on the off-beats. */
  bells?: boolean;
  /** A ghostly "ooo" now and then. */
  ooo?: boolean;
  /** Delay for off-beat eighths, as a fraction of a step (a gentle shuffle). */
  swing?: number;
}

export interface NoteEvent {
  /** Start, in steps from the top of the song. */
  t: number;
  len: number;
  midi: number;
  part: 'lead' | 'acc' | 'bass' | 'counter' | 'bell' | 'ooo';
  timbre: Timbre;
  vol: number;
}

export interface HitEvent {
  t: number;
  hit: PercHit;
  vol: number;
}

export interface Song {
  steps: number;
  notes: NoteEvent[];
  hits: HitEvent[];
}

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  pentatonic: [0, 2, 4, 7, 9],
  minorPent: [0, 3, 5, 7, 10],
  /** Japanese miyako-bushi. */
  in: [0, 1, 5, 7, 8],
  hirajoshi: [0, 2, 3, 7, 8],
  /** The raga Bhairav's colours (double harmonic). */
  bhairav: [0, 1, 4, 5, 7, 8, 11],
  wholeTone: [0, 2, 4, 6, 8, 10],
} as const;

/** A chord: a scale degree to build a triad on, or a chord symbol ('G', 'Am', 'Bdim', 'D7', 'Csus'). */
export type ChordRef = number | string;

export const stepsPerBar = (m: Meter): number => (m === 4 ? 8 : 6);
const beatSteps = (m: Meter): number => (m === 6 ? 3 : 2);

/** A scale degree (any integer; wraps into octaves) as MIDI. */
export function degMidi(scale: readonly number[], key: number, deg: number): number {
  const n = scale.length;
  const oct = Math.floor(deg / n);
  return key + 12 * oct + scale[((deg % n) + n) % n];
}

/** The chord tones of a chord built on scale degree `root`, as scale degrees. */
function chordDegs(scale: readonly number[], root: number): number[] {
  return scale.length >= 6 ? [root, root + 2, root + 4] : [root, root + 2, root + 3];
}

const QUALITIES: Record<string, number[]> = { '': [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8], '7': [0, 4, 7], m7: [0, 3, 7], sus: [0, 5, 7] };
const PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A chord's root, third and fifth as semitones above the tonic (the root within the first octave). */
export function chordSemis(track: TrackDef, ref: ChordRef): number[] {
  if (typeof ref === 'number') {
    const n = track.scale.length;
    const degs = chordDegs(track.scale, ((ref % n) + n) % n);
    return degs.map((d) => degMidi(track.scale, 0, d));
  }
  const m = /^([A-G])([#b]?)(m7|m|dim|aug|7|sus)?$/.exec(ref);
  if (!m) throw new Error(`Bad chord "${ref}"`);
  const pc = PITCH[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const root = (((pc - track.key) % 12) + 12) % 12;
  return QUALITIES[m[3] ?? ''].map((i) => root + i);
}

/** Is scale degree `deg` one of the chord's notes? */
function isChordTone(track: TrackDef, ref: ChordRef, deg: number): boolean {
  const pc = (((degMidi(track.scale, 0, deg)) % 12) + 12) % 12;
  return chordSemis(track, ref).some((s) => ((s % 12) + 12) % 12 === pc);
}

/** The chord sounding at a step. */
function chordAt(track: TrackDef, step: number): ChordRef {
  const spb = stepsPerBar(track.meter);
  const c = track.prog[Math.floor(step / spb) % track.prog.length];
  if (typeof c === 'number' || typeof c === 'string') return c;
  return step % spb < spb / 2 ? c[0] : c[1];
}

// --- written melodies -----------------------------------------------------------

const NOTE_NAMES: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/**
 * A melody written as "e5:2 g5:2 c5:3 d5:1 | e5:8". Each note is a name, an
 * optional # or b, an octave (kept from the note before when left out) and a
 * length in steps; "r:4" is a rest. Bar lines are just for reading.
 */
export function parseTune(text: string): { midi: number | null; len: number }[] {
  const out: { midi: number | null; len: number }[] = [];
  let octave = 5;
  for (const tok of text.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const m = /^([a-gr])([#b]?)(\d?):(\d+(?:\.\d+)?)$/.exec(tok);
    if (!m) throw new Error(`Bad note "${tok}"`);
    const [, name, acc, oct, len] = m;
    if (oct) octave = Number(oct);
    if (name === 'r') {
      out.push({ midi: null, len: Number(len) });
      continue;
    }
    const midi = 12 * (octave + 1) + NOTE_NAMES[name] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0);
    out.push({ midi, len: Number(len) });
  }
  return out;
}

// --- composed melodies ------------------------------------------------------------

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RHYTHMS: Record<Meter, { calm: number[][]; busy: number[][]; end: number[][] }> = {
  4: {
    calm: [[4, 4], [2, 2, 4], [4, 2, 2], [6, 2], [2, 4, 2], [3, 1, 4], [2, 2, 2, 2]],
    busy: [[2, 2, 2, 2], [3, 1, 2, 2], [2, 1, 1, 2, 2], [1, 1, 2, 1, 1, 2], [3, 1, 3, 1], [2, 2, 1, 1, 2], [1, 1, 1, 1, 2, 2]],
    end: [[8], [4, 4], [2, 2, 4], [3, 1, 4]],
  },
  3: {
    calm: [[4, 2], [2, 4], [6], [2, 2, 2], [3, 1, 2]],
    busy: [[2, 2, 2], [3, 1, 2], [2, 1, 1, 2], [1, 1, 2, 2], [2, 2, 1, 1]],
    end: [[6], [4, 2], [2, 4]],
  },
  6: {
    calm: [[3, 3], [2, 1, 3], [3, 2, 1], [6]],
    busy: [[2, 1, 2, 1], [1, 1, 1, 2, 1], [2, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1], [3, 2, 1]],
    end: [[6], [3, 3], [2, 1, 3]],
  },
};

const SHAPES: ((t: number) => number)[] = [
  (t) => 0.35 + 0.45 * Math.sin(Math.PI * t), // arch
  (t) => 0.25 + 0.55 * t, // rise
  (t) => 0.8 - 0.5 * t, // fall
  (t) => 0.5 + 0.28 * Math.sin(2 * Math.PI * t), // wave
  (t) => 0.75 - 0.4 * Math.sin(Math.PI * t), // valley
];

interface MotifNote {
  at: number;
  len: number;
  h: number;
}

/** A phrase's rhythm and contour, independent of the chords it will be sung over. */
function makeMotif(r: () => number, meter: Meter, bars: number, busy: number): MotifNote[] {
  const spb = stepsPerBar(meter);
  const bank = RHYTHMS[meter];
  const shape = SHAPES[Math.floor(r() * SHAPES.length)];
  const pick = (list: number[][]) => list[Math.floor(r() * list.length)];
  const bar1 = pick(r() < busy ? bank.busy : bank.calm);
  const notes: MotifNote[] = [];
  for (let b = 0; b < bars; b++) {
    // Echo the opening rhythm (the hook), vary the middle, settle at the end.
    const rhythm =
      b === bars - 1 ? pick(bank.end) : b === 0 || (b % 2 === 0 && r() < 0.6) ? bar1 : pick(r() < busy ? bank.busy : bank.calm);
    let at = 0;
    for (const len of rhythm) {
      const t = (b * spb + at) / (bars * spb);
      notes.push({ at: b * spb + at, len, h: Math.max(0, Math.min(1, shape(t) + (r() - 0.5) * 0.24)) });
      at += len;
    }
  }
  return notes;
}

/** Sing a motif over the chords starting at `start`, ending in the given way. */
function realize(
  track: TrackDef,
  motif: MotifNote[],
  start: number,
  ending: 'open' | 'half' | 'close',
  prevDeg: number,
): { notes: { t: number; len: number; deg: number }[]; last: number } {
  const scale = track.scale;
  const n = scale.length;
  const lo = n >= 6 ? -3 : -2;
  const span = n >= 6 ? 11 : 8;
  const beat = beatSteps(track.meter);
  const out: { t: number; len: number; deg: number }[] = [];
  let prev = prevDeg;
  motif.forEach((m, i) => {
    const t = start + m.at;
    const root = chordAt(track, t);
    const target = Math.round(lo + m.h * span);
    let deg: number;
    if (i === motif.length - 1) {
      // Cadences: home on the tonic, a question on the dominant.
      const goal = ending === 'close' ? 0 : ending === 'half' ? (n >= 6 ? 4 : 3) : target;
      const cands = [goal - n, goal, goal + n];
      deg = nearest(ending === 'open' ? chordNear(track, root, target) : cands, prev);
    } else if (m.at % beat === 0) {
      deg = chordNear(track, root, target).reduce((a, b) => (Math.abs(b - target) + Math.abs(b - prev) * 0.5 < Math.abs(a - target) + Math.abs(a - prev) * 0.5 ? b : a));
    } else {
      // Off the beat: a step or two from the last note, leaning toward the contour.
      const dir = Math.sign(target - prev) || (i % 2 ? 1 : -1);
      deg = prev + dir * (Math.abs(target - prev) > 2 ? 2 : 1);
    }
    out.push({ t, len: m.len, deg });
    prev = deg;
  });
  // Smooth a big leap into the final note.
  if (out.length >= 2) {
    const a = out[out.length - 2];
    const z = out[out.length - 1];
    if (Math.abs(a.deg - z.deg) > 3) a.deg = z.deg + Math.sign(a.deg - z.deg) * (n >= 6 ? 2 : 1);
  }
  return { notes: out, last: prev };
}

function chordNear(track: TrackDef, root: ChordRef, target: number): number[] {
  const out: number[] = [];
  for (let d = target - 4; d <= target + 4; d++) if (isChordTone(track, root, d)) out.push(d);
  return out.length ? out : [target];
}

const nearest = (cands: number[], to: number): number => cands.reduce((a, b) => (Math.abs(b - to) < Math.abs(a - to) ? b : a));

/** The melody for one time through the song, as scale degrees (composed) or MIDI (written). */
function melody(track: TrackDef): { t: number; len: number; midi: number; deg?: number }[] {
  const spb = stepsPerBar(track.meter);
  if (track.tune) {
    const out: { t: number; len: number; midi: number }[] = [];
    let t = 0;
    for (const n of parseTune(track.tune)) {
      if (n.midi !== null) out.push({ t, len: n.len, midi: n.midi });
      t += n.len;
    }
    return out;
  }
  const r = mulberry(track.seed ?? 1);
  const form = track.form ?? 'AABA';
  const bars = Math.max(1, Math.floor(track.prog.length / form.length));
  const motifs = new Map<string, MotifNote[]>();
  const out: { t: number; len: number; midi: number; deg: number }[] = [];
  let prev = 2;
  [...form].forEach((letter, i) => {
    let motif = motifs.get(letter);
    if (!motif) motifs.set(letter, (motif = makeMotif(r, track.meter, bars, track.busy ?? 0.5)));
    const ending = i === form.length - 1 ? 'close' : i % 2 === 1 ? 'half' : 'open';
    const phrase = realize(track, motif, i * bars * spb, ending, prev);
    prev = phrase.last;
    for (const n of phrase.notes) out.push({ ...n, midi: degMidi(track.scale, track.key, n.deg) });
  });
  return out;
}

// --- the arrangement ------------------------------------------------------------

const ACCOMP_VOL = 0.045;
const BASS_VOL = 0.07;

function accompaniment(track: TrackDef, steps: number, light: boolean): NoteEvent[] {
  const kind = light ? 'block' : (track.accomp ?? 'arp');
  if (kind === 'none') return [];
  const spb = stepsPerBar(track.meter);
  const timbre = track.accompTimbre ?? (kind === 'pad' ? 'pad' : 'musicbox');
  const out: NoteEvent[] = [];
  const tones = (step: number) => chordSemis(track, chordAt(track, step)).map((st) => track.key - 12 + st);
  const add = (t: number, len: number, midi: number, vol = ACCOMP_VOL) => out.push({ t, len, midi, part: 'acc', timbre, vol });
  for (let bar = 0; bar * spb < steps; bar++) {
    const s = bar * spb;
    const c = tones(s);
    const c2 = tones(s + spb / 2);
    const four = [...c, c[0] + 12];
    switch (kind) {
      case 'arp': {
        const pat = spb === 8 ? [0, 1, 2, 3, 2, 1, 2, 1] : [0, 1, 2, 3, 2, 1];
        pat.forEach((p, i) => add(s + i, 1.6, (i < spb / 2 ? [...c, c[0] + 12] : [...c2, c2[0] + 12])[p], ACCOMP_VOL * 0.9));
        break;
      }
      case 'broken': {
        const pat = spb === 8 ? [0, 2, 1, 3] : [0, 2, 3];
        const len = spb === 8 ? 2 : 2;
        pat.forEach((p, i) => add(s + i * len, len * 1.4, (i * len < spb / 2 ? four : [...c2, c2[0] + 12])[p]));
        break;
      }
      case 'alberti': {
        for (let i = 0; i < spb; i++) {
          const cc = i < spb / 2 ? c : c2;
          add(s + i, 1.2, cc[[0, 2, 1, 2][i % 4]], ACCOMP_VOL * 0.8);
        }
        break;
      }
      case 'block':
        for (const m of c) add(s, spb / 2, m, ACCOMP_VOL * 0.7);
        for (const m of c2) add(s + spb / 2, spb / 2, m, ACCOMP_VOL * (chordAt(track, s) === chordAt(track, s + spb / 2) ? 0.45 : 0.6));
        break;
      case 'waltz':
        // Oom-pah-pah: the bass takes the oom.
        for (const at of spb === 6 ? [2, 4] : [2, 4, 6]) for (const m of c.slice(1)) add(s + at, 1.5, m, ACCOMP_VOL * 0.8);
        break;
      case 'strum':
        for (const at of spb === 8 ? [0, 3, 6] : [0, 3]) c.forEach((m, k) => add(s + at + k * 0.08, 2, m, ACCOMP_VOL * 0.75));
        break;
      case 'pad':
        for (const m of c) add(s, spb, m, ACCOMP_VOL * 0.7);
        break;
    }
  }
  return out;
}

function bassline(track: TrackDef, steps: number): NoteEvent[] {
  const kind = track.bass ?? 'root';
  if (kind === 'none') return [];
  const spb = stepsPerBar(track.meter);
  const beat = beatSteps(track.meter);
  const n = track.scale.length;
  const out: NoteEvent[] = [];
  const root = (step: number) => {
    let m = track.key - 24 + chordSemis(track, chordAt(track, step))[0];
    while (m > track.key - 17) m -= 12;
    while (m < track.key - 29) m += 12;
    return m;
  };
  /** Chord tone k (0 root, 1 third, 2 fifth) just above the bass root. */
  const tone = (step: number, k: number) => {
    const semis = chordSemis(track, chordAt(track, step));
    return root(step) + (semis[k] - semis[0]);
  };
  const fifth = (step: number) => tone(step, 2);
  const add = (t: number, len: number, midi: number, vol = BASS_VOL) => out.push({ t, len, midi, part: 'bass', timbre: 'pluck', vol });
  for (let bar = 0; bar * spb < steps; bar++) {
    const s = bar * spb;
    switch (kind) {
      case 'root':
        add(s, spb / 2, root(s));
        if (chordAt(track, s) !== chordAt(track, s + spb / 2) || spb === 8) add(s + spb / 2, spb / 2, root(s + spb / 2), BASS_VOL * 0.8);
        break;
      case 'pulse':
        for (let b = 0; b < spb; b += beat) add(s + b, beat, root(s + b), b ? BASS_VOL * 0.75 : BASS_VOL);
        break;
      case 'oompah':
        add(s, beat, root(s));
        if (spb === 8) add(s + 4, beat, fifth(s + 4), BASS_VOL * 0.8);
        break;
      case 'walk': {
        // Root, third, fifth, then a half step into the next bar's root.
        const next = root(s + spb);
        const line = [root(s), tone(s, 1), fifth(s), next + (next > fifth(s) ? -1 : 1)];
        const at = spb === 8 ? [0, 2, 4, 6] : [0, 2, 4];
        at.forEach((a, i) => add(s + a, 2, line[spb === 8 ? i : [0, 2, 3][i]], i ? BASS_VOL * 0.75 : BASS_VOL));
        break;
      }
      case 'drone':
        if (bar % 2 === 0) {
          add(s, spb * 2, degMidi(track.scale, track.key, -2 * n), BASS_VOL * 0.7);
          add(s, spb * 2, degMidi(track.scale, track.key, -2 * n) + 7, BASS_VOL * 0.45);
        }
        break;
      case 'bounce':
        add(s, 1.5, root(s));
        add(s + 3, 1, root(s) + 12, BASS_VOL * 0.6);
        if (spb === 8) {
          add(s + 4, 1.5, fifth(s + 4), BASS_VOL * 0.8);
          add(s + 6, 1, root(s + 4) + 12, BASS_VOL * 0.6);
        }
        break;
    }
  }
  return out;
}

const PERC: Record<Perc, Record<Meter, [number, PercHit, number][]>> = {
  none: { 3: [], 4: [], 6: [] },
  shaker: {
    4: [[0, 'kick', 0.5], [1, 'shaker', 0.35], [3, 'shaker', 0.5], [4, 'kick', 0.4], [5, 'shaker', 0.35], [7, 'shaker', 0.5]],
    3: [[0, 'kick', 0.5], [2, 'shaker', 0.45], [4, 'shaker', 0.45]],
    6: [[0, 'kick', 0.5], [2, 'shaker', 0.35], [3, 'shaker', 0.5], [5, 'shaker', 0.35]],
  },
  brush: {
    4: [[0, 'kick', 0.45], [2, 'brush', 0.5], [4, 'kick', 0.35], [6, 'brush', 0.5], [7, 'brush', 0.2]],
    3: [[0, 'kick', 0.45], [2, 'brush', 0.4], [4, 'brush', 0.4]],
    6: [[0, 'kick', 0.45], [3, 'brush', 0.5]],
  },
  tick: {
    4: [[0, 'block', 0.5], [2, 'block', 0.3], [4, 'block', 0.4], [6, 'block', 0.3]],
    3: [[0, 'block', 0.5], [2, 'block', 0.3], [4, 'block', 0.3]],
    6: [[0, 'block', 0.5], [3, 'block', 0.35]],
  },
  jig: {
    6: [[0, 'bodhranLo', 0.8], [1, 'bodhran', 0.3], [2, 'bodhran', 0.4], [3, 'bodhranLo', 0.6], [4, 'bodhran', 0.3], [5, 'bodhran', 0.4]],
    4: [[0, 'bodhranLo', 0.8], [1, 'bodhran', 0.3], [2, 'bodhran', 0.5], [3, 'bodhran', 0.3], [4, 'bodhranLo', 0.6], [5, 'bodhran', 0.3], [6, 'bodhran', 0.5], [7, 'bodhran', 0.3]],
    3: [[0, 'bodhranLo', 0.8], [2, 'bodhran', 0.4], [3, 'bodhran', 0.3], [4, 'bodhran', 0.4]],
  },
  taiko: {
    4: [[0, 'taiko', 0.9], [3, 'taikoRim', 0.4], [4, 'taiko', 0.6], [6, 'taikoRim', 0.4], [7, 'taikoRim', 0.3]],
    3: [[0, 'taiko', 0.9], [2, 'taikoRim', 0.4], [4, 'taiko', 0.5]],
    6: [[0, 'taiko', 0.9], [3, 'taiko', 0.5], [5, 'taikoRim', 0.35]],
  },
  tabla: {
    4: [[0, 'dha', 0.8], [2, 'na', 0.5], [3, 'na', 0.35], [4, 'dha', 0.6], [6, 'na', 0.5], [7, 'tin', 0.4]],
    3: [[0, 'dha', 0.8], [2, 'na', 0.45], [3, 'tin', 0.3], [4, 'na', 0.45]],
    6: [[0, 'dha', 0.8], [2, 'na', 0.4], [3, 'dha', 0.55], [5, 'tin', 0.4]],
  },
  sleigh: {
    4: [[0, 'sleigh', 0.7], [1, 'sleigh', 0.25], [2, 'sleigh', 0.5], [3, 'sleigh', 0.25], [4, 'sleigh', 0.6], [5, 'sleigh', 0.25], [6, 'sleigh', 0.5], [7, 'sleigh', 0.25]],
    3: [[0, 'sleigh', 0.7], [2, 'sleigh', 0.4], [4, 'sleigh', 0.4]],
    6: [[0, 'sleigh', 0.7], [1, 'sleigh', 0.25], [2, 'sleigh', 0.3], [3, 'sleigh', 0.55], [4, 'sleigh', 0.25], [5, 'sleigh', 0.3]],
  },
  party: {
    4: [[0, 'kick', 0.7], [1, 'shaker', 0.3], [2, 'clap', 0.5], [3, 'shaker', 0.3], [4, 'kick', 0.6], [5, 'shaker', 0.3], [6, 'clap', 0.5], [7, 'shaker', 0.4]],
    3: [[0, 'kick', 0.7], [2, 'clap', 0.4], [4, 'clap', 0.4]],
    6: [[0, 'kick', 0.7], [3, 'clap', 0.5], [5, 'shaker', 0.3]],
  },
  heart: {
    4: [[0, 'thump', 0.6], [1, 'thump', 0.35], [4, 'thump', 0.5], [5, 'thump', 0.3], [6, 'triangle', 0.2]],
    3: [[0, 'thump', 0.6], [1, 'thump', 0.35], [4, 'triangle', 0.2]],
    6: [[0, 'thump', 0.6], [1, 'thump', 0.35], [3, 'triangle', 0.2]],
  },
  march: {
    4: [[0, 'kick', 0.5], [2, 'snare', 0.4], [3, 'snare', 0.2], [4, 'kick', 0.45], [6, 'snare', 0.4], [7, 'snare', 0.25]],
    3: [[0, 'kick', 0.5], [2, 'snare', 0.35], [4, 'snare', 0.35]],
    6: [[0, 'kick', 0.5], [2, 'snare', 0.25], [3, 'snare', 0.4], [5, 'snare', 0.25]],
  },
  steel: {
    4: [[0, 'kick', 0.5], [2, 'shaker', 0.4], [3, 'block', 0.3], [4, 'kick', 0.4], [6, 'shaker', 0.4], [7, 'block', 0.3]],
    3: [[0, 'kick', 0.5], [2, 'block', 0.3], [4, 'shaker', 0.4]],
    6: [[0, 'kick', 0.5], [2, 'block', 0.3], [3, 'shaker', 0.4]],
  },
  clock: {
    4: [[0, 'tock', 0.45], [4, 'tock', 0.3]],
    3: [[0, 'tock', 0.45]],
    6: [[0, 'tock', 0.45], [3, 'tock', 0.3]],
  },
};

/**
 * One time through a track. `round` counts the times through: alternate rounds
 * add the counter-melody, and every third one thins out to give the ear a rest.
 */
export function compose(track: TrackDef, round = 0): Song {
  const spb = stepsPerBar(track.meter);
  const steps = track.prog.length * spb;
  const light = round % 3 === 2;
  const notes: NoteEvent[] = [];
  const lead = melody(track);
  const leadVol = 0.11;
  for (const m of lead) notes.push({ t: m.t, len: m.len, midi: m.midi, part: 'lead', timbre: track.lead, vol: leadVol });
  if (round % 3 === 1) {
    const counter = track.counter ?? 'glock';
    for (const m of lead) {
      if (m.t % beatSteps(track.meter) !== 0) continue;
      // A third below for composed tunes; a bell echo an octave up for written ones.
      const midi = m.deg !== undefined && counter !== 'glock' && counter !== 'celesta' ? degMidi(track.scale, track.key, m.deg - 2) : m.midi + 12;
      notes.push({ t: m.t + (midi > m.midi ? 1 : 0), len: m.len, midi, part: 'counter', timbre: counter, vol: midi > m.midi ? 0.035 : 0.05 });
    }
  }
  notes.push(...accompaniment(track, steps, light));
  notes.push(...bassline(track, steps));
  if (track.bells && !light)
    for (let t = 1; t < steps; t += 2)
      notes.push({ t, len: 0.5, midi: 96 + (t % 4 === 1 ? 0 : 3), part: 'bell', timbre: 'glock', vol: 0.012 });
  if (track.ooo)
    for (let bar = 3; bar < track.prog.length; bar += 6) {
      const c = chordSemis(track, chordAt(track, bar * spb));
      notes.push({ t: bar * spb + 1, len: spb * 1.5, midi: track.key + c[2], part: 'ooo', timbre: 'theremin', vol: 0.025 });
    }
  const hits: HitEvent[] = [];
  const pattern = PERC[track.perc ?? 'none'][track.meter];
  const percFrom = light ? Math.floor(track.prog.length / 2) : 0;
  for (let bar = percFrom; bar < track.prog.length; bar++) {
    for (const [at, hit, vol] of pattern) hits.push({ t: bar * spb + at, hit, vol });
    if (track.perc === 'taiko' && bar % 8 === 0) hits.push({ t: bar * spb, hit: 'gong', vol: 0.6 });
  }
  return { steps, notes, hits };
}

/** How long a step lasts, in seconds. */
export const stepSeconds = (track: TrackDef): number => 60 / track.bpm / (track.meter === 6 ? 3 : 2);
