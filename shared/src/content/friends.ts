// Villager friendships: who loves what, birthdays, what they say, and the
// letters (with presents) they mail you as you become closer.

import type { DecoDef } from './decorations';
import type { Weather } from './weather';

export interface FriendDef {
  id: string;
  /** Matches the quest/order giver name. */
  name: string;
  emoji: string;
  species: string;
  /** Month (1-12) and day. */
  birthday: [number, number];
  loves: string[];
  /** Item categories they like. */
  likes: string[];
  /** Daily chat lines. */
  chat: string[];
  react: { love: string[]; like: string[]; meh: string[]; birthday: string };
}

export const FRIEND_LIST: FriendDef[] = [
  {
    id: 'mayor_maple',
    name: 'Mayor Maple',
    emoji: '🦉',
    species: 'owl',
    birthday: [11, 14],
    loves: ['maple_syrup', 'pancakes', 'latte', 'apple_pie', 'coelacanth'],
    likes: ['good', 'dish'],
    chat: [
      'Hoo-hoo! Meadowbrook looks lovelier every day, and your farm is a big part of that.',
      'I spent all morning polishing the town bell. It does make a cheerful "bong", doesn\'t it?',
      'Between you and me, I nap in the town hall after lunch. Mayors need their rest too!',
      'Did you know owls can turn their heads almost all the way around? Very handy for keeping an eye on things.',
      'I am drafting a new town motto. "Meadowbrook: Snug as a Bug." What do you think?',
      'The library returned my book about famous fish. Twelve years overdue! Hoo hoo.',
      'A good mayor listens. A great mayor listens AND brings snacks.',
      'I saw your crops from the clock tower this morning. Splendid rows, simply splendid.',
    ],
    react: {
      love: ['Hoo-HOO! Why, this is my absolute favorite! You are a citizen of the highest order!', 'My feathers are positively fluffed! How did you know?'],
      like: ['How thoughtful! I shall enjoy this at my desk.', 'A fine gift. Thank you kindly, friend.'],
      meh: ['Oh! A gift for me? How kind. Hoo.', 'Thank you! I will find a good place for it.'],
      birthday: 'You remembered my birthday?! Hoo-hoo-hoo! This is the best gift a mayor could ask for!',
    },
  },
  {
    id: 'henrietta',
    name: 'Henrietta',
    emoji: '🐔',
    species: 'hen',
    birthday: [4, 9],
    loves: ['cornbread', 'corn', 'sunflower', 'blueberry_muffin', 'cricket'],
    likes: ['crop', 'good'],
    chat: [
      'Bok bok! I baked twelve loaves this morning and ate two. Quality control!',
      'The secret to fluffy muffins is to fold, not stir. Gentle, like tucking in a chick.',
      'My cousins are all coming to visit next week. That is forty-seven chickens. Pray for me.',
      'I found the most perfect sunflower seed today. I could not bring myself to eat it.',
      'Early bird gets the worm, they say. I prefer the early bird gets the warm bread.',
      'Have you tried cornbread with honey? Life-changing. Bok!',
      'I knitted tiny socks for my eggs. They do not need them. They look adorable though.',
      'Rain on the coop roof is the coziest sound. Pitter-patter, pitter-bok.',
    ],
    react: {
      love: ['BOK BOK BOK! Oh my stars, I love this! *flaps happily*', 'Oh, you sweet thing! This is my very favorite!'],
      like: ['Ooh, lovely! This will be perfect for my baking.', 'How nice of you! Bok!'],
      meh: ['Oh! For me? Well, isn\'t that kind.', 'Thank you, dear. Bok.'],
      birthday: 'A birthday present?! Bok bok bok! I am going to cry into my apron! Thank you!',
    },
  },
  {
    id: 'penny',
    name: 'Penny',
    emoji: '🐷',
    species: 'pig',
    birthday: [7, 21],
    loves: ['truffle', 'truffle_pasta', 'watermelon', 'pizza', 'ice_cream'],
    likes: ['dish', 'fruit'],
    chat: [
      'Oink! I had a dream about a pizza as big as a pond. Best. Dream. Ever.',
      'A mud bath a day keeps the grumpies away! Want to try? No? Your loss!',
      'I am working on a recipe for watermelon pizza. It is either genius or a disaster.',
      'Did you know pigs are very clean? We just have a relaxed relationship with mud.',
      'I found a truffle under the old oak tree! Well, my nose did. My nose is very talented.',
      'Snack o\'clock is my favorite time of day. It happens about nine times a day.',
      'Henrietta says I should share my pizza more. I say she should bake more pizza.',
      'Sunny days are for picnics. Rainy days are for puddles. Every day is a good day! Oink!',
    ],
    react: {
      love: ['OINK OINK! For ME?! This is my favorite thing in the whole wide world!', 'Ahh, I could just roll around with joy! Thank you!'],
      like: ['Yum! You really get me, you know that?', 'Oooh, tasty! Thank you, friend!'],
      meh: ['Oh! Thanks! Is it edible? No? Still nice!', 'A present! Oink, thank you!'],
      birthday: 'You remembered my birthday! *happy squeals* I am going to have the best party!',
    },
  },
  {
    id: 'rosie',
    name: 'Rosie',
    emoji: '🐰',
    species: 'bunny',
    birthday: [3, 28],
    loves: ['carrot', 'carrot_cake', 'strawberry_shortcake', 'lavender', 'monarch'],
    likes: ['crop', 'bug'],
    chat: [
      'Hi hi! I counted the clovers by the creek. 412! And one had four leaves!',
      'I named all the butterflies in my garden. That one is Duchess. That one is also Duchess.',
      'Have you met the kitties that wander around? The little grey one let me pet her!',
      'Flowers are just the earth smiling. That\'s what my grandma says, anyway.',
      'I hop to the market every morning. It is great exercise and also there are carrots.',
      'I planted lavender under my window so my dreams smell nice.',
      'When it rains I like to sit under a mushroom and listen. Plip, plop, plip!',
      'Do you think ladybugs know they are cute? I hope somebody tells them.',
    ],
    react: {
      love: ['Eeee! I love it I love it I LOVE it! *happy binky*', 'You are the bestest! This is my favorite!'],
      like: ['Ooh, so pretty! Thank you!', 'Aww, you\'re so sweet! Thank you!'],
      meh: ['Oh, a present! That\'s nice of you!', 'Thank you! *twitches nose*'],
      birthday: 'You remembered my birthday?! *binky binky binky* This is the happiest day!',
    },
  },
  {
    id: 'grandma_fern',
    name: 'Grandma Fern',
    emoji: '🦔',
    species: 'hedgehog',
    birthday: [1, 17],
    loves: ['sweater', 'quilt', 'lavender_tea', 'honey_cookies', 'rainbow_trout'],
    likes: ['animal', 'fish'],
    chat: [
      'Come sit a spell, dearie. The kettle\'s always on.',
      'I\'ve been fishing at Meadow Pond for sixty years. The fish and I have an understanding.',
      'Knit one, purl two, and never rush a scarf. That\'s the secret to a cozy life.',
      'My prickles are softer than they look. Mostly. Don\'t test it.',
      'When I was a young hog, we made our own fun. Mostly by rolling down hills.',
      'Patience, dear. A good harvest, like a good stew, can\'t be hurried.',
      'I left a pie on the windowsill to cool and a raccoon left me a thank-you note. Manners!',
      'A snowy day, a warm blanket and a good book. That\'s my idea of heaven.',
    ],
    react: {
      love: ['Oh my goodness, dearie! This is just what I wanted! Come here, let me pinch your cheeks!', 'Well, I never! My very favorite! You spoil me.'],
      like: ['How lovely. You were raised right, dearie.', 'Thank you, sweetheart. This will come in handy.'],
      meh: ['Oh, how thoughtful of you, dear.', 'Thank you, dearie. Now, have you eaten?'],
      birthday: 'My birthday! At my age most folks forget, but not you. Bless your heart, dearie.',
    },
  },
  {
    id: 'mama_marigold',
    name: 'Mama Marigold',
    emoji: '🐻',
    species: 'bear',
    birthday: [5, 11],
    loves: ['honey', 'salmon', 'berry_parfait', 'blueberry', 'marigold'],
    likes: ['dish', 'fruit'],
    chat: [
      'Hello, sweet pea! Are you eating enough? You look thin. Here, have a muffin.',
      'My garden marigolds won a ribbon at the county fair. Third year running! Not that I\'m counting.',
      'A spoonful of honey makes everything better. Even Mondays.',
      'I caught a salmon with my bare paws this morning. Old habits!',
      'Cooking is just love you can eat. Remember that, dumpling.',
      'I hum when I stir the pot. My mama did, and her mama before her.',
      'Snow outside, soup inside. Perfect balance, sweetie.',
      'If you ever need a hug, my door is always open. Bear hugs are the best kind.',
    ],
    react: {
      love: ['Oh, sweet pea! This is my favorite! Come here for a big bear hug!', 'You darling! You know the way to Mama\'s heart!'],
      like: ['Ooh, lovely! I\'ll cook something special with this.', 'Thank you, dumpling! How thoughtful.'],
      meh: ['Oh, how sweet of you, honey!', 'For me? You\'re a dear. Thank you!'],
      birthday: 'My birthday?! Oh, sweet pea, you\'ll make Mama cry! Thank you, thank you!',
    },
  },
];

export const FRIENDS: Record<string, FriendDef> = Object.fromEntries(FRIEND_LIST.map((f) => [f.id, f]));

/** Points per heart, and the most hearts you can have. */
export const HEART_POINTS = 100;
export const MAX_HEARTS = 10;
export const GIFT_POINTS = { love: 80, like: 40, meh: 20 } as const;
export const CHAT_POINTS = 12;
export const ORDER_POINTS = 25;
export const BIRTHDAY_MULT = 3;

export type GiftTaste = keyof typeof GIFT_POINTS;

export interface LetterReward {
  coins?: number;
  items?: Record<string, number>;
  deco?: string;
}

/** Letters arrive in your mailbox at these heart levels. */
export const LETTER_HEARTS = [2, 4, 6, 8, 10] as const;

export const LETTERS: Record<string, { text: string; reward: LetterReward }[]> = {
  mayor_maple: [
    { text: 'Dear neighbor,\n\nOn behalf of the whole town (and myself personally) thank you for making Meadowbrook so cheerful. Please accept this small token from the town treasury. Don\'t tell the treasurer.', reward: { coins: 300 } },
    { text: 'Dear friend,\n\nThis old clock kept time in my study for thirty years. It deserves to tick somewhere sunny. I think it will be very happy on your farm.\n\nHoo-hoo!', reward: { deco: 'owl_clock' } },
    { text: 'Dear friend,\n\nI found a crate of maple syrup in the town hall basement, labelled "EMERGENCY PANCAKES". I believe this is an emergency of friendship. Enjoy!', reward: { items: { maple_syrup: 5 }, coins: 500 } },
    { text: 'Dear friend,\n\nI have asked the town council to declare a "Friend of Meadowbrook Day" in your honor. The vote was unanimous (I am the council). Please find enclosed a small celebration fund.', reward: { coins: 1200 } },
    { text: 'My dearest friend,\n\nA mayor meets many folks, but only a few become true friends. You are one of them. The town carpenters built this gazebo just for you. May it host many happy afternoons.\n\nWith all my hoots,\nMayor Maple', reward: { deco: 'mayor_gazebo' } },
  ],
  henrietta: [
    { text: 'Bok bok, dear!\n\nI made too many eggs this week (it happens). Here are some for your kitchen. Make something fluffy!\n\nHenrietta', reward: { items: { egg: 6, flour: 3 } } },
    { text: 'Dear friend,\n\nMy old bread cart needs a new home now that I have a bakery. It still smells like cinnamon rolls! I hope it makes your farm smell delicious too.\n\nBok!', reward: { deco: 'bread_cart' } },
    { text: 'Dear friend,\n\nHere is a batch of my famous blueberry muffins. The recipe is a family secret, so eat them quickly before anyone figures it out!\n\nHenrietta', reward: { items: { blueberry_muffin: 4, cornbread: 3 } } },
    { text: 'Dear friend,\n\nThe girls at the coop voted you "Most Excellent Human". I made you a ribbon but I ate it (it was made of licorice). Please accept these coins instead.\n\nBok bok!', reward: { coins: 1000 } },
    { text: 'My dearest friend,\n\nOnce in a blue moon, a hen lays a golden egg. Mine came this spring, and I have kept it warm for someone very special. That\'s you! Keep it cozy.\n\nAll my love,\nHenrietta', reward: { deco: 'golden_egg_nest' } },
  ],
  penny: [
    { text: 'OINK!\n\nI found extra truffles today, and you\'re my favorite person to share with. Well, second favorite. First is me. Hehe!\n\nPenny', reward: { items: { truffle: 3 }, coins: 150 } },
    { text: 'Dear bestie,\n\nI built you a MUD SPA! It has flowers and a rubber duck and everything. Mud is excellent for the skin. Trust me.\n\nPenny', reward: { deco: 'mud_spa' } },
    { text: 'Dear bestie,\n\nI made you a pizza! Then I ate it. So I made you another one and wrapped it really fast. Here!\n\nOink,\nPenny', reward: { items: { pizza: 2, ice_cream: 3 } } },
    { text: 'Dear bestie,\n\nI\'ve been saving my snack money for you. It took a lot of willpower. Like, SO much.\n\nPenny', reward: { coins: 1000 } },
    { text: 'To my best friend in the whole world,\n\nI built you a real brick pizza oven! Now we can have pizza parties forever and ever. You bring the toppings, I bring the appetite.\n\nLove,\nPenny', reward: { deco: 'pizza_oven' } },
  ],
  rosie: [
    { text: 'Hi hi!\n\nI grew too many carrots (is that possible??) so here are some for you! Don\'t eat them all at once. Or do! I always do.\n\nRosie', reward: { items: { carrot: 8 }, coins: 150 } },
    { text: 'Hi friend!\n\nI made you a carrot lamp so your farm glows orange at night like a happy carrot. It\'s my best invention yet!\n\n*binky*\nRosie', reward: { deco: 'carrot_lamp' } },
    { text: 'Hi hi!\n\nI baked carrot cake! Grandma Fern helped with the frosting. And the cake part. Mostly she did all of it. But I watched!\n\nRosie', reward: { items: { carrot_cake: 2, lavender: 4 } } },
    { text: 'Dear friend,\n\nI found a whole pouch of shiny coins in the clover patch. Finders keepers, then sharers sharers!\n\nRosie', reward: { coins: 1000 } },
    { text: 'To my best friend,\n\nI planted roses over an arch so that every time you walk under it you get a flower hug. I know you will look after them.\n\nLove you to the moon and back,\nRosie', reward: { deco: 'rose_arbor' } },
  ],
  grandma_fern: [
    { text: 'Dearie,\n\nI knitted you some things to keep warm. Don\'t argue. Grandma knows best.\n\nLove,\nGrandma Fern', reward: { items: { yarn: 4, wool: 3 }, coins: 150 } },
    { text: 'Dearie,\n\nHere\'s my old knitting basket. My paws aren\'t as quick as they used to be, and it deserves someone who\'ll fill it with cozy things.\n\nGrandma Fern', reward: { deco: 'knitting_basket' } },
    { text: 'Dearie,\n\nHere are some honey cookies and tea for chilly evenings. Remember to rest, dear. You work too hard.\n\nGrandma Fern', reward: { items: { honey_cookies: 3, lavender_tea: 3 } } },
    { text: 'Dearie,\n\nI\'ve been saving a little something under my mattress for a rainy day. I\'ve decided you are my rainy day. Spend it on something nice.\n\nGrandma Fern', reward: { coins: 1000 } },
    { text: 'My darling dearie,\n\nThese quilts took me all winter. Each square is a memory of Meadowbrook, and the last one is you. Hang them where the sun can find them.\n\nAll my love,\nGrandma Fern', reward: { deco: 'quilt_line' } },
  ],
  mama_marigold: [
    { text: 'Hello sweet pea!\n\nI made too much jam again. Here, take some before it takes over my kitchen!\n\nHugs,\nMama Marigold', reward: { items: { strawberry_jam: 3, honey: 3 }, coins: 150 } },
    { text: 'Sweet pea,\n\nHere\'s a little honey shelf for your farm. A home isn\'t a home without a jar of honey close by!\n\nMama Marigold', reward: { deco: 'honey_shelf' } },
    { text: 'Hello dumpling!\n\nI caught some lovely salmon at the river. Grill it with lemon and butter, just like Mama taught you!\n\nMama Marigold', reward: { items: { salmon: 2, berry_parfait: 2 } } },
    { text: 'Sweet pea,\n\nI sold my marigolds at the market and made a little extra. Mama wants you to have it. No arguments!\n\nBig bear hugs,\nMama Marigold', reward: { coins: 1000 } },
    { text: 'My dearest sweet pea,\n\nThere\'s an old honey tree at the edge of my garden where I used to play as a cub. I\'ve had a cutting of it growing all year, just for you.\n\nAll my love, forever,\nMama Marigold', reward: { deco: 'honey_tree' } },
  ],
};

const keepsake = (id: string, name: string, who: string, hearts: number, charm: number, w = 1, h = 1): DecoDef => ({
  id,
  name,
  category: 'garden',
  level: 1,
  cost: 0,
  charm,
  w,
  h,
  set: 'friends',
  reward: `A gift from ${who} at ${hearts} hearts`,
});

/** Keepsakes villagers mail you (never sold in the shop). */
export const FRIEND_DECORATIONS: DecoDef[] = [
  keepsake('owl_clock', 'Owl Grandfather Clock', 'Mayor Maple', 4, 8),
  keepsake('mayor_gazebo', "Mayor's Gazebo", 'Mayor Maple', 10, 24, 2, 2),
  keepsake('bread_cart', 'Bakery Bread Cart', 'Henrietta', 4, 8),
  keepsake('golden_egg_nest', 'Golden Egg Nest', 'Henrietta', 10, 18),
  keepsake('mud_spa', 'Piggy Mud Spa', 'Penny', 4, 8),
  keepsake('pizza_oven', 'Brick Pizza Oven', 'Penny', 10, 18),
  keepsake('carrot_lamp', 'Carrot Lamp', 'Rosie', 4, 8),
  keepsake('rose_arbor', 'Rose Arbor', 'Rosie', 10, 18),
  keepsake('knitting_basket', 'Knitting Basket', 'Grandma Fern', 4, 8),
  keepsake('quilt_line', 'Quilt Clothesline', 'Grandma Fern', 10, 20, 2, 1),
  keepsake('honey_shelf', 'Honey Pot Shelf', 'Mama Marigold', 4, 8),
  keepsake('honey_tree', 'Honey Tree', 'Mama Marigold', 10, 18),
];

/** A line about the weather, if they have something to say about it. */
export const WEATHER_CHAT: Partial<Record<Weather, string>> = {
  rain: 'What a soggy day! Your crops must be drinking it all up.',
  storm: 'Did you hear that thunder?! Let\'s stay cozy and dry today.',
  snow: 'Snow day! Perfect weather for something warm from the oven.',
  windy: 'Hold on to your hat! The trees are dropping fruit all over town.',
  rainbow: 'Did you see the rainbow?! They say it brings luck to every harvest!',
};

export function giftTaste(friend: FriendDef, item: string, category: string | undefined): GiftTaste {
  if (friend.loves.includes(item)) return 'love';
  if (category && friend.likes.includes(category)) return 'like';
  return 'meh';
}

export function friendByName(name: string): FriendDef | undefined {
  return FRIEND_LIST.find((f) => f.name === name);
}
