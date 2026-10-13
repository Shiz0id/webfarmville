// Friendly villagers pop up in a speech bubble to cheer the player on.
import { artURL, hasArt } from '../art';
import { giverKey } from '../art/manifest';
import { h } from '../util';

export const GIVER_EMOJI: Record<string, string> = {
  'Mayor Maple': '🦉',
  Henrietta: '🐔',
  Penny: '🐷',
  Rosie: '🐰',
  'Grandma Fern': '🦔',
};

/** Portrait element for a villager: painted art when available, emoji otherwise. */
export function portrait(name: string, size = 48): HTMLElement {
  const key = `portrait:${giverKey(name)}`;
  if (hasArt(key)) return h('img', { class: 'portrait', src: artURL(key), alt: name, style: { width: `${size}px`, height: `${size}px` } });
  return h('div', { class: 'portrait emoji', style: { width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.62}px` } }, GIVER_EMOJI[name] ?? '🧑‍🌾');
}

let current: HTMLElement | null = null;
let timer = 0;

/** Shows a villager's line; returns a function that puts it away early. */
export function villagerSay(name: string, text: string, action?: { label: string; onClick: () => void }): () => void {
  current?.remove();
  clearTimeout(timer);
  const textEl = h('div', { class: 'say-text' });
  const el = h(
    'div',
    { class: 'villager-say' },
    portrait(name, 64),
    h(
      'div',
      { class: 'say-bubble' },
      h('div', { class: 'say-name' }, name),
      textEl,
      action
        ? h(
            'button',
            {
              class: 'btn small gold',
              onclick: (e: Event) => {
                e.stopPropagation();
                close();
                action.onClick();
              },
            },
            action.label,
          )
        : null,
    ),
  );
  const close = () => {
    if (!el.isConnected || el.classList.contains('leaving')) return;
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 250);
    if (current === el) current = null;
  };
  el.addEventListener('click', close);
  document.getElementById('ui')!.append(el);
  current = el;
  // Type the text out like a villager chatting.
  // Typing speed is based on elapsed time so a busy frame can't stall it.
  const start = performance.now();
  const type = () => {
    const n = Math.min(text.length, Math.ceil((performance.now() - start) / 18));
    textEl.textContent = text.slice(0, n);
    if (n < text.length) setTimeout(type, 30);
  };
  type();
  timer = window.setTimeout(close, 9000);
  return close;
}
