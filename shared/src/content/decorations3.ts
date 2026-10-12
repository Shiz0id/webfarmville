// Decoration sets 4, 5 and 6.
//
// Spooky: a big Halloween expansion, including candy-priced exclusives from
// the Candy Shop.
// Country: countryside nostalgia, playgrounds and the trees the core set lacks.
// Festivals: new holidays (Hanami, Earth Day, Tanabata, Mid-Autumn, Thanksgiving),
// more winter fun, and a year-round party collection.

import type { DecoCategory, DecoDef } from './decorations';

type Opts = Partial<Pick<DecoDef, 'w' | 'h' | 'flat' | 'candy' | 'level'>>;

function make(set: DecoDef['set'], category: DecoCategory, event: string | undefined) {
  return (id: string, name: string, cost: number, charm: number, opts: Opts = {}): DecoDef => ({
    id,
    name,
    category,
    level: 1,
    cost,
    charm,
    w: 1,
    h: 1,
    set,
    ...(event ? { event } : {}),
    ...opts,
  });
}

const spooky = make('spooky', 'seasonal', 'halloween');

export const SPOOKY_DECORATIONS: DecoDef[] = [
  spooky('haunted_house', 'Cute Haunted House', 0, 14, { w: 2, h: 2, candy: 60 }),
  spooky('witch_cottage', "Witch's Cottage", 600, 14, { w: 2, h: 2 }),
  spooky('pumpkin_arch', 'Pumpkin Arch', 220, 7),
  spooky('ghost_lantern', 'Ghost Lantern Post', 90, 3),
  spooky('bat_house', 'Bat House', 80, 3),
  spooky('cobweb_fence', 'Cobweb Fence', 30, 1),
  spooky('silly_tombstone', 'Silly "BOO" Tombstone', 40, 2),
  spooky('friendly_skeleton', 'Dancing Skeleton', 120, 4),
  spooky('frankie_statue', 'Friendly Frankie Statue', 150, 5),
  spooky('mummy_gnome', 'Mummy Gnome', 70, 3),
  spooky('bat_topiary', 'Bat Topiary', 130, 4),
  spooky('potion_shelf', 'Potion Shelf', 140, 5),
  spooky('crystal_ball', 'Crystal Ball Table', 160, 5),
  spooky('broom_rack', 'Broomstick Rack', 60, 2),
  spooky('bubbling_cauldron', 'Bubbling Cauldron', 120, 4),
  spooky('hay_maze', 'Hay Bale Maze', 250, 8, { w: 2, h: 2 }),
  spooky('corn_bundle', 'Corn Stalk Bundle', 40, 2),
  spooky('pumpkin_wagon', 'Pumpkin Wagon', 180, 6, { w: 2, h: 1 }),
  spooky('pumpkin_tower', 'Stacked Pumpkin Tower', 90, 3),
  spooky('jack_string_lights', "Jack-o'-Lantern String Lights", 110, 4, { w: 2, h: 1 }),
  spooky('haunted_tree', "Hootin' Haunted Tree", 200, 6),
  spooky('glow_mushrooms', 'Glowing Mushroom Ring', 90, 4),
  spooky('owl_perch', 'Night Owl Perch', 100, 3),
  spooky('treat_bags', 'Trick-or-Treat Bags', 50, 2),
  spooky('witch_hat_planter', 'Witch Hat Planter', 70, 3),
  spooky('ghost_swing', 'Ghostly Swing', 170, 5),
  spooky('moon_photo_booth', 'Harvest Moon Photo Booth', 260, 8, { w: 2, h: 1 }),
  spooky('monster_mailbox', 'Monster Mailbox', 80, 3),
  spooky('cat_fence_post', 'Black Cat Fence Post', 60, 2),
  spooky('pumpkin_patch_sign', 'Pumpkin Patch Sign', 45, 2),
  // Candy Shop exclusives: bought with candy, not coins.
  spooky('candy_corn_statue', 'Giant Candy Corn', 0, 6, { candy: 25 }),
  spooky('caramel_apple_stand', 'Caramel Apple Stand', 0, 7, { candy: 40 }),
  spooky('ghost_kitty', 'Ghost Kitty', 0, 6, { candy: 35 }),
  spooky('golden_pumpkin', 'Golden Pumpkin', 0, 12, { candy: 80 }),
  spooky('lollipop_tree', 'Lollipop Tree', 0, 9, { candy: 50 }),
];

const country = make('country', 'country', undefined);
const tree = make('country', 'plants', undefined);

export const COUNTRY_DECORATIONS: DecoDef[] = [
  country('red_barn', 'Classic Red Barn', 900, 18, { w: 3, h: 3, level: 6 }),
  country('grain_silo', 'Grain Silo', 400, 8, { level: 5 }),
  country('vintage_tractor', 'Vintage Tractor', 500, 10, { w: 2, h: 1, level: 7 }),
  country('flower_truck', 'Old Truck Full of Flowers', 450, 10, { w: 2, h: 1, level: 8 }),
  country('chicken_coop', 'Chicken Coop', 200, 5, { level: 2 }),
  country('water_tower', 'Water Tower', 380, 8, { level: 9 }),
  country('windpump', 'Farm Windpump', 300, 7, { level: 6 }),
  country('covered_bridge', 'Covered Bridge', 420, 9, { w: 2, h: 1, level: 10 }),
  country('tire_swing', 'Tire Swing Tree', 180, 5, { level: 4 }),
  country('treehouse', 'Treehouse', 650, 14, { w: 2, h: 2, level: 11 }),
  country('playground_slide', 'Playground Slide', 220, 6, { level: 5 }),
  country('seesaw', 'Seesaw', 150, 4, { w: 2, h: 1, level: 4 }),
  country('sandbox', 'Sandbox', 110, 3, { level: 3 }),
  country('little_carousel', 'Little Carousel', 380, 10, { w: 2, h: 2, level: 12 }),
  country('laundry_line', 'Laundry Line', 90, 3, { w: 2, h: 1, level: 2 }),
  country('duck_pond', 'Duck Pond', 260, 8, { w: 2, h: 2, flat: true, level: 6 }),
  country('camping_tent', 'Camping Tent', 160, 4, { level: 4 }),
  country('fishing_dock', 'Fishing Dock', 220, 6, { w: 2, h: 1, flat: true, level: 7 }),
  country('farm_stand', 'Roadside Farm Stand', 240, 6, { level: 5 }),
  country('haystack', 'Haystack', 60, 2, { level: 1 }),
  country('barrel_planter', 'Barrel Planter', 50, 2, { level: 1 }),
  country('wagon_wheel', 'Wagon Wheel Decor', 40, 1, { level: 1 }),
  country('weathervane', 'Rooster Weathervane', 120, 4, { level: 3 }),
  country('bird_feeder', 'Bird Feeder Post', 70, 3, { level: 2 }),
  country('bunny_hutch', 'Bunny Hutch', 150, 4, { level: 4 }),
  country('dog_house', 'Dog House', 140, 4, { level: 2 }),
  country('cat_tower', 'Cat Tower', 130, 4, { level: 3 }),
  country('canoe_rack', 'Canoe Rack', 120, 3, { level: 6 }),
  tree('oak_tree', 'Big Oak Tree', 90, 2, { level: 1 }),
  tree('autumn_oak', 'Golden Autumn Oak', 120, 3, { level: 3 }),
  tree('magnolia_tree', 'Magnolia Tree', 160, 5, { level: 6 }),
  tree('wisteria_arch', 'Wisteria Arch', 240, 7, { level: 9 }),
  tree('lilac_bush', 'Lilac Bush', 70, 2, { level: 2 }),
  tree('palm_tree', 'Palm Tree', 120, 3, { level: 5 }),
  tree('fruit_hedge', 'Berry Hedge', 60, 2, { level: 2 }),
];

const fest = (event: string | undefined, category: DecoCategory = 'seasonal') => make('festivals', category, event);
const hanami = fest('hanami');
const earth = fest('earth_day');
const tanabata = fest('tanabata');
const moon = fest('mid_autumn');
const thanks = fest('thanksgiving');
const winter = fest('winter');
const party = fest(undefined, 'party');

export const FESTIVAL_DECORATIONS: DecoDef[] = [
  hanami('hanami_picnic', 'Hanami Picnic', 140, 5, { w: 2, h: 2, flat: true }),
  hanami('sakura_arch', 'Sakura Arch', 220, 7),
  hanami('paper_lantern_tree', 'Paper Lantern Tree', 180, 6),
  hanami('dango_stand', 'Dango Sweets Stand', 150, 5),
  earth('recycling_bins', 'Happy Recycling Bins', 70, 3),
  earth('solar_lamp', 'Solar Garden Lamp', 60, 2),
  earth('sapling_pot', 'Little Sapling', 40, 2),
  earth('globe_planter', 'Earth Globe Planter', 160, 5),
  tanabata('wish_bamboo', 'Wishing Bamboo', 160, 6),
  tanabata('star_streamers', 'Star Streamers', 110, 4),
  tanabata('paper_cranes', 'Paper Crane Mobile', 90, 3),
  moon('rabbit_lantern', 'Rabbit Lantern', 90, 4),
  moon('mooncake_table', 'Mooncake Tea Table', 150, 5),
  moon('moon_gate', 'Moon Gate', 280, 8, { w: 2, h: 1 }),
  moon('osmanthus_tree', 'Osmanthus Tree', 170, 5),
  thanks('turkey_statue', 'Friendly Turkey Statue', 110, 4),
  thanks('feast_table', 'Thanksgiving Feast Table', 240, 7, { w: 2, h: 1 }),
  thanks('gratitude_tree', 'Gratitude Tree', 180, 6),
  thanks('pie_contest', 'Pie Contest Table', 140, 5),
  winter('igloo', 'Igloo', 200, 6),
  winter('skating_pond', 'Ice Skating Pond', 260, 8, { w: 2, h: 2, flat: true }),
  winter('snow_bunny', 'Snow Bunny Sculpture', 90, 3),
  winter('cocoa_sled_hill', 'Snowman Family', 160, 5, { w: 2, h: 1 }),
  party('birthday_cake', 'Birthday Cake Table', 150, 5, { level: 3 }),
  party('balloon_bunch', 'Balloon Bunch', 60, 3, { level: 1 }),
  party('party_tent', 'Garden Party Tent', 420, 10, { w: 2, h: 2, level: 8 }),
  party('confetti_arch', 'Balloon Arch', 200, 6, { level: 5 }),
  party('bubble_machine', 'Bubble Machine', 120, 4, { level: 4 }),
  party('garden_party_table', 'Garden Party Table', 220, 6, { w: 2, h: 1, level: 6 }),
  party('dance_floor', 'Twinkly Dance Floor', 300, 7, { w: 2, h: 2, flat: true, level: 9 }),
  party('cupcake_tower', 'Cupcake Tower', 90, 3, { level: 2 }),
  party('pinata', 'Llama Piñata', 80, 3, { level: 3 }),
  party('photo_frame', 'Giant Photo Frame', 130, 4, { level: 4 }),
  party('ice_cream_bike', 'Ice Cream Bike', 260, 7, { level: 7 }),
];
