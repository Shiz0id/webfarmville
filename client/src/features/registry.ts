// Client half of the feature plug-in system (see shared/src/logic/features.ts).
// A feature's client module exports `init(ctx)`; from there it can add HUD
// buttons, listen to store events and draw into the farm scene.

import type Phaser from 'phaser';
import type { FarmScene } from '../scenes/FarmScene';
import type { Store } from '../store';

export interface FeatureContext {
  store: Store;
  game: Phaser.Game;
  /** The farm scene; only valid once `onScene` has fired. */
  scene: () => FarmScene;
  /** Run `fn` with the farm scene once it has been created (immediately if it already has). */
  onScene: (fn: (scene: FarmScene) => void) => void;
}

export interface HudButton {
  id: string;
  em: string;
  label: string;
  /** 'toolbar' sits along the bottom; 'corner' is a round button at the top right. */
  where: 'toolbar' | 'corner';
  onClick: () => void;
  /** A number to show as a red badge (0 hides it). Polled about once a second. */
  badge?: () => number;
  /** Gently pulse to draw the eye. */
  pulse?: () => boolean;
  /** Toolbar buttons are hidden while visiting anyway; corner ones show unless this is true. */
  hideWhileVisiting?: boolean;
}

export const HUD_BUTTONS: HudButton[] = [];

export function addHudButton(button: HudButton): void {
  if (!HUD_BUTTONS.some((b) => b.id === button.id)) HUD_BUTTONS.push(button);
}

/** Extra pills for the top-left stats bar (e.g. the weather). */
export const HUD_PILLS: HTMLElement[] = [];

export function addHudPill(el: HTMLElement): void {
  if (!HUD_PILLS.includes(el)) HUD_PILLS.push(el);
}
