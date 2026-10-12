// A gentle quest chain that walks players through every system.
//
// Goals are either `stat` (a lifetime counter must grow by `count` after the
// quest starts) or `have` (a property of the farm right now).

import { table } from './table';

export type HaveWhat = 'level' | 'charm' | 'size' | `own:${string}` | `kind:${string}`;

export type QuestGoal =
  | { type: 'stat'; stat: string; count: number; label: string }
  | { type: 'have'; what: HaveWhat; count: number; label: string };

export interface QuestDef {
  id: string;
  title: string;
  /** Short flavour text from a friendly villager. */
  text: string;
  giver: string;
  level: number;
  requires: string[];
  goals: QuestGoal[];
  reward: { coins: number; xp: number; items?: Record<string, number> };
  /** Seasonal quests only appear (and stay) while their event is running. */
  event?: string;
}

const stat = (s: string, count: number, label: string): QuestGoal => ({ type: 'stat', stat: s, count, label });
const have = (what: HaveWhat, count: number, label: string): QuestGoal => ({ type: 'have', what, count, label });

export const QUEST_LIST: QuestDef[] = [
  {
    id: 'welcome',
    title: 'Welcome Home!',
    text: "Those strawberries out front are nearly ripe. Pick them before they spoil!",
    giver: 'Mayor Maple',
    level: 1,
    requires: [],
    goals: [stat('harvest', 3, 'Harvest 3 crops')],
    reward: { coins: 60, xp: 10 },
  },
  {
    id: 'dig_in',
    title: 'Getting Your Hands Dirty',
    text: 'Grab the hoe and plow some fresh soil. Every great farm starts with a furrow.',
    giver: 'Mayor Maple',
    level: 1,
    requires: ['welcome'],
    goals: [stat('plow', 4, 'Plow 4 plots')],
    reward: { coins: 80, xp: 10 },
  },
  {
    id: 'seed_money',
    title: 'Seed Money',
    text: 'Plant anything you like. Wheat is cheap and the mill will want it later.',
    giver: 'Mayor Maple',
    level: 1,
    requires: ['dig_in'],
    goals: [stat('plant', 6, 'Plant 6 crops')],
    reward: { coins: 80, xp: 15 },
  },
  {
    id: 'eggcellent',
    title: 'Egg-cellent',
    text: 'Your hen has been busy! Tap her to collect fresh eggs.',
    giver: 'Henrietta',
    level: 1,
    requires: ['welcome'],
    goals: [stat('collect:chicken', 2, 'Collect from chickens twice')],
    reward: { coins: 60, xp: 10, items: { egg: 2 } },
  },
  {
    id: 'market_day',
    title: 'Market Day',
    text: 'Open your barn and sell a few things. Coins make the farm go round.',
    giver: 'Penny',
    level: 1,
    requires: ['seed_money'],
    goals: [stat('sell', 10, 'Sell 10 items')],
    reward: { coins: 100, xp: 15 },
  },
  {
    id: 'orders',
    title: 'Special Delivery',
    text: 'The villagers pin requests on the order board. Fill a few and they pay handsomely!',
    giver: 'Penny',
    level: 2,
    requires: ['market_day'],
    goals: [stat('order', 3, 'Fill 3 villager orders')],
    reward: { coins: 200, xp: 30, items: { mystery_gift: 1 } },
  },
  {
    id: 'pretty',
    title: 'Pretty Up the Place',
    text: 'A farm should feel like home. Place some decorations from the shop.',
    giver: 'Rosie',
    level: 1,
    requires: ['seed_money'],
    goals: [stat('place:deco', 3, 'Place 3 decorations')],
    reward: { coins: 100, xp: 15 },
  },
  {
    id: 'neighborly',
    title: 'Good Neighbor',
    text: "Mayor Maple's farm is always open. Pop over and lend a hand!",
    giver: 'Mayor Maple',
    level: 2,
    requires: ['pretty'],
    goals: [stat('visit', 1, 'Visit a neighbor'), stat('help', 3, 'Help neighbors 3 times')],
    reward: { coins: 150, xp: 20 },
  },
  {
    id: 'orchard',
    title: 'Orchard Beginnings',
    text: 'Fruit trees never need replanting. Two would be a lovely start.',
    giver: 'Rosie',
    level: 2,
    requires: ['market_day'],
    goals: [have('kind:tree', 2, 'Own 2 fruit trees')],
    reward: { coins: 150, xp: 20 },
  },
  {
    id: 'grain',
    title: 'Grain Grower',
    text: 'Fill the barn with golden wheat. You will thank yourself later.',
    giver: 'Penny',
    level: 2,
    requires: ['market_day'],
    goals: [stat('harvest:wheat', 5, 'Harvest wheat 5 times')],
    reward: { coins: 150, xp: 25 },
  },
  {
    id: 'moo',
    title: 'Moo!',
    text: 'A cow brings fresh milk every hour. Every farm needs one.',
    giver: 'Henrietta',
    level: 3,
    requires: ['orchard'],
    goals: [have('own:cow', 1, 'Own a cow')],
    reward: { coins: 200, xp: 25 },
  },
  {
    id: 'grind',
    title: 'Grind It Up',
    text: 'Build a windmill and turn your wheat into flour.',
    giver: 'Penny',
    level: 4,
    requires: ['grain'],
    goals: [have('own:mill', 1, 'Build a Windmill'), stat('craft:flour', 3, 'Make 3 Flour')],
    reward: { coins: 300, xp: 40 },
  },
  {
    id: 'room',
    title: 'Room to Grow',
    text: 'Your farm is getting cosy. Buy the next stretch of land.',
    giver: 'Mayor Maple',
    level: 4,
    requires: ['grind'],
    goals: [have('size', 18, 'Expand your farm')],
    reward: { coins: 400, xp: 50 },
  },
  {
    id: 'charming',
    title: 'Simply Charming',
    text: 'Visitors love flowers, benches and lamps. Raise your farm charm.',
    giver: 'Rosie',
    level: 3,
    requires: ['pretty'],
    goals: [have('charm', 50, 'Reach 50 charm')],
    reward: { coins: 250, xp: 30 },
  },
  {
    id: 'dairy',
    title: 'Dairy Delights',
    text: 'Build a dairy and churn some butter.',
    giver: 'Henrietta',
    level: 5,
    requires: ['moo'],
    goals: [stat('craft:butter', 2, 'Make 2 Butter')],
    reward: { coins: 350, xp: 45 },
  },
  {
    id: 'bread',
    title: 'Fresh Bread',
    text: 'Nothing beats the smell of fresh bread. Bake two loaves.',
    giver: 'Penny',
    level: 6,
    requires: ['grind'],
    goals: [stat('craft:bread', 2, 'Bake 2 Bread')],
    reward: { coins: 400, xp: 50 },
  },
  {
    id: 'gifts',
    title: 'Gift Giver',
    text: 'Send free daily gifts to your neighbors. Kindness is free!',
    giver: 'Mayor Maple',
    level: 3,
    requires: ['neighborly'],
    goals: [stat('gift', 3, 'Send 3 gifts')],
    reward: { coins: 200, xp: 30 },
  },
  {
    id: 'jam',
    title: 'Sweet Preserves',
    text: 'Grandma Fern swears by her strawberry jam. Make some of your own!',
    giver: 'Grandma Fern',
    level: 7,
    requires: ['bread'],
    goals: [stat('craft:strawberry_jam', 3, 'Make 3 Strawberry Jam')],
    reward: { coins: 450, xp: 60 },
  },
  {
    id: 'festive',
    title: 'Festive Spirit',
    text: 'Seasonal decorations only appear for a little while. Grab some while they last!',
    giver: 'Rosie',
    level: 4,
    requires: ['charming'],
    goals: [stat('place:seasonal', 3, 'Place 3 seasonal decorations')],
    reward: { coins: 300, xp: 40 },
  },
  {
    id: 'woolly',
    title: 'Woolly Friends',
    text: 'Sheep are fluffy, gentle, and full of wool.',
    giver: 'Henrietta',
    level: 5,
    requires: ['dairy'],
    goals: [have('own:sheep', 2, 'Own 2 sheep')],
    reward: { coins: 400, xp: 50 },
  },
  {
    id: 'knits',
    title: 'Cozy Knits',
    text: 'Spin that wool into yarn, then knit a sweater for the cold months.',
    giver: 'Grandma Fern',
    level: 9,
    requires: ['woolly'],
    goals: [stat('craft:sweater', 1, 'Knit a Cozy Sweater')],
    reward: { coins: 800, xp: 100 },
  },
  {
    id: 'lovely',
    title: 'A Lovely Farm',
    text: 'Your farm is becoming the talk of the valley. Keep decorating!',
    giver: 'Rosie',
    level: 6,
    requires: ['festive'],
    goals: [have('charm', 150, 'Reach 150 charm')],
    reward: { coins: 700, xp: 80 },
  },
  {
    id: 'cafe',
    title: 'Coffee Break',
    text: 'Open a café and brew a latte for the whole valley.',
    giver: 'Penny',
    level: 12,
    requires: ['jam'],
    goals: [stat('craft:latte', 2, 'Brew 2 Lattes')],
    reward: { coins: 1200, xp: 150 },
  },
  {
    id: 'master',
    title: 'Master Farmer',
    text: 'You have come so far. Reach level 15!',
    giver: 'Mayor Maple',
    level: 10,
    requires: ['knits'],
    goals: [have('level', 15, 'Reach level 15')],
    reward: { coins: 2000, xp: 0 },
  },
  {
    id: 'dream',
    title: 'Dream Farm',
    text: 'Make your farm the most charming place anyone has ever seen.',
    giver: 'Rosie',
    level: 10,
    requires: ['lovely'],
    goals: [have('charm', 600, 'Reach 600 charm')],
    reward: { coins: 3000, xp: 300 },
  },
  // Halloween event chain
  {
    id: 'spooky_sprouts',
    title: 'Spooky Sprouts',
    text: 'Hoo-hoo! Candy Corn only grows in the Halloween moonlight. Plant some before the season ends!',
    giver: 'Mayor Maple',
    level: 1,
    requires: [],
    event: 'halloween',
    goals: [stat('plant:candy_corn', 6, 'Plant 6 Candy Corn')],
    reward: { coins: 100, xp: 20, items: { candy: 20 } },
  },
  {
    id: 'trick_or_treat',
    title: 'Trick or Treat!',
    text: 'Little ghosts and pumpkins are knocking on doors. Say hello to the trick-or-treaters who visit your farm!',
    giver: 'Rosie',
    level: 1,
    requires: ['spooky_sprouts'],
    event: 'halloween',
    goals: [stat('treat', 3, 'Greet 3 trick-or-treaters')],
    reward: { coins: 150, xp: 25, items: { candy: 25, mystery_gift: 1 } },
  },
  {
    id: 'haunted_homestead',
    title: 'Haunted Homestead',
    text: 'A farm just isn\'t ready for Halloween without a few spooky-cute decorations, dearie.',
    giver: 'Grandma Fern',
    level: 1,
    requires: ['trick_or_treat'],
    event: 'halloween',
    goals: [stat('place:seasonal', 5, 'Place 5 seasonal decorations')],
    reward: { coins: 200, xp: 30, items: { candy: 30, ghost_kitty: 1 } },
  },
  {
    id: 'pumpkin_king',
    title: 'The Pumpkin King',
    text: 'Ghost pumpkins glow in the dark, you know. Grow me a patch and I\'ll make it worth your while!',
    giver: 'Penny',
    level: 3,
    requires: ['haunted_homestead'],
    event: 'halloween',
    goals: [stat('harvest:ghost_pumpkin', 5, 'Harvest Ghost Pumpkins 5 times')],
    reward: { coins: 400, xp: 50, items: { candy: 40 } },
  },
  {
    id: 'sweet_tooth',
    title: 'Sweet Tooth',
    text: 'Bawk! Collect a mountain of candy and I\'ll give you my most precious treasure.',
    giver: 'Henrietta',
    level: 1,
    requires: ['pumpkin_king'],
    event: 'halloween',
    goals: [stat('candy', 200, 'Collect 200 candy')],
    reward: { coins: 500, xp: 80, items: { golden_pumpkin: 1 } },
  },
];

export const QUESTS: Record<string, QuestDef> = table(QUEST_LIST);

/** At most this many quests are shown at once. */
export const MAX_ACTIVE_QUESTS = 4;
