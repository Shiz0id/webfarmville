// Every client feature module. Add one import + one call per feature.
import * as friends from './friends';
import * as kitties from './kitties';
import * as market from './market';
import * as nature from './nature';
import type { FeatureContext } from './registry';
import * as town from './town';
import * as weather from './weather';

export function initFeatures(ctx: FeatureContext): void {
  nature.init(ctx);
  kitties.init(ctx);
  weather.init(ctx);
  friends.init(ctx);
  market.init(ctx);
  town.init(ctx);
}
