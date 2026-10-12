// Every client feature module. Add one import + one call per feature.
import * as nature from './nature';
import type { FeatureContext } from './registry';

export function initFeatures(ctx: FeatureContext): void {
  nature.init(ctx);
}
