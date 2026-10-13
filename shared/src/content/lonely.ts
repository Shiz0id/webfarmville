// Lonely animals (FarmVille 1). Once a day a lost little animal may wander
// onto your farm looking for a home. Adopt it, or walk it over to a villager
// who has been hoping for one.

/** Lonely animals start showing up at this level. */
export const LONELY_LEVEL = 3;
/** Animals can be up to this many levels above yours (a lonely pig is a treat!). */
export const LONELY_LEVEL_AHEAD = 4;
export const ADOPT_XP = 15;
export const REHOME_XP = 15;
/** Friendship points from the villager who takes the animal in. */
export const REHOME_POINTS = 60;

/** Animals that can turn up (beehives don't wander). */
export const LONELY_ANIMALS = ['chicken', 'cow', 'sheep', 'pig', 'duck', 'goat', 'rabbit'];

/** Who would love to give each animal a home, and what they say. */
export const LONELY_HOMES: Record<string, { who: string; line: string }> = {
  chicken: { who: 'henrietta', line: 'Bok bok! A new cousin! I will knit her a tiny scarf right away.' },
  cow: { who: 'mama_marigold', line: 'Oh, my heart! Fresh milk for my cocoa and a sweet face to say good morning to.' },
  sheep: { who: 'grandma_fern', line: 'What a fluffy dear. We will sit by the fire together and I will spin her wool.' },
  pig: { who: 'penny', line: 'Oink oink! A best friend for mud-puddle Mondays! Thank you thank you!' },
  duck: { who: 'rosie', line: 'Eee! A duckling! We will paddle in the pond every single morning!' },
  goat: { who: 'mayor_maple', line: 'Hoo-hoo! Town hall could use a goat. She can eat the paperwork.' },
  rabbit: { who: 'rosie', line: 'A bunny friend for a bunny! We will hop all over the meadow.' },
};

export const LONELY_NAMES = [
  'Buttercup', 'Clover', 'Daisy', 'Biscuit', 'Pudding', 'Maple', 'Pumpkin', 'Waffles', 'Mochi', 'Peaches',
  'Sprout', 'Bramble', 'Hazel', 'Pip', 'Dumpling', 'Juniper', 'Toffee', 'Honeybun', 'Marshmallow', 'Pebble',
]; // prettier-ignore
