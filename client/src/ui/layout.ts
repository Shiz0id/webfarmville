// Picks the interface layout for the screen: 'phone' (a dock, a farm menu and
// bottom-sheet panels), 'tablet' (big touch targets with labels) or 'desktop'.
// It sets body classes (layout-*, orient-*, touch) for the stylesheet and
// tells listeners when the layout changes (rotating a phone, resizing).

export type Layout = 'phone' | 'tablet' | 'desktop';

const listeners: ((l: Layout) => void)[] = [];
let current: Layout | null = null;

export function isTouch(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function pick(): Layout {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const short = Math.min(w, h);
  // Phones are short on one side (portrait width or landscape height).
  if (short < 560) return 'phone';
  if (isTouch() && short < 1100) return 'tablet';
  return 'desktop';
}

export function layout(): Layout {
  return current ?? pick();
}

export function onLayout(fn: (l: Layout) => void): void {
  listeners.push(fn);
}

function apply(): void {
  const l = pick();
  const b = document.body.classList;
  b.toggle('layout-phone', l === 'phone');
  b.toggle('layout-tablet', l === 'tablet');
  b.toggle('layout-desktop', l === 'desktop');
  b.toggle('orient-landscape', window.innerWidth > window.innerHeight);
  b.toggle('orient-portrait', window.innerWidth <= window.innerHeight);
  b.toggle('touch', isTouch());
  if (l === current) return;
  current = l;
  for (const fn of listeners) fn(l);
}

export function setupLayout(): void {
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', () => setTimeout(apply, 120));
}

/** Hints are written for a mouse; on touch screens reword them for fingers. */
export function forFingers(text: string): string {
  if (!isTouch()) return text;
  return text
    .replace(/\bClick or drag\b/g, 'Tap or swipe')
    .replace(/\bClick\b/g, 'Tap')
    .replace(/\bclick\b/g, 'tap')
    .replace(/\bClicking\b/g, 'Tapping')
    .replace(/ · (R to flip|Esc to stop|right-click or Esc to stop)/g, '');
}
