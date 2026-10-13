// Every track the music box knows, by playlist. Outside festivals the farm's
// own songs follow the clock and the sky (morning, day, evening, night, rain
// and snow); each festival has its own set. A few traditional tunes (all in
// the public domain) are arranged for the holidays they belong to; the rest
// are composed from their seeds (see compose.ts).

import { SCALES as S, type TrackDef } from './compose';

// Chord progressions (scale degrees, 16 bars).
const POP = [0, 4, 5, 3, 0, 4, 5, 3, 3, 0, 3, 4, 0, 4, [3, 4], 0] as const;
const FOLK = [0, 3, 0, 4, 0, 3, 4, 0, 3, 3, 0, 0, 1, 4, 4, 0] as const;
const DOOWOP = [0, 5, 1, 4, 0, 5, 1, 4, 3, 3, 0, 5, 1, 4, 4, 0] as const;
const STROLL = [0, 0, 3, 3, 4, 4, 0, 0, 3, 3, 0, 5, 1, 4, 0, 0] as const;
const WALTZ = [0, 3, 4, 0, 0, 3, 4, 4, 5, 3, 0, 4, 0, 3, 4, 0] as const;
const DREAMY = [0, 1, 0, 1, 0, 1, 4, 0, 5, 1, 0, 4, 3, 1, 4, 0] as const; // lydian I-II
const COUNTRY = [0, 6, 0, 6, 0, 6, 3, 0, 3, 0, 6, 0, 3, 6, 0, 0] as const; // mixolydian I-bVII
const MINOR = [0, 3, 4, 0, 0, 3, 4, 4, 5, 3, 0, 4, 0, 5, 4, 0] as const; // harmonic minor safe
const NATMIN = [0, 5, 6, 0, 0, 5, 6, 6, 3, 0, 5, 6, 0, 3, [5, 6], 0] as const;
const DORIAN = [0, 3, 0, 3, 0, 3, 6, 6, 2, 3, 0, 0, 6, 3, 0, 0] as const;
const PENT1 = [0, 0, 4, 4, 3, 3, 0, 0, 4, 4, 2, 2, 1, 3, 0, 0] as const;
const PENT2 = [0, 2, 3, 0, 0, 2, 4, 3, 2, 2, 0, 0, 4, 3, 1, 0] as const;
const DRONE = [0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 3, 0, 0] as const;
const RAGA = [0, 0, 1, 0, 0, 3, 4, 0, 1, 1, 0, 0, 3, 4, 0, 0] as const;

const track = (t: TrackDef) => t;

export const PLAYLISTS: Record<string, TrackDef[]> = {
  // --- the farm's own songs ---------------------------------------------------------
  morning: [
    track({ id: 'sunrise', title: 'Sunrise Over the Barn', bpm: 80, meter: 4, key: 72, scale: S.lydian, prog: DREAMY, seed: 101, form: 'AABA', busy: 0.3, lead: 'flute', accomp: 'broken', accompTimbre: 'harp', bass: 'root', counter: 'celesta' }),
    track({ id: 'first_light', title: 'First Light', bpm: 88, meter: 4, key: 74, scale: S.pentatonic, prog: PENT1, seed: 102, form: 'ABAB', busy: 0.4, lead: 'harp', accomp: 'arp', bass: 'root', counter: 'celesta' }),
    track({ id: 'dewdrops', title: 'Dewdrops', bpm: 96, meter: 3, key: 76, scale: S.major, prog: WALTZ, seed: 103, form: 'AABA', busy: 0.5, lead: 'celesta', accomp: 'waltz', bass: 'oompah', counter: 'flute' }),
  ],
  day: [
    track({ id: 'main_street', title: 'Meadowbrook Main Street', bpm: 104, meter: 4, key: 72, scale: S.major, prog: POP, seed: 201, form: 'AABA', busy: 0.55, lead: 'musicbox', accomp: 'arp', bass: 'root', perc: 'shaker', counter: 'celesta' }),
    track({ id: 'bumblebee', title: 'Bumblebee Lane', bpm: 120, meter: 4, key: 77, scale: S.major, prog: STROLL, seed: 202, form: 'ABAC', busy: 0.85, lead: 'marimba', accomp: 'broken', bass: 'bounce', perc: 'tick' }),
    track({ id: 'haybale_hop', title: 'Haybale Hop', bpm: 96, meter: 6, key: 74, scale: S.major, prog: FOLK, seed: 203, form: 'AABB', busy: 0.6, lead: 'ocarina', accomp: 'strum', accompTimbre: 'pluck', bass: 'oompah', perc: 'brush' }),
    track({ id: 'picnic_blanket', title: 'Picnic Blanket', bpm: 92, meter: 3, key: 70, scale: S.major, prog: WALTZ, seed: 204, form: 'AABA', busy: 0.5, lead: 'flute', accomp: 'waltz', bass: 'oompah', counter: 'pluck' }),
    track({ id: 'sunflower_stroll', title: 'Sunflower Stroll', bpm: 100, meter: 4, key: 69, scale: S.major, prog: DOOWOP, seed: 205, form: 'AABA', busy: 0.5, lead: 'kalimba', accomp: 'alberti', bass: 'walk', perc: 'brush', swing: 0.25 }),
    track({ id: 'tractor_tune', title: 'Tractor Tune', bpm: 116, meter: 4, key: 74, scale: S.mixolydian, prog: COUNTRY, seed: 206, form: 'ABAB', busy: 0.7, lead: 'reed', accomp: 'strum', accompTimbre: 'pluck', bass: 'oompah', perc: 'march' }),
  ],
  evening: [
    track({ id: 'golden_hour', title: 'Golden Hour', bpm: 84, meter: 3, key: 75, scale: S.major, prog: WALTZ, seed: 301, form: 'AABA', busy: 0.4, lead: 'ocarina', accomp: 'waltz', bass: 'oompah', counter: 'harp' }),
    track({ id: 'fireflies', title: 'Fireflies Come Out', bpm: 76, meter: 4, key: 74, scale: S.dorian, prog: DORIAN, seed: 302, form: 'ABAB', busy: 0.35, lead: 'kalimba', accomp: 'pad', bass: 'root', counter: 'celesta' }),
  ],
  night: [
    track({ id: 'moonlit_lullaby', title: 'Moonlit Lullaby', bpm: 66, meter: 3, key: 72, scale: S.major, prog: WALTZ, seed: 401, form: 'AABA', busy: 0.25, lead: 'musicbox', accomp: 'broken', bass: 'root', counter: 'celesta' }),
    track({ id: 'counting_sheep', title: 'Counting Sheep', bpm: 70, meter: 4, key: 76, scale: S.pentatonic, prog: PENT2, seed: 402, form: 'AABA', busy: 0.3, lead: 'celesta', accomp: 'pad', bass: 'none', perc: 'clock' }),
    track({ id: 'owl_nocturne', title: "The Owl's Nocturne", bpm: 72, meter: 4, key: 69, scale: S.harmonic, prog: MINOR, seed: 403, form: 'ABAB', busy: 0.35, lead: 'flute', accomp: 'arp', accompTimbre: 'harp', bass: 'root' }),
  ],
  rain: [
    track({ id: 'puddle_jumping', title: 'Puddle Jumping', bpm: 96, meter: 4, key: 74, scale: S.dorian, prog: DORIAN, seed: 501, form: 'AABA', busy: 0.7, lead: 'kalimba', accomp: 'alberti', bass: 'walk', perc: 'brush', swing: 0.2 }),
    track({ id: 'raindrops', title: 'Raindrops on the Roof', bpm: 74, meter: 4, key: 76, scale: S.pentatonic, prog: PENT1, seed: 502, form: 'ABAB', busy: 0.4, lead: 'glock', accomp: 'pad', bass: 'root', counter: 'flute' }),
  ],
  snow: [
    track({ id: 'snowflake_waltz', title: 'Snowflake Waltz', bpm: 88, meter: 3, key: 76, scale: S.major, prog: WALTZ, seed: 601, form: 'AABA', busy: 0.45, lead: 'celesta', accomp: 'waltz', bass: 'oompah', bells: true }),
    track({ id: 'hot_cocoa', title: 'Hot Cocoa', bpm: 78, meter: 4, key: 72, scale: S.major, prog: DOOWOP, seed: 602, form: 'AABA', busy: 0.45, lead: 'musicbox', accomp: 'broken', bass: 'walk', perc: 'brush', swing: 0.3 }),
  ],

  // --- festivals ----------------------------------------------------------------------
  lunar_new_year: [
    track({ id: 'lantern_parade', title: 'Lantern Parade', bpm: 112, meter: 4, key: 72, scale: S.pentatonic, prog: PENT2, seed: 1101, form: 'AABA', busy: 0.8, lead: 'pluck', accomp: 'broken', accompTimbre: 'koto', bass: 'pulse', perc: 'taiko' }),
    track({ id: 'red_envelopes', title: 'Red Envelope Dance', bpm: 124, meter: 4, key: 74, scale: S.pentatonic, prog: PENT1, seed: 1102, form: 'ABAB', busy: 0.85, lead: 'flute', accomp: 'arp', accompTimbre: 'pluck', bass: 'bounce', perc: 'taiko', counter: 'pluck' }),
    track({ id: 'plum_blossom', title: 'Plum Blossom Night', bpm: 76, meter: 4, key: 69, scale: S.minorPent, prog: PENT2, seed: 1103, form: 'AABA', busy: 0.35, lead: 'erhu', accomp: 'pad', bass: 'drone' }),
  ],
  valentines: [
    track({ id: 'love_letters', title: 'Love Letters', bpm: 84, meter: 3, key: 72, scale: S.major, prog: WALTZ, seed: 1201, form: 'AABA', busy: 0.4, lead: 'musicbox', accomp: 'waltz', bass: 'oompah', perc: 'heart', counter: 'celesta' }),
    track({ id: 'strawberry_kisses', title: 'Strawberry Kisses', bpm: 108, meter: 4, key: 74, scale: S.major, prog: DOOWOP, seed: 1202, form: 'AABA', busy: 0.7, lead: 'kalimba', accomp: 'alberti', bass: 'walk', perc: 'heart', swing: 0.2 }),
    track({ id: 'heart_moon', title: 'Heart-Shaped Moon', bpm: 72, meter: 4, key: 70, scale: S.lydian, prog: DREAMY, seed: 1203, form: 'ABAB', busy: 0.3, lead: 'flute', accomp: 'pad', bass: 'root', counter: 'harp' }),
  ],
  st_patricks: [
    track({ id: 'shamrock_jig', title: 'Shamrock Jig', bpm: 112, meter: 6, key: 74, scale: S.mixolydian, prog: COUNTRY, seed: 1301, form: 'AABB', busy: 0.9, lead: 'whistle', accomp: 'strum', accompTimbre: 'harp', bass: 'drone', perc: 'jig' }),
    track({ id: 'clover_reel', title: 'Lucky Clover Reel', bpm: 118, meter: 4, key: 76, scale: S.dorian, prog: DORIAN, seed: 1302, form: 'AABB', busy: 0.95, lead: 'whistle', accomp: 'broken', accompTimbre: 'harp', bass: 'drone', perc: 'jig' }),
    track({ id: 'rainbows_end', title: "Rainbow's End", bpm: 80, meter: 3, key: 72, scale: S.major, prog: WALTZ, seed: 1303, form: 'AABA', busy: 0.35, lead: 'flute', accomp: 'broken', accompTimbre: 'harp', bass: 'root', counter: 'whistle' }),
  ],
  spring: [
    track({ id: 'egg_hunt', title: 'Egg Hunt Scamper', bpm: 126, meter: 4, key: 74, scale: S.major, prog: POP, seed: 1401, form: 'ABAC', busy: 0.9, lead: 'marimba', accomp: 'broken', bass: 'bounce', perc: 'tick' }),
    track({ id: 'bunny_polka', title: 'Bunny Hop Polka', bpm: 116, meter: 4, key: 72, scale: S.major, prog: FOLK, seed: 1402, form: 'AABB', busy: 0.7, lead: 'reed', accomp: 'waltz', bass: 'oompah', perc: 'march' }),
    track({ id: 'april_showers', title: 'April Showers', bpm: 88, meter: 4, key: 76, scale: S.pentatonic, prog: PENT1, seed: 1403, form: 'AABA', busy: 0.45, lead: 'celesta', accomp: 'arp', bass: 'root', counter: 'harp' }),
  ],
  hanami: [
    track({
      id: 'sakura',
      title: 'Sakura, Sakura',
      bpm: 66,
      meter: 4,
      key: 76,
      scale: S.in,
      prog: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      tune:
        'a5:2 a:2 b:4 | a:2 a:2 b:4 | a:2 b:2 c6:2 b5:2 | a:2 b:1 a:1 f:4 | e:2 c:2 e:2 f:2 | e:2 e:1 c:1 b4:4 | a5:2 b:2 c6:2 b5:2 | a:2 b:1 a:1 f:4 | ' +
        'e:2 c:2 e:2 f:2 | e:2 e:1 c:1 b4:4 | a5:2 a:2 b:4 | a:2 a:2 b:4 | e:2 f:2 b:1 a:1 f:2 | e:8',
      lead: 'koto',
      accomp: 'pad',
      bass: 'drone',
      counter: 'flute',
    }),
    track({ id: 'petals', title: 'Petals on the Breeze', bpm: 72, meter: 4, key: 76, scale: S.in, prog: DRONE, seed: 1502, form: 'AABA', busy: 0.35, lead: 'flute', accomp: 'pad', bass: 'drone', counter: 'koto' }),
    track({ id: 'blossom_picnic', title: 'Picnic Under the Blossoms', bpm: 96, meter: 4, key: 72, scale: S.pentatonic, prog: PENT2, seed: 1503, form: 'ABAB', busy: 0.6, lead: 'koto', accomp: 'broken', accompTimbre: 'koto', bass: 'root', perc: 'tick' }),
  ],
  earth_day: [
    track({
      id: 'ode_to_joy',
      title: 'Ode to Joy',
      bpm: 100,
      meter: 4,
      key: 72,
      scale: S.major,
      prog: [0, 4, 0, 4, 0, 4, 0, [4, 0], 4, [4, 0], [4, 0], [0, 4], 0, 4, 0, [4, 0]],
      tune:
        'e5:2 e:2 f:2 g:2 | g:2 f:2 e:2 d:2 | c:2 c:2 d:2 e:2 | e:3 d:1 d:4 | e:2 e:2 f:2 g:2 | g:2 f:2 e:2 d:2 | c:2 c:2 d:2 e:2 | d:3 c:1 c:4 | ' +
        'd:2 d:2 e:2 c:2 | d:2 e:1 f:1 e:2 c:2 | d:2 e:1 f:1 e:2 d:2 | c:2 d:2 g4:4 | e5:2 e:2 f:2 g:2 | g:2 f:2 e:2 d:2 | c:2 c:2 d:2 e:2 | d:3 c:1 c:4',
      lead: 'kalimba',
      accomp: 'alberti',
      bass: 'root',
      counter: 'celesta',
    }),
    track({ id: 'little_seedling', title: 'Little Seedling', bpm: 92, meter: 4, key: 72, scale: S.major, prog: STROLL, seed: 1602, form: 'AABA', busy: 0.55, lead: 'kalimba', accomp: 'broken', bass: 'walk', perc: 'shaker' }),
    track({ id: 'green_hills', title: 'Green Hills Forever', bpm: 84, meter: 6, key: 70, scale: S.major, prog: FOLK, seed: 1603, form: 'AABA', busy: 0.5, lead: 'ocarina', accomp: 'strum', accompTimbre: 'pluck', bass: 'oompah', perc: 'brush' }),
  ],
  tanabata: [
    track({
      id: 'twinkle',
      title: 'Twinkle, Twinkle',
      bpm: 92,
      meter: 4,
      key: 72,
      scale: S.major,
      prog: [0, [3, 0], [3, 0], [4, 0], [0, 3], [0, 4], [0, 3], [0, 4], 0, [3, 0], [3, 0], [4, 0]],
      tune: 'c5:2 c:2 g:2 g:2 | a:2 a:2 g:4 | f:2 f:2 e:2 e:2 | d:2 d:2 c:4 | g:2 g:2 f:2 f:2 | e:2 e:2 d:4 | g:2 g:2 f:2 f:2 | e:2 e:2 d:4 | c:2 c:2 g:2 g:2 | a:2 a:2 g:4 | f:2 f:2 e:2 e:2 | d:2 d:2 c:4',
      lead: 'celesta',
      accomp: 'broken',
      accompTimbre: 'harp',
      bass: 'root',
      bells: true,
    }),
    track({ id: 'milky_way', title: 'Milky Way Crossing', bpm: 70, meter: 4, key: 74, scale: S.pentatonic, prog: PENT1, seed: 1702, form: 'AABA', busy: 0.3, lead: 'flute', accomp: 'pad', bass: 'drone', bells: true }),
    track({ id: 'paper_wishes', title: 'Wishes on Paper Strips', bpm: 84, meter: 3, key: 72, scale: S.pentatonic, prog: PENT2, seed: 1703, form: 'ABAB', busy: 0.45, lead: 'koto', accomp: 'waltz', accompTimbre: 'harp', bass: 'oompah', counter: 'glock' }),
  ],
  mid_autumn: [
    track({ id: 'mooncake_moon', title: 'Mooncake Moon', bpm: 76, meter: 4, key: 72, scale: S.pentatonic, prog: PENT1, seed: 1801, form: 'AABA', busy: 0.35, lead: 'erhu', accomp: 'arp', accompTimbre: 'pluck', bass: 'root' }),
    track({ id: 'moon_rabbit', title: 'Rabbit on the Moon', bpm: 104, meter: 4, key: 76, scale: S.pentatonic, prog: PENT2, seed: 1802, form: 'ABAB', busy: 0.75, lead: 'flute', accomp: 'broken', accompTimbre: 'pluck', bass: 'bounce', perc: 'tick' }),
    track({ id: 'lantern_riddles', title: 'Lantern Riddles', bpm: 88, meter: 3, key: 69, scale: S.minorPent, prog: PENT2, seed: 1803, form: 'AABA', busy: 0.5, lead: 'pluck', accomp: 'pad', bass: 'drone', counter: 'erhu' }),
  ],
  summer: [
    track({ id: 'seashell_samba', title: 'Seashell Samba', bpm: 120, meter: 4, key: 72, scale: S.major, prog: POP, seed: 1901, form: 'AABA', busy: 0.8, lead: 'steel', accomp: 'strum', accompTimbre: 'pluck', bass: 'bounce', perc: 'steel' }),
    track({ id: 'lemonade_stand', title: 'Lemonade Stand', bpm: 110, meter: 4, key: 74, scale: S.major, prog: DOOWOP, seed: 1902, form: 'ABAC', busy: 0.7, lead: 'marimba', accomp: 'broken', bass: 'walk', perc: 'shaker', swing: 0.3 }),
    track({ id: 'festival_fireworks', title: 'Festival Fireworks', bpm: 128, meter: 4, key: 72, scale: S.mixolydian, prog: COUNTRY, seed: 1903, form: 'AABB', busy: 0.85, lead: 'organ', accomp: 'strum', bass: 'oompah', perc: 'party', bells: true }),
    track({ id: 'hammock', title: 'Hammock Afternoon', bpm: 80, meter: 4, key: 69, scale: S.pentatonic, prog: PENT1, seed: 1904, form: 'AABA', busy: 0.35, lead: 'kalimba', accomp: 'pad', bass: 'root', perc: 'shaker', swing: 0.15 }),
  ],
  harvest: [
    track({
      id: 'greensleeves',
      title: 'Greensleeves',
      bpm: 92,
      meter: 3,
      key: 69,
      scale: S.harmonic,
      prog: ['Am', 'Am', 'C', 'G', 'Em', 'Am', 'E', 'E', 'Am', 'Am', 'C', 'G', 'Em', ['Am', 'E'], 'E', 'Am'],
      tune:
        'r:4 a4:2 | c5:4 d:2 | e:3 f:1 e:2 | d:4 b4:2 | g:3 a:1 b:2 | c5:4 a4:2 | a:3 g#:1 a:2 | b:4 g#:2 | e:4 a:2 | ' +
        'c5:4 d:2 | e:3 f:1 e:2 | d:4 b4:2 | g:3 a:1 b:2 | c5:3 b4:1 a:2 | g#:3 f#:1 g#:2 | a:6',
      lead: 'flute',
      accomp: 'broken',
      accompTimbre: 'harp',
      bass: 'root',
      counter: 'celesta',
    }),
    track({ id: 'hayride', title: 'Hayride Hoedown', bpm: 126, meter: 4, key: 74, scale: S.major, prog: FOLK, seed: 2002, form: 'AABB', busy: 0.9, lead: 'reed', accomp: 'strum', accompTimbre: 'pluck', bass: 'oompah', perc: 'march' }),
    track({ id: 'cider_waltz', title: 'Apple Cider Waltz', bpm: 96, meter: 3, key: 70, scale: S.major, prog: WALTZ, seed: 2003, form: 'AABA', busy: 0.5, lead: 'ocarina', accomp: 'waltz', bass: 'oompah', counter: 'harp' }),
  ],
  halloween: [
    track({ id: 'pumpkin_waltz', title: 'Pumpkin Patch Waltz', bpm: 100, meter: 3, key: 69, scale: S.harmonic, prog: MINOR, seed: 2101, form: 'AABA', busy: 0.5, lead: 'musicbox', accomp: 'waltz', bass: 'oompah', counter: 'celesta', ooo: true }),
    track({ id: 'haunted_hayride', title: 'Haunted Hayride', bpm: 116, meter: 4, key: 74, scale: S.harmonic, prog: MINOR, seed: 2102, form: 'ABAB', busy: 0.8, lead: 'organ', accomp: 'broken', bass: 'walk', perc: 'tick', ooo: true }),
    track({ id: 'friendly_ghost', title: 'Friendly Ghost Lullaby', bpm: 70, meter: 4, key: 72, scale: S.minor, prog: NATMIN, seed: 2103, form: 'AABA', busy: 0.3, lead: 'theremin', accomp: 'arp', accompTimbre: 'celesta', bass: 'root', ooo: true }),
    track({ id: 'cauldron_bubble', title: 'Cauldron Bubble', bpm: 108, meter: 4, key: 74, scale: S.dorian, prog: DORIAN, seed: 2104, form: 'AABA', busy: 0.75, lead: 'marimba', accomp: 'alberti', bass: 'bounce', perc: 'tick', swing: 0.2 }),
  ],
  diwali: [
    track({ id: 'thousand_diyas', title: 'A Thousand Diyas', bpm: 84, meter: 4, key: 72, scale: S.bhairav, prog: RAGA, seed: 2201, form: 'AABA', busy: 0.6, lead: 'sitar', accomp: 'none', bass: 'drone', perc: 'tabla' }),
    track({ id: 'rangoli', title: 'Rangoli Colours', bpm: 100, meter: 4, key: 74, scale: S.lydian, prog: DRONE, seed: 2202, form: 'ABAB', busy: 0.55, lead: 'flute', accomp: 'pad', bass: 'drone', perc: 'tabla', counter: 'sitar' }),
    track({ id: 'sparkler_dance', title: 'Sparkler Dance', bpm: 120, meter: 4, key: 72, scale: S.major, prog: POP, seed: 2203, form: 'AABB', busy: 0.8, lead: 'sitar', accomp: 'strum', accompTimbre: 'pluck', bass: 'bounce', perc: 'tabla', bells: true }),
  ],
  thanksgiving: [
    track({ id: 'gathering_table', title: 'The Gathering Table', bpm: 88, meter: 4, key: 72, scale: S.major, prog: DOOWOP, seed: 2301, form: 'AABA', busy: 0.45, lead: 'musicbox', accomp: 'alberti', bass: 'walk', counter: 'harp' }),
    track({ id: 'grateful_hearts', title: 'Grateful Hearts', bpm: 84, meter: 3, key: 70, scale: S.major, prog: WALTZ, seed: 2302, form: 'AABA', busy: 0.4, lead: 'flute', accomp: 'waltz', bass: 'oompah', counter: 'pluck' }),
    track({ id: 'turkey_trot', title: 'Turkey Trot', bpm: 124, meter: 4, key: 74, scale: S.mixolydian, prog: COUNTRY, seed: 2303, form: 'AABB', busy: 0.9, lead: 'reed', accomp: 'strum', accompTimbre: 'pluck', bass: 'oompah', perc: 'march' }),
  ],
  winter: [
    track({
      id: 'jingle_bells',
      title: 'Jingle Bells',
      bpm: 120,
      meter: 4,
      key: 72,
      scale: S.major,
      prog: [0, 0, 0, 0, 3, 0, 1, 4, 0, 0, 0, 0, 3, 0, 4, 0],
      tune:
        'e5:2 e:2 e:4 | e:2 e:2 e:4 | e:2 g:2 c:3 d:1 | e:8 | f:2 f:2 f:3 f:1 | f:2 e:2 e:2 e:1 e:1 | e:2 d:2 d:2 e:2 | d:4 g:4 | ' +
        'e:2 e:2 e:4 | e:2 e:2 e:4 | e:2 g:2 c:3 d:1 | e:8 | f:2 f:2 f:3 f:1 | f:2 e:2 e:2 e:1 e:1 | g:2 g:2 f:2 d:2 | c:8',
      lead: 'musicbox',
      accomp: 'waltz',
      accompTimbre: 'celesta',
      bass: 'oompah',
      perc: 'sleigh',
      counter: 'glock',
    }),
    track({
      id: 'deck_the_halls',
      title: 'Deck the Halls',
      bpm: 112,
      meter: 4,
      key: 72,
      scale: S.major,
      prog: [0, 0, 4, 0, 0, 0, 4, 0, 4, 4, 4, 4, 0, 0, 3, [4, 0]],
      tune:
        'g5:3 f:1 e:2 d:2 | c:2 d:2 e:2 c:2 | d:1 e:1 f:1 d:1 e:3 d:1 | c:2 b4:2 c5:4 | g:3 f:1 e:2 d:2 | c:2 d:2 e:2 c:2 | d:1 e:1 f:1 d:1 e:3 d:1 | c:2 b4:2 c5:4 | ' +
        'd:3 e:1 f#:2 d:2 | e:3 f#:1 g:2 d:2 | e:1 f#:1 g:2 a:1 b:1 c6:2 | b5:2 a:2 g:4 | g:3 f:1 e:2 d:2 | c:2 d:2 e:2 c:2 | a:1 a:1 a:1 a:1 g:3 f:1 | e:2 d:2 c:4',
      lead: 'celesta',
      accomp: 'alberti',
      bass: 'root',
      perc: 'sleigh',
      counter: 'glock',
    }),
    track({
      id: 'merry_christmas',
      title: 'We Wish You a Merry Christmas',
      bpm: 136,
      meter: 3,
      key: 72,
      scale: S.major,
      prog: [4, 0, 3, 1, 4, 2, [5, 4], [3, 4], 0],
      tune: 'r:4 g4:2 | c5:2 c:1 d:1 c:1 b4:1 | a:2 a:2 a:2 | d5:2 d:1 e:1 d:1 c:1 | b4:2 g:2 g:2 | e5:2 e:1 f:1 e:1 d:1 | c:2 a4:2 g:1 g:1 | a:2 d5:2 b4:2 | c5:6',
      lead: 'musicbox',
      accomp: 'waltz',
      accompTimbre: 'celesta',
      bass: 'oompah',
      perc: 'sleigh',
    }),
    track({ id: 'snowglobe', title: 'Snowglobe Village', bpm: 84, meter: 4, key: 75, scale: S.major, prog: DOOWOP, seed: 2404, form: 'AABA', busy: 0.4, lead: 'celesta', accomp: 'broken', accompTimbre: 'harp', bass: 'root', bells: true }),
  ],
  new_year: [
    track({
      id: 'auld_lang_syne',
      title: 'Auld Lang Syne',
      bpm: 76,
      meter: 4,
      key: 72,
      scale: S.major,
      prog: [4, 0, 4, 0, 3, 0, 4, [5, 4], 0],
      tune: 'r:6 g4:2 | c5:3 c:1 c:2 e:2 | d:3 c:1 d:2 e:2 | c:3 c:1 e:2 g:2 | a:6 a:2 | g:3 e:1 e:2 c:2 | d:3 c:1 d:2 e:2 | c:3 a4:1 a:2 g:2 | c5:8',
      lead: 'reed',
      accomp: 'broken',
      accompTimbre: 'harp',
      bass: 'root',
      counter: 'celesta',
    }),
    track({ id: 'countdown_confetti', title: 'Countdown Confetti', bpm: 128, meter: 4, key: 74, scale: S.major, prog: POP, seed: 2502, form: 'AABB', busy: 0.9, lead: 'organ', accomp: 'strum', bass: 'bounce', perc: 'party', bells: true }),
    track({ id: 'first_snow', title: 'First Snow of the Year', bpm: 72, meter: 4, key: 72, scale: S.lydian, prog: DREAMY, seed: 2503, form: 'AABA', busy: 0.3, lead: 'celesta', accomp: 'pad', bass: 'root', bells: true }),
  ],
};
