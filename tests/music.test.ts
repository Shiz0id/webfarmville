import { describe, expect, it } from 'vitest';
import { EVENTS } from '@farm/shared';
import { chordSemis, compose, parseTune, stepsPerBar, type TrackDef } from '../client/src/music/compose';
import { PLAYLISTS } from '../client/src/music/tracks';

const ALL = Object.values(PLAYLISTS).flat();
const MOODS = ['morning', 'day', 'evening', 'night', 'rain', 'snow'];

/** The chord under a step, as pitch classes. */
function chordPcs(t: TrackDef, step: number): number[] {
  const spb = stepsPerBar(t.meter);
  const c = t.prog[Math.floor(step / spb) % t.prog.length];
  const ref = typeof c === 'object' ? (step % spb < spb / 2 ? c[0] : c[1]) : c;
  return chordSemis(t, ref).map((s) => (((t.key + s) % 12) + 12) % 12);
}

describe('the music box', () => {
  it('has a playlist for every mood and at least three songs for every festival', () => {
    for (const m of MOODS) expect(PLAYLISTS[m]?.length, m).toBeGreaterThanOrEqual(2);
    for (const id of Object.keys(EVENTS)) expect(PLAYLISTS[id]?.length ?? 0, id).toBeGreaterThanOrEqual(3);
    for (const id of Object.keys(PLAYLISTS)) expect(MOODS.includes(id) || id in EVENTS, id).toBe(true);
  });

  it('gives every song its own id and title', () => {
    expect(new Set(ALL.map((t) => t.id)).size).toBe(ALL.length);
    expect(new Set(ALL.map((t) => t.title)).size).toBe(ALL.length);
  });

  it('writes out each traditional tune to exactly fill its chords', () => {
    for (const t of ALL.filter((t) => t.tune)) {
      const len = parseTune(t.tune!).reduce((s, n) => s + n.len, 0);
      expect(len, t.id).toBe(t.prog.length * stepsPerBar(t.meter));
    }
  });

  it('keeps the written melodies on their chords', () => {
    for (const t of ALL.filter((t) => t.tune)) {
      const beat = t.meter === 6 ? 3 : 2;
      let on = 0;
      let all = 0;
      let at = 0;
      for (const n of parseTune(t.tune!)) {
        if (n.midi !== null && at % beat === 0) {
          all++;
          if (chordPcs(t, at).includes(n.midi % 12)) on++;
        }
        at += n.len;
      }
      expect(on / all, t.id).toBeGreaterThan(0.6);
    }
  });

  it('composes every song, every way it is arranged, into sane notes', () => {
    for (const t of ALL) {
      for (let round = 0; round < 3; round++) {
        const song = compose(t, round);
        expect(song.steps, t.id).toBe(t.prog.length * stepsPerBar(t.meter));
        expect(song.notes.filter((n) => n.part === 'lead').length, t.id).toBeGreaterThan(t.prog.length);
        for (const n of song.notes) {
          expect(Number.isFinite(n.midi) && Number.isFinite(n.t) && n.len > 0, `${t.id} ${JSON.stringify(n)}`).toBe(true);
          expect(n.t, t.id).toBeLessThan(song.steps);
          if (n.part === 'lead') expect(n.midi >= 55 && n.midi <= 91, `${t.id} lead ${n.midi}`).toBe(true);
          if (n.part === 'bass') expect(n.midi >= 30 && n.midi <= 72, `${t.id} bass ${n.midi}`).toBe(true);
        }
        for (const h of song.hits) expect(h.t >= 0 && h.t < song.steps, t.id).toBe(true);
      }
    }
  });

  it('brings composed melodies home to the tonic', () => {
    for (const t of ALL.filter((t) => !t.tune)) {
      const lead = compose(t).notes.filter((n) => n.part === 'lead');
      expect((lead[lead.length - 1].midi - t.key) % 12, t.id).toBe(0);
    }
  });

  it('plays the same song the same way every time', () => {
    const t = PLAYLISTS.day[0];
    expect(compose(t, 1)).toEqual(compose(t, 1));
  });
});
