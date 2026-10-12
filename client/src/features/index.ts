// Every client feature module. Add one import + one call per feature.
import * as blooms from './blooms';
import * as fair from './fair';
import * as friends from './friends';
import * as kitties from './kitties';
import * as market from './market';
import * as nature from './nature';
import type { FeatureContext } from './registry';
import * as town from './town';
import * as mastery from './mastery';
import * as collections from './collections';
import * as lonely from './lonely';
import * as water from './water';
import * as nursery from './nursery';
import * as weather from './weather';

export function initFeatures(ctx: FeatureContext): void {
  nature.init(ctx);
  kitties.init(ctx);
  weather.init(ctx);
  friends.init(ctx);
  market.init(ctx);
  town.init(ctx);
  blooms.init(ctx);
  fair.init(ctx);
  mastery.init(ctx);
  collections.init(ctx);
  lonely.init(ctx);
  water.init(ctx);
  nursery.init(ctx);
}
