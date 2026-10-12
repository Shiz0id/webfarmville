// What makes each seasonal event special: its currency and token shop, an
// event crop, costumed visitors, animal costumes, ambience, music and quests.
// Halloween was the first; every event now gets the same treatment.

import { table } from './table';

export type MusicStyle = 'default' | 'spooky' | 'jingle' | 'pentatonic' | 'sweet' | 'jig' | 'folk' | 'sunny' | 'party';

export interface EventFeature {
  event: string;
  /** Item id of the event currency. */
  currency: string;
  currencyName: string;
  /** Event-only crops (also in CROP_LIST with `event` set). */
  crops: string[];
  /** Visitor kinds; sprites are npc:<kind> and npc:<kind>_walk. */
  visitors: string[];
  visitorName: string;
  /** What the visitor says when you greet them. */
  visitorThanks: string;
  /** Costume overlay keys for animals. */
  costumes: string[];
  /** Ambient particle textures. */
  particles: string[];
  music: MusicStyle;
  /** Day tint applied during the event: [color, alpha]. */
  tint: [number, number];
  intro: { giver: string; text: string };
  /** Earlier events in this list win when several run at once. */
  priority: number;
}

const f = (x: EventFeature) => x;

export const EVENT_FEATURE_LIST: EventFeature[] = [
  f({
    event: 'halloween',
    currency: 'candy',
    currencyName: 'Candy',
    crops: ['candy_corn', 'ghost_pumpkin'],
    visitors: ['kid_ghost', 'kid_pumpkin', 'kid_witch'],
    visitorName: 'trick-or-treater',
    visitorThanks: 'Happy Halloween! The trick-or-treater shared their candy haul 🍬',
    costumes: ['costume:witch_hat', 'costume:pumpkin_hat', 'costume:bat_bow'],
    particles: ['fx:bat'],
    music: 'spooky',
    tint: [0x5b2a86, 0.08],
    intro: {
      giver: 'Mayor Maple',
      text: 'Hoo-HOO! Happy Halloween! Candy Corn is sprouting, trick-or-treaters are coming by, and the Candy Shop is open!',
    },
    priority: 1,
  }),
  f({
    event: 'winter',
    currency: 'snowflake',
    currencyName: 'Snowflakes',
    crops: ['peppermint'],
    visitors: ['caroler_red', 'caroler_green'],
    visitorName: 'caroler',
    visitorThanks: '🎶 The carolers sang you a song and left some snowflakes!',
    costumes: ['costume:santa_hat', 'costume:reindeer_antlers', 'costume:winter_scarf'],
    particles: ['fx:snow'],
    music: 'jingle',
    tint: [0xbfe3ff, 0.08],
    intro: { giver: 'Grandma Fern', text: 'Happy holidays, dearie! Grow some peppermint, listen for carolers, and spend your snowflakes on something cozy.' },
    priority: 2,
  }),
  f({
    event: 'new_year',
    currency: 'confetti',
    currencyName: 'Confetti',
    crops: ['golden_grape'],
    visitors: ['party_kid'],
    visitorName: 'party guest',
    visitorThanks: '🎉 Happy New Year! Your guest showered you in confetti!',
    costumes: ['costume:party_hat'],
    particles: ['fx:confetti'],
    music: 'party',
    tint: [0xc084fc, 0.06],
    intro: { giver: 'Penny', text: 'Happy New Year, neighbor! Golden Grapes bring good luck, and party guests are dropping by!' },
    priority: 3,
  }),
  f({
    event: 'lunar_new_year',
    currency: 'red_envelope',
    currencyName: 'Red Envelopes',
    crops: ['bok_choy'],
    visitors: ['lion_dancer', 'lantern_kid_red'],
    visitorName: 'lion dancer',
    visitorThanks: '🧧 Happy Lunar New Year! The lion dance brought you red envelopes!',
    costumes: ['costume:lucky_cap'],
    particles: ['fx:red_lantern'],
    music: 'pentatonic',
    tint: [0xffb4a2, 0.06],
    intro: { giver: 'Mayor Maple', text: 'Happy Lunar New Year! Lion dancers are visiting, and red envelopes bring good fortune to every farm!' },
    priority: 4,
  }),
  f({
    event: 'valentines',
    currency: 'love_letter',
    currencyName: 'Love Letters',
    crops: ['sweetheart_rose'],
    visitors: ['cupid_kid', 'mail_carrier'],
    visitorName: 'sweetheart',
    visitorThanks: "💌 A sweetheart delivered love letters to your farm!",
    costumes: ['costume:heart_bow'],
    particles: ['fx:heart'],
    music: 'sweet',
    tint: [0xffb3cf, 0.07],
    intro: { giver: 'Rosie', text: "Happy Valentine's Day! Grow Sweetheart Roses and collect love letters for something sweet!" },
    priority: 5,
  }),
  f({
    event: 'st_patricks',
    currency: 'lucky_clover',
    currencyName: 'Lucky Clovers',
    crops: ['four_leaf_clover'],
    visitors: ['leprechaun_kid'],
    visitorName: 'little leprechaun',
    visitorThanks: '🍀 A little leprechaun left you lucky clovers!',
    costumes: ['costume:shamrock_hat'],
    particles: ['fx:clover'],
    music: 'jig',
    tint: [0x9be7a8, 0.06],
    intro: { giver: 'Henrietta', text: "Top o' the morning! Four-leaf clovers are sprouting, and a wee leprechaun has been spotted!" },
    priority: 6,
  }),
  f({
    event: 'tanabata',
    currency: 'wish_star',
    currencyName: 'Wishing Stars',
    crops: ['star_melon'],
    visitors: ['wish_kid'],
    visitorName: 'stargazer',
    visitorThanks: '⭐ A stargazer shared their wishing stars with you!',
    costumes: ['costume:star_clip'],
    particles: ['fx:star'],
    music: 'pentatonic',
    tint: [0x818cf8, 0.08],
    intro: { giver: 'Rosie', text: 'It\'s the Star Festival! Write a wish, grow Star Melons, and collect wishing stars!' },
    priority: 7,
  }),
  f({
    event: 'thanksgiving',
    currency: 'pie_slice',
    currencyName: 'Pie Slices',
    crops: ['sweet_potato'],
    visitors: ['pie_kid'],
    visitorName: 'pie bringer',
    visitorThanks: '🥧 A neighbor brought you slices of pie. How thankful!',
    costumes: ['costume:pilgrim_bonnet'],
    particles: ['fx:leaf_orange', 'fx:leaf_red'],
    music: 'folk',
    tint: [0xffc078, 0.07],
    intro: { giver: 'Grandma Fern', text: 'Happy Thanksgiving, dearie! Sweet potatoes are in season and neighbors are sharing pie!' },
    priority: 8,
  }),
  f({
    event: 'diwali',
    currency: 'diya',
    currencyName: 'Diyas',
    crops: ['marigold'],
    visitors: ['sparkler_kid'],
    visitorName: 'festival guest',
    visitorThanks: '🪔 A festival guest lit diyas for your farm!',
    costumes: ['costume:marigold_crown'],
    particles: ['fx:sparkle'],
    music: 'pentatonic',
    tint: [0xffd166, 0.06],
    intro: { giver: 'Penny', text: 'Happy Festival of Lights! Grow marigolds, light diyas, and make the whole valley glow!' },
    priority: 9,
  }),
  f({
    event: 'mid_autumn',
    currency: 'mooncake',
    currencyName: 'Mooncakes',
    crops: ['taro'],
    visitors: ['lantern_kid_rabbit'],
    visitorName: 'lantern carrier',
    visitorThanks: '🥮 A lantern carrier shared mooncakes under the full moon!',
    costumes: ['costume:rabbit_ears'],
    particles: ['fx:float_lantern'],
    music: 'pentatonic',
    tint: [0xfbbf24, 0.06],
    intro: { giver: 'Mayor Maple', text: 'The harvest moon is full! Lantern carriers are coming by with mooncakes to share.' },
    priority: 10,
  }),
  f({
    event: 'hanami',
    currency: 'sakura_charm',
    currencyName: 'Sakura Charms',
    crops: ['matcha'],
    visitors: ['picnic_kid'],
    visitorName: 'blossom picnicker',
    visitorThanks: '🌸 A picnicker shared sakura charms under the blossoms!',
    costumes: ['costume:flower_crown'],
    particles: ['fx:petal'],
    music: 'pentatonic',
    tint: [0xffc4dd, 0.07],
    intro: { giver: 'Rosie', text: 'The cherry blossoms are blooming! Grow matcha, and share a picnic under the petals!' },
    priority: 11,
  }),
  f({
    event: 'earth_day',
    currency: 'seed_token',
    currencyName: 'Seed Tokens',
    crops: ['heirloom_tomato'],
    visitors: ['scout_kid'],
    visitorName: 'nature scout',
    visitorThanks: '🌍 A nature scout planted a tree and gave you seed tokens!',
    costumes: ['costume:leaf_crown'],
    particles: ['fx:fluff'],
    music: 'folk',
    tint: [0xa7f3d0, 0.06],
    intro: { giver: 'Henrietta', text: 'Happy Earth Day! Heirloom tomatoes are the tastiest, and nature scouts are out planting trees!' },
    priority: 12,
  }),
  f({
    event: 'spring',
    currency: 'painted_egg',
    currencyName: 'Painted Eggs',
    crops: ['rainbow_radish'],
    visitors: ['egg_hunter'],
    visitorName: 'egg hunter',
    visitorThanks: '🥚 An egg hunter found painted eggs hidden on your farm!',
    costumes: ['costume:bunny_ears'],
    particles: ['fx:petal'],
    music: 'sweet',
    tint: [0xe9d5ff, 0.06],
    intro: { giver: 'Rosie', text: 'Spring is here! Painted eggs are hidden everywhere, and Rainbow Radishes are ready to plant!' },
    priority: 13,
  }),
  f({
    event: 'summer',
    currency: 'seashell',
    currencyName: 'Seashells',
    crops: ['pineapple'],
    visitors: ['beach_kid'],
    visitorName: 'beachgoer',
    visitorThanks: '🐚 A beachgoer gave you seashells from the shore!',
    costumes: ['costume:sun_hat', 'costume:lei'],
    particles: ['fx:fluff'],
    music: 'sunny',
    tint: [0xffe08a, 0.06],
    intro: { giver: 'Penny', text: 'Summer Festival time! Grow pineapples, collect seashells, and enjoy the sunshine!' },
    priority: 14,
  }),
  f({
    event: 'harvest',
    currency: 'acorn',
    currencyName: 'Acorns',
    crops: ['butternut'],
    visitors: ['harvest_kid'],
    visitorName: 'harvest helper',
    visitorThanks: '🌰 A harvest helper gathered acorns for you!',
    costumes: ['costume:straw_hat'],
    particles: ['fx:leaf_red', 'fx:leaf_orange', 'fx:leaf_yellow'],
    music: 'folk',
    tint: [0xffd8a8, 0.06],
    intro: { giver: 'Henrietta', text: 'The Harvest Festival is here! Butternut squash is in season and helpers are gathering acorns!' },
    priority: 15,
  }),
];

export const EVENT_FEATURES: Record<string, EventFeature> = table(
  EVENT_FEATURE_LIST.map((x) => ({ ...x, id: x.event })),
) as unknown as Record<string, EventFeature>;

/** Event currency item id -> event. */
export const CURRENCY_EVENT: Record<string, string> = Object.fromEntries(EVENT_FEATURE_LIST.map((x) => [x.currency, x.event]));

/** Visitors that may come by per day, across all events. */
export const VISITORS_PER_DAY = 6;
