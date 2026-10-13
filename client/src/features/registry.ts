// Client half of the feature plug-in system (see shared/src/logic/features.ts).
// A feature's client module exports `init(ctx)`; from there it can add HUD
// buttons, listen to store events and draw into the farm scene.

import type Phaser from 'phaser';
import type { BuildingObject } from '@farm/shared';
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
  /** Show the button as the active tool (toolbar buttons). */
  active?: () => boolean;
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

/** Extra tabs for the Collections panel (the 📖 button), e.g. crop mastery. */
export interface CatalogTab {
  id: string;
  label: string;
  render: (body: HTMLElement, rerender: () => void) => void;
  /** Things to claim on this tab (adds to the button's badge and opens the panel here). */
  badge?: () => number;
}

export const CATALOG_TABS: CatalogTab[] = [];

export function addCatalogTab(tab: CatalogTab): void {
  if (!CATALOG_TABS.some((t) => t.id === tab.id)) CATALOG_TABS.push(tab);
}

/** Total of every catalog tab's badge. */
export function catalogTabBadges(): number {
  return CATALOG_TABS.reduce((n, t) => n + (t.badge?.() ?? 0), 0);
}

/** Extra sections for a workshop's panel (e.g. the Feed Mill's "feed everyone" button). */
export interface BuildingSection {
  id: string;
  /** 'top' renders above the production queue, 'bottom' (the default) below the recipes. */
  where?: 'top' | 'bottom';
  /** Append to `body` if this section applies to `building`; the panel re-renders about once a second. */
  render: (body: HTMLElement, building: BuildingObject) => void;
}

export const BUILDING_SECTIONS: BuildingSection[] = [];

export function addBuildingSection(section: BuildingSection): void {
  if (!BUILDING_SECTIONS.some((s) => s.id === section.id)) BUILDING_SECTIONS.push(section);
}

/** Extra lines for the hint above the toolbar (e.g. "🚜 Driving the Tractor"); the first non-empty one wins. */
export const MODE_HINTS: (() => string | null)[] = [];

export function addModeHint(fn: () => string | null): void {
  if (!MODE_HINTS.includes(fn)) MODE_HINTS.push(fn);
}
