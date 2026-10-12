// "Add to home screen" for phones: a button in the Farm Menu when the browser
// offers to install the game, or a how-to note on iPhones and iPads (Safari
// has no install prompt). Nothing shows once the game runs from the home screen.

import { h } from '../util';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}

let offer: InstallPrompt | null = null;
const rows = new Set<() => void>();
const refresh = () => rows.forEach((fn) => fn());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  offer = e as InstallPrompt;
  refresh();
});
window.addEventListener('appinstalled', () => {
  offer = null;
  refresh();
});

const installed = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
const apple = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function installRow(): HTMLElement {
  const row = h('div', { class: 'drawer-install' });
  const render = () => {
    if (installed()) row.replaceChildren();
    else if (offer)
      row.replaceChildren(
        h(
          'button',
          {
            class: 'btn mint',
            onclick: async () => {
              const o = offer;
              offer = null;
              await o?.prompt();
              refresh();
            },
          },
          '📲 Add to home screen',
        ),
      );
    else if (apple()) row.replaceChildren(h('div', { class: 'muted small center' }, 'Play full-screen: tap Share, then “Add to Home Screen”.'));
    else row.replaceChildren();
    row.style.display = row.childElementCount ? '' : 'none';
  };
  rows.add(render);
  render();
  return row;
}
