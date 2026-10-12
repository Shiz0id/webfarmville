// Every client feature module. Add one import + one call per feature.
import * as kitties from './kitties';
import * as nature from './nature';
import type { FeatureContext } from './registry';
import * as weather from './weather';

export function initFeatures(ctx: FeatureContext): void {
  nature.init(ctx);
  kitties.init(ctx);
  weather.init(ctx);
}
