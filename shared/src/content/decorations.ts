// Cozy, wholesome decorations in the spirit of Animal Crossing. Each one adds
// "charm" to the farm, which raises the farm's star rating and daily bonus.

import { HORTICULTURE_DECORATIONS, LIFESTYLE_DECORATIONS } from './decorations2';
import { COUNTRY_DECORATIONS, FESTIVAL_DECORATIONS, SPOOKY_DECORATIONS } from './decorations3';
import { NATURE_DECORATIONS } from './nature';
import { KITTY_DECORATIONS } from './kitties';
import { FRIEND_DECORATIONS } from './friends';
import { MARKET_DECORATIONS } from './market';
import { BLOOM_DECORATIONS, FLORIST_DECORATIONS } from './blooms';
import { FAIR_DECORATIONS } from './fair';
import { table } from './table';

export type DecoCategory =
  | 'flowers'
  | 'plants'
  | 'fences'
  | 'paths'
  | 'furniture'
  | 'lights'
  | 'water'
  | 'garden'
  | 'whimsy'
  | 'horticulture'
  | 'country'
  | 'party'
  | 'kitty'
  | 'seasonal';

export interface DecoDef {
  id: string;
  name: string;
  category: DecoCategory;
  level: number;
  cost: number;
  charm: number;
  w: number;
  h: number;
  /** Drawn flat on the ground beneath other sprites (paths, rugs, patches). */
  flat?: boolean;
  /** Only purchasable while this seasonal event is running. */
  event?: string;
  /** Later decoration collections (painted in their own art module). */
  set?: 'lifestyle' | 'horticulture' | 'spooky' | 'country' | 'festivals' | 'nature' | 'kitty' | 'friends' | 'market' | 'blooms' | 'fair';
  /** Earned, never sold: how to get it (e.g. "Discover 10 kinds of fish"). */
  reward?: string;
  /** Bought with the event's currency (e.g. Halloween candy) instead of coins. */
  tokens?: number;
}

type Opts = Partial<Pick<DecoDef, 'w' | 'h' | 'flat' | 'event' | 'tokens'>>;

const d = (
  id: string,
  name: string,
  category: DecoCategory,
  level: number,
  cost: number,
  charm: number,
  opts: Opts = {},
): DecoDef => ({ id, name, category, level, cost, charm, w: 1, h: 1, ...opts });

const ev = (event: string, id: string, name: string, cost: number, charm: number, opts: Opts = {}) =>
  d(id, name, 'seasonal', 1, cost, charm, { ...opts, event });

/** The original collection. */
export const CORE_DECORATIONS: DecoDef[] = [
  // Flowers
  d('tulips_red', 'Red Tulips', 'flowers', 1, 20, 1),
  d('tulips_yellow', 'Yellow Tulips', 'flowers', 1, 20, 1),
  d('tulips_pink', 'Pink Tulips', 'flowers', 1, 20, 1),
  d('tulips_purple', 'Purple Tulips', 'flowers', 2, 25, 1),
  d('roses_red', 'Red Roses', 'flowers', 2, 35, 2),
  d('roses_white', 'White Roses', 'flowers', 3, 35, 2),
  d('roses_pink', 'Pink Roses', 'flowers', 3, 35, 2),
  d('daisies', 'Daisy Patch', 'flowers', 1, 15, 1),
  d('pansies', 'Pansy Bed', 'flowers', 2, 25, 1),
  d('cosmos', 'Cosmos', 'flowers', 4, 30, 2),
  d('hyacinths', 'Hyacinths', 'flowers', 5, 30, 2),
  d('lilies', 'Lilies', 'flowers', 6, 40, 2),
  d('mums', 'Mums', 'flowers', 7, 40, 2),
  d('wildflowers', 'Wildflower Meadow', 'flowers', 3, 45, 3, { w: 2, h: 1 }),
  d('sunflower_row', 'Sunflower Row', 'flowers', 8, 60, 3, { w: 2, h: 1 }),
  d('lily_of_valley', 'Lily of the Valley', 'flowers', 9, 45, 2),
  d('flower_planter', 'Flower Planter Box', 'flowers', 4, 70, 3),
  d('hanging_basket', 'Hanging Flower Basket', 'flowers', 6, 80, 3),

  // Plants & trees
  d('round_bush', 'Round Bush', 'plants', 1, 25, 1),
  d('hydrangea_blue', 'Blue Hydrangea', 'plants', 3, 50, 2),
  d('hydrangea_pink', 'Pink Hydrangea', 'plants', 3, 50, 2),
  d('azalea', 'Azalea Bush', 'plants', 5, 55, 2),
  d('square_hedge', 'Square Hedge', 'plants', 2, 30, 1),
  d('topiary_ball', 'Ball Topiary', 'plants', 6, 90, 3),
  d('topiary_bunny', 'Bunny Topiary', 'plants', 10, 180, 5),
  d('cedar_tree', 'Cedar Tree', 'plants', 2, 60, 2),
  d('birch_tree', 'Birch Tree', 'plants', 4, 70, 2),
  d('cherry_blossom', 'Cherry Blossom Tree', 'plants', 8, 200, 6),
  d('weeping_willow', 'Weeping Willow', 'plants', 11, 260, 7, { w: 2, h: 2 }),
  d('bamboo', 'Bamboo Cluster', 'plants', 7, 80, 2),
  d('potted_fern', 'Potted Fern', 'plants', 2, 30, 1),
  d('cactus_pot', 'Potted Cactus', 'plants', 3, 30, 1),
  d('mushroom_ring', 'Mushroom Ring', 'plants', 5, 45, 2),

  // Fences
  d('picket_fence', 'White Picket Fence', 'fences', 1, 10, 1),
  d('log_fence', 'Rustic Log Fence', 'fences', 1, 8, 1),
  d('iron_fence', 'Iron Garden Fence', 'fences', 6, 25, 1),
  d('stone_wall', 'Low Stone Wall', 'fences', 4, 20, 1),
  d('bamboo_fence', 'Bamboo Fence', 'fences', 7, 22, 1),
  d('hedge_fence', 'Hedge Wall', 'fences', 5, 25, 1),
  d('garden_gate', 'Garden Gate', 'fences', 3, 40, 2),

  // Paths (flat)
  d('path_stone', 'Stepping Stones', 'paths', 1, 5, 0, { flat: true }),
  d('path_brick', 'Brick Path', 'paths', 2, 8, 0, { flat: true }),
  d('path_cobble', 'Cobblestone', 'paths', 3, 8, 0, { flat: true }),
  d('path_dirt', 'Dirt Path', 'paths', 1, 2, 0, { flat: true }),
  d('path_wood', 'Wooden Deck', 'paths', 4, 10, 0, { flat: true }),
  d('path_sand', 'Sand Path', 'paths', 2, 4, 0, { flat: true }),
  d('path_flower', 'Flower Tile Path', 'paths', 6, 15, 1, { flat: true }),
  d('picnic_blanket', 'Picnic Blanket', 'paths', 3, 40, 2, { flat: true, w: 2, h: 2 }),

  // Furniture
  d('bench_wood', 'Wooden Bench', 'furniture', 2, 60, 2),
  d('bench_white', 'White Garden Bench', 'furniture', 4, 80, 3),
  d('bench_iron', 'Park Bench', 'furniture', 6, 90, 3),
  d('picnic_table', 'Picnic Table', 'furniture', 3, 110, 3, { w: 2, h: 1 }),
  d('garden_chair', 'Garden Chair', 'furniture', 2, 40, 1),
  d('deck_chair', 'Deck Chair', 'furniture', 5, 55, 2),
  d('cafe_table', 'Café Table with Parasol', 'furniture', 7, 150, 4),
  d('hammock', 'Hammock', 'furniture', 8, 140, 4, { w: 2, h: 1 }),
  d('tree_swing', 'Tree Swing', 'furniture', 9, 160, 5),
  d('rocking_chair', 'Rocking Chair', 'furniture', 4, 70, 2),
  d('outdoor_bookshelf', 'Little Free Library', 'furniture', 10, 140, 4),
  d('tea_set', 'Garden Tea Set', 'furniture', 11, 170, 5),

  // Lights
  d('street_lamp', 'Street Lamp', 'lights', 3, 70, 2),
  d('garden_lantern', 'Garden Lantern', 'lights', 2, 35, 1),
  d('stone_lantern', 'Stone Lantern', 'lights', 6, 90, 3),
  d('firefly_jar', 'Firefly Jar', 'lights', 5, 45, 2),
  d('string_lights', 'String Light Posts', 'lights', 8, 120, 4, { w: 2, h: 1 }),
  d('campfire', 'Campfire', 'lights', 4, 60, 3),

  // Water
  d('birdbath', 'Birdbath', 'water', 2, 60, 2),
  d('well', 'Wishing Well', 'water', 3, 120, 4),
  d('fountain', 'Tiered Fountain', 'water', 7, 300, 8, { w: 2, h: 2 }),
  d('pond', 'Lily Pond', 'water', 5, 180, 6, { w: 2, h: 2, flat: true }),
  d('koi_pond', 'Koi Pond', 'water', 12, 400, 10, { w: 2, h: 2, flat: true }),
  d('water_pump', 'Water Pump', 'water', 4, 70, 2),
  d('rain_barrel', 'Rain Barrel', 'water', 2, 30, 1),

  // Garden & farm bits
  d('scarecrow', 'Scarecrow', 'garden', 1, 50, 2),
  d('wheelbarrow', 'Wheelbarrow', 'garden', 2, 45, 1),
  d('hay_bale', 'Hay Bale', 'garden', 1, 20, 1),
  d('mailbox', 'Mailbox', 'garden', 1, 25, 1),
  d('signpost', 'Signpost', 'garden', 2, 30, 1),
  d('birdhouse', 'Birdhouse', 'garden', 3, 50, 2),
  d('watering_cans', 'Watering Cans', 'garden', 2, 30, 1),
  d('garden_gnome', 'Garden Gnome', 'garden', 4, 60, 3),
  d('sundial', 'Sundial', 'garden', 6, 90, 3),
  d('flower_arch', 'Rose Arch', 'garden', 8, 200, 6),
  d('gazebo', 'Gazebo', 'garden', 13, 600, 14, { w: 2, h: 2 }),
  d('greenhouse_mini', 'Mini Greenhouse', 'garden', 9, 250, 6),
  d('apple_crate', 'Apple Crates', 'garden', 3, 35, 1),
  d('milk_cans', 'Milk Cans', 'garden', 4, 35, 1),
  d('compost_bin', 'Compost Bin', 'garden', 2, 25, 1),

  // Whimsy & statues
  d('frog_statue', 'Frog Statue', 'whimsy', 3, 70, 2),
  d('owl_statue', 'Owl Statue', 'whimsy', 5, 80, 3),
  d('bunny_statue', 'Bunny Statue', 'whimsy', 6, 85, 3),
  d('mossy_rock', 'Mossy Boulder', 'whimsy', 1, 15, 1),
  d('tree_stump', 'Tree Stump', 'whimsy', 1, 10, 1),
  d('log_pile', 'Log Pile', 'whimsy', 2, 25, 1),
  d('windchime', 'Wind Chimes', 'whimsy', 5, 60, 2),
  d('pinwheel', 'Pinwheel', 'whimsy', 2, 20, 1),
  d('hot_air_balloon', 'Toy Hot Air Balloon', 'whimsy', 14, 450, 10, { w: 2, h: 2 }),
  d('telescope', 'Stargazing Telescope', 'whimsy', 10, 220, 5),
  d('totem_pole', 'Animal Totem', 'whimsy', 9, 180, 4),
  d('rainbow_bridge', 'Little Arched Bridge', 'whimsy', 11, 300, 8, { w: 2, h: 1 }),

  // Seasonal: Lunar New Year
  ev('lunar_new_year', 'red_lanterns', 'Red Lantern Post', 80, 4),
  ev('lunar_new_year', 'dragon_statue', 'Friendly Dragon Statue', 0, 8, { tokens: 40 }),
  ev('lunar_new_year', 'plum_blossom', 'Plum Blossom Tree', 180, 6),
  ev('lunar_new_year', 'firecracker_string', 'Paper Firecracker Garland', 70, 3),
  // Valentine's
  ev('valentines', 'heart_arch', 'Heart Arch', 0, 6, { tokens: 40 }),
  ev('valentines', 'heart_topiary', 'Heart Topiary', 120, 4),
  ev('valentines', 'love_bench', 'Sweetheart Bench', 0, 5, { tokens: 30 }),
  ev('valentines', 'rose_bouquet', 'Giant Rose Bouquet', 90, 3),
  // St. Patrick's
  ev('st_patricks', 'clover_patch', 'Lucky Clover Patch', 40, 2),
  ev('st_patricks', 'pot_of_gold', 'Pot of Gold', 0, 5, { tokens: 30 }),
  ev('st_patricks', 'rainbow_arch', 'Rainbow Arch', 0, 7, { w: 2, h: 1, tokens: 40 }),
  // Spring egg hunt
  ev('spring', 'egg_basket', 'Painted Egg Basket', 60, 3),
  ev('spring', 'egg_tree', 'Painted Egg Tree', 0, 5, { tokens: 35 }),
  ev('spring', 'chick_family', 'Chick Family', 0, 3, { tokens: 25 }),
  ev('spring', 'tulip_cart', 'Tulip Cart', 140, 5, { w: 2, h: 1 }),
  // Summer festival
  ev('summer', 'beach_umbrella', 'Beach Umbrella', 70, 3),
  ev('summer', 'sandcastle', 'Sandcastle', 90, 3),
  ev('summer', 'lemonade_stand', 'Lemonade Stand', 0, 5, { tokens: 35 }),
  ev('summer', 'tiki_torch', 'Tiki Torch', 50, 2),
  ev('summer', 'kiddie_pool', 'Kiddie Pool', 0, 4, { w: 2, h: 2, flat: true, tokens: 30 }),
  ev('summer', 'festival_bunting', 'Festival Bunting', 80, 3, { w: 2, h: 1 }),
  // Harvest festival
  ev('harvest', 'cornucopia', 'Cornucopia', 110, 4),
  ev('harvest', 'harvest_wreath', 'Harvest Wreath Stand', 80, 3),
  ev('harvest', 'hay_pumpkins', 'Hay Bale & Pumpkins', 90, 3),
  ev('harvest', 'leaf_pile', 'Autumn Leaf Pile', 30, 2),
  ev('harvest', 'apple_cider_stand', 'Cider Stand', 0, 5, { tokens: 35 }),
  ev('harvest', 'autumn_maple', 'Red Maple Tree', 150, 5),
  // Halloween
  ev('halloween', 'jack_o_lantern', "Jack-o'-Lantern", 40, 2),
  ev('halloween', 'pumpkin_pile', 'Pumpkin Pile', 70, 3),
  ev('halloween', 'friendly_ghost', 'Friendly Ghost', 90, 3),
  ev('halloween', 'spooky_tree', 'Spooky Tree', 140, 4),
  ev('halloween', 'candy_cauldron', 'Candy Cauldron', 100, 4),
  ev('halloween', 'witch_scarecrow', 'Witchy Scarecrow', 120, 4),
  ev('halloween', 'black_cat', 'Black Cat Statue', 80, 3),
  // Festival of lights
  ev('diwali', 'diya_lamps', 'Diya Lamps', 50, 3),
  ev('diwali', 'rangoli', 'Rangoli', 80, 4, { flat: true }),
  ev('diwali', 'sky_lantern', 'Paper Sky Lantern', 0, 3, { tokens: 25 }),
  ev('diwali', 'marigold_garland', 'Marigold Garland Arch', 0, 5, { tokens: 40 }),
  // Winter holidays
  ev('winter', 'decorated_pine', 'Decorated Pine', 200, 6),
  ev('winter', 'snowman', 'Snowman', 80, 3),
  ev('winter', 'gift_pile', 'Gift Pile', 70, 3),
  ev('winter', 'candy_cane', 'Candy Cane Post', 40, 2),
  ev('winter', 'sleigh', 'Sleigh', 220, 6, { w: 2, h: 1 }),
  ev('winter', 'menorah', 'Garden Menorah', 120, 4),
  ev('winter', 'gingerbread_house', 'Gingerbread House', 0, 6, { tokens: 40 }),
  ev('winter', 'snow_globe', 'Giant Snow Globe', 0, 5, { tokens: 30 }),
  // New Year
  ev('new_year', 'party_lanterns', 'Party Lantern Post', 70, 3),
  ev('new_year', 'countdown_clock', 'Countdown Clock', 0, 5, { tokens: 40 }),
  ev('new_year', 'confetti_cannon', 'Confetti Cannon', 0, 3, { tokens: 25 }),
  // Hybrid flowers (bred, never sold)
  ...BLOOM_DECORATIONS,
];

export const DECORATION_LIST: DecoDef[] = [
  ...CORE_DECORATIONS,
  ...LIFESTYLE_DECORATIONS,
  ...HORTICULTURE_DECORATIONS,
  ...SPOOKY_DECORATIONS,
  ...COUNTRY_DECORATIONS,
  ...FESTIVAL_DECORATIONS,
  ...NATURE_DECORATIONS,
  ...KITTY_DECORATIONS,
  ...FRIEND_DECORATIONS,
  ...MARKET_DECORATIONS,
  ...FLORIST_DECORATIONS,
  ...FAIR_DECORATIONS,
];

export const DECORATIONS: Record<string, DecoDef> = table(DECORATION_LIST);

export const DECO_CATEGORIES: { id: DecoCategory; name: string }[] = [
  { id: 'seasonal', name: 'Seasonal' },
  { id: 'horticulture', name: 'Gardening' },
  { id: 'country', name: 'Countryside' },
  { id: 'party', name: 'Party' },
  { id: 'kitty', name: 'Kitty Corner' },
  { id: 'flowers', name: 'Flowers' },
  { id: 'plants', name: 'Plants' },
  { id: 'fences', name: 'Fences' },
  { id: 'paths', name: 'Paths' },
  { id: 'furniture', name: 'Furniture' },
  { id: 'lights', name: 'Lights' },
  { id: 'water', name: 'Water' },
  { id: 'garden', name: 'Garden' },
  { id: 'whimsy', name: 'Whimsy' },
];
