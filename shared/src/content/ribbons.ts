// FarmVille-style ribbons: yellow, white, red and blue ribbons for lifetime
// milestones, each paying a little reward.

import { table } from './table';

export interface RibbonDef {
  id: string;
  name: string;
  /** What you did, e.g. "crops harvested". */
  noun: string;
  stat: string;
  tiers: [number, number, number, number];
}

export const RIBBON_COLORS = ['yellow', 'white', 'red', 'blue'] as const;
export const RIBBON_REWARDS = [
  { coins: 100, xp: 10 },
  { coins: 300, xp: 30 },
  { coins: 800, xp: 80 },
  { coins: 2000, xp: 200 },
];

export const RIBBON_LIST: RibbonDef[] = [
  { id: 'green_thumb', name: 'Green Thumb', noun: 'crops harvested', stat: 'harvest', tiers: [10, 75, 300, 1500] },
  { id: 'plow_pro', name: 'Plow Pro', noun: 'plots plowed', stat: 'plow', tiers: [10, 50, 200, 800] },
  { id: 'animal_whisperer', name: 'Animal Whisperer', noun: 'goods collected', stat: 'collect', tiers: [10, 75, 300, 1500] },
  { id: 'master_crafter', name: 'Master Crafter', noun: 'goods crafted', stat: 'craft', tiers: [5, 40, 150, 600] },
  { id: 'decorator', name: 'Dream Decorator', noun: 'decorations placed', stat: 'place:deco', tiers: [5, 30, 100, 300] },
  { id: 'good_neighbor', name: 'Good Neighbor', noun: 'neighbors helped', stat: 'help', tiers: [5, 30, 120, 500] },
  { id: 'delivery_hero', name: 'Delivery Hero', noun: 'orders delivered', stat: 'order', tiers: [3, 20, 80, 300] },
  { id: 'generous_heart', name: 'Generous Heart', noun: 'gifts sent', stat: 'gift', tiers: [3, 20, 80, 300] },
  { id: 'lucky_duck', name: 'Lucky Duck', noun: 'mystery gifts opened', stat: 'unwrap', tiers: [1, 10, 40, 150] },
  { id: 'sweet_tooth', name: 'Sweet Tooth', noun: 'candy collected', stat: 'candy', tiers: [25, 150, 500, 2000] },
  { id: 'angler', name: 'Angler', noun: 'fish caught', stat: 'fish', tiers: [10, 60, 250, 1000] },
  { id: 'bug_catcher', name: 'Bug Catcher', noun: 'critters caught', stat: 'bug', tiers: [10, 60, 250, 1000] },
  { id: 'good_friend', name: 'Good Friend', noun: 'gifts given', stat: 'gift', tiers: [5, 30, 120, 400] },
  { id: 'shopkeeper', name: 'Shopkeeper', noun: 'goods sold at your stall', stat: 'stallSold', tiers: [20, 150, 600, 2500] },
  { id: 'flower_fairy', name: 'Flower Fairy', noun: 'flowers sprouted', stat: 'sprout', tiers: [5, 30, 120, 400] },
  { id: 'fair_star', name: 'Fair Star', noun: 'county fair blue ribbons', stat: 'blueRibbon', tiers: [1, 8, 30, 100] },
  { id: 'cat_lover', name: 'Cat Lover', noun: 'kitty visits', stat: 'kittyVisit', tiers: [10, 75, 300, 1200] },
  { id: 'crop_master', name: 'Crop Master', noun: 'mastery stars earned', stat: 'masteryStar', tiers: [1, 8, 20, 48] },
  { id: 'treasure_hunter', name: 'Treasure Hunter', noun: 'collections completed', stat: 'collectionTrade', tiers: [1, 5, 15, 40] },
  { id: 'big_heart', name: 'Big Heart', noun: 'lonely animals helped', stat: 'lonely', tiers: [1, 5, 20, 60] },
  { id: 'trick_or_treat', name: 'Spooky Host', noun: 'trick-or-treaters greeted', stat: 'treat', tiers: [3, 15, 50, 150] },
];

export const RIBBONS: Record<string, RibbonDef> = table(RIBBON_LIST);
