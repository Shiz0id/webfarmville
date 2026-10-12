// Decoration sets 2 and 3.
//
// Lifestyle: little holiday scenes to live in (cocoa stands, carving tables,
// picnics) sold during their seasonal event.
// Horticulture: a cheerful gardening collection — pots, beds, trellises,
// greenhouses and smiling veggies — available all year.

import type { DecoDef } from './decorations';

type Opts = Partial<Pick<DecoDef, 'w' | 'h' | 'flat'>>;

const life = (event: string, id: string, name: string, cost: number, charm: number, opts: Opts = {}): DecoDef => ({
  id,
  name,
  category: 'seasonal',
  level: 1,
  cost,
  charm,
  w: 1,
  h: 1,
  event,
  set: 'lifestyle',
  ...opts,
});

const hort = (id: string, name: string, level: number, cost: number, charm: number, opts: Opts = {}): DecoDef => ({
  id,
  name,
  category: 'horticulture',
  level,
  cost,
  charm,
  w: 1,
  h: 1,
  set: 'horticulture',
  ...opts,
});

export const LIFESTYLE_DECORATIONS: DecoDef[] = [
  // Lunar New Year
  life('lunar_new_year', 'dumpling_table', 'Dumpling Feast Table', 150, 5, { w: 2, h: 1 }),
  life('lunar_new_year', 'lion_dance_drum', 'Lion Dance Drum', 110, 4),
  life('lunar_new_year', 'tangerine_tree', 'Lucky Tangerine Tree', 140, 5),
  // Valentine's
  life('valentines', 'fondue_table', 'Chocolate Fondue Table', 130, 4),
  life('valentines', 'love_mailbox', 'Love Letter Mailbox', 70, 3),
  life('valentines', 'picnic_for_two', 'Picnic for Two', 120, 5, { w: 2, h: 2, flat: true }),
  // St. Patrick's
  life('st_patricks', 'shamrock_tea', 'Shamrock Tea Table', 110, 4),
  life('st_patricks', 'hat_planter', 'Top Hat Clover Planter', 80, 3),
  life('st_patricks', 'clover_bench', 'Clover Garden Bench', 120, 4),
  // Spring
  life('spring', 'egg_painting', 'Egg Painting Table', 120, 4),
  life('spring', 'bunny_burrow', 'Bunny Burrow', 90, 4),
  life('spring', 'kite_post', 'Spring Kite', 70, 3),
  life('spring', 'blossom_picnic', 'Blossom Picnic', 130, 5, { w: 2, h: 2, flat: true }),
  // Summer
  life('summer', 'ice_cream_cart', 'Ice Cream Cart', 160, 5),
  life('summer', 'beach_chairs', 'Beach Chairs', 120, 4, { w: 2, h: 1 }),
  life('summer', 'watermelon_picnic', 'Watermelon Picnic', 110, 4, { w: 2, h: 2, flat: true }),
  life('summer', 'sprinkler', 'Lawn Sprinkler', 60, 2),
  // Harvest
  life('harvest', 'apple_bobbing', 'Apple Bobbing Tub', 90, 3),
  life('harvest', 'pie_rack', 'Pie Cooling Rack', 120, 4),
  life('harvest', 'hayride_wagon', 'Hayride Wagon', 200, 6, { w: 2, h: 1 }),
  // Halloween
  life('halloween', 'carving_table', 'Pumpkin Carving Table', 120, 4),
  life('halloween', 'costume_rack', 'Costume Rack', 100, 4),
  life('halloween', 'candy_bowl', 'Trick-or-Treat Candy Stand', 70, 3),
  // Festival of Lights
  life('diwali', 'sweets_table', 'Festive Sweets Table', 130, 4),
  life('diwali', 'star_lantern', 'Paper Star Lantern', 80, 3),
  life('diwali', 'floating_flowers', 'Floating Flower Bowl', 90, 3),
  // Winter
  life('winter', 'cocoa_stand', 'Hot Cocoa Stand', 170, 5),
  life('winter', 'cookie_table', 'Cookie Baking Table', 140, 5),
  life('winter', 'snow_sled', 'Snow Sled', 70, 3),
  life('winter', 'fire_pit', 'Fire Pit & Blankets', 160, 5),
  life('winter', 'reindeer_topiary', 'Reindeer Topiary', 150, 5),
  // New Year
  life('new_year', 'party_snacks', 'Party Snack Table', 120, 4),
  life('new_year', 'sparkler_bucket', 'Sparkler Bucket', 60, 3),
  life('new_year', 'wish_board', 'New Year Wish Board', 90, 3),
];

export const HORTICULTURE_DECORATIONS: DecoDef[] = [
  hort('terracotta_stack', 'Terracotta Pot Stack', 1, 30, 1),
  hort('seedling_tray', 'Seedling Trays', 1, 35, 2),
  hort('smiling_sunflower_pot', 'Smiling Sunflower Pot', 2, 60, 3),
  hort('watering_station', 'Watering Station', 2, 70, 2),
  hort('tool_rack', 'Garden Tool Rack', 2, 55, 2),
  hort('tomato_cage', 'Tomato Cage', 3, 45, 2),
  hort('bean_teepee', 'Bean Teepee', 3, 60, 2),
  hort('raised_veg_bed', 'Raised Veggie Bed', 3, 90, 3, { w: 2, h: 1 }),
  hort('veggie_friends', 'Veggie Friends Planter', 4, 110, 4),
  hort('seed_packet_stand', 'Seed Packet Stand', 4, 80, 3),
  hort('potting_bench', 'Potting Bench', 5, 140, 4, { w: 2, h: 1 }),
  hort('strawberry_pot', 'Strawberry Tower Pot', 5, 90, 3),
  hort('apron_hook', 'Apron & Gloves Hook', 5, 50, 2),
  hort('cold_frame', 'Cold Frame', 6, 100, 3),
  hort('bee_hotel', 'Bee Hotel', 6, 90, 3),
  hort('ladybug_house', 'Ladybug House', 6, 70, 3),
  hort('tiered_plant_stand', 'Tiered Plant Stand', 7, 130, 4),
  hort('worm_bin', 'Happy Worm Bin', 7, 60, 2),
  hort('flower_cart', 'Flower Cart', 8, 180, 5, { w: 2, h: 1 }),
  hort('butterfly_bush', 'Butterfly Bush', 8, 120, 4),
  hort('moss_ball', 'Kokedama Moss Balls', 9, 100, 3),
  hort('prize_pumpkin', 'Blue Ribbon Pumpkin', 9, 160, 5),
  hort('herb_spiral', 'Herb Spiral', 10, 200, 6, { w: 2, h: 2 }),
  hort('trellis_roses', 'Climbing Rose Trellis', 10, 150, 5),
  hort('bonsai_table', 'Bonsai Display', 11, 220, 6),
  hort('orchid_stand', 'Orchid Stand', 11, 170, 5),
  hort('giant_turnip', 'Giant Turnip', 12, 180, 5),
  hort('succulent_wagon', 'Succulent Wagon', 12, 190, 5),
  hort('mole_statue', 'Mole Gardener Statue', 13, 140, 4),
  hort('harvest_scale', 'Prize Harvest Scale', 13, 160, 5),
  hort('glass_greenhouse', 'Glass Greenhouse', 15, 700, 15, { w: 2, h: 2 }),
  hort('garden_show_stage', 'Garden Show Podium', 16, 500, 12, { w: 2, h: 1 }),
];
