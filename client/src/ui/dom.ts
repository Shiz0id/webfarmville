import { bus, type HoverInfo } from '../bus';
import { forFingers } from './layout';
import { sfx } from '../sfx';
import { h } from '../util';

const root = () => document.getElementById('ui')!;

// --- toasts ---------------------------------------------------------------------

let toastBox: HTMLElement | null = null;

export function toast(message: string, kind: 'info' | 'error' | 'good' = 'info'): void {
  if (!toastBox) {
    toastBox = h('div', { class: 'toasts' });
    root().append(toastBox);
  }
  // Collapse duplicates so repeated errors don't pile up.
  for (const el of toastBox.children) if (el.textContent === message) el.remove();
  const el = h('div', { class: `toast ${kind}` }, message);
  toastBox.append(el);
  while (toastBox.children.length > 4) toastBox.firstElementChild?.remove();
  setTimeout(() => el.remove(), kind === 'error' ? 3200 : 2600);
}

// --- tooltip ----------------------------------------------------------------------

let tip: HTMLElement | null = null;
let tipKey = '';
let tipSize = { w: 0, h: 0 };

export function setupTooltip(): void {
  tip = h('div', { class: 'tooltip', style: { display: 'none' } });
  root().append(tip);
  bus.on('hover', (info: HoverInfo | null) => {
    if (!tip) return;
    if (!info || modalOpen()) {
      tip.style.display = 'none';
      return;
    }
    // The mouse moves far more often than the words change: only rebuild (and measure) when they do.
    const key = [info.title, ...info.lines].join('\n');
    if (key !== tipKey || tip.style.display === 'none') {
      tipKey = key;
      tip.replaceChildren(h('b', null, info.title), ...info.lines.map((l) => h('div', null, forFingers(l))));
      tip.style.display = 'block';
      tipSize = { w: tip.offsetWidth, h: tip.offsetHeight };
    }
    const x = Math.min(window.innerWidth - tipSize.w - 8, info.x + 16);
    const y = Math.max(8, info.y - tipSize.h - 12);
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  });
}

// --- modals -------------------------------------------------------------------------

interface ModalHandle {
  el: HTMLElement;
  body: HTMLElement;
  close: () => void;
  setTitle: (t: string) => void;
}

const stack: { back: HTMLElement; onClose?: () => void }[] = [];

export function modalOpen(): boolean {
  return stack.length > 0;
}

export function openModal(
  title: string,
  opts: { narrow?: boolean; onClose?: () => void; tabs?: HTMLElement; icon?: string } = {},
): ModalHandle {
  const titleEl = h('h2', null, title);
  // Long titles shrink a little on phones rather than losing their ends.
  const fit = (t: string) => {
    titleEl.classList.toggle('long', t.length > 16);
    titleEl.classList.toggle('longer', t.length > 20);
  };
  fit(title);
  const body = h('div', { class: 'modal-body' });
  const back = h('div', { class: 'modal-back' });
  const close = () => {
    const i = stack.findIndex((s) => s.back === back);
    if (i < 0) return;
    stack.splice(i, 1);
    back.remove();
    sfx.close();
    opts.onClose?.();
  };
  const modal = h(
    'div',
    { class: `modal${opts.narrow ? ' narrow' : ''}` },
    h(
      'div',
      { class: 'modal-head' },
      opts.icon ? h('img', { src: opts.icon, class: 'ico', style: { width: '34px', height: '34px' } }) : null,
      titleEl,
      h('button', { class: 'close', onclick: close, 'aria-label': 'Close' }, '✕'),
    ),
    opts.tabs ?? null,
    body,
  );
  back.append(modal);
  // Tabs that run off a phone's edge fade out there, so you know to swipe.
  const tabs = opts.tabs;
  if (tabs) {
    const edge = () => tabs.classList.toggle('more-right', tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 4);
    tabs.addEventListener('scroll', edge, { passive: true });
    requestAnimationFrame(edge);
  }
  swipeToClose(modal, modal.querySelector('.modal-head') as HTMLElement, close);
  back.addEventListener('pointerdown', (e) => {
    if (e.target === back) close();
  });
  root().append(back);
  stack.push({ back, onClose: opts.onClose });
  sfx.open();
  bus.emit('hover', null);
  return { el: modal, body, close, setTitle: (t) => {
      titleEl.textContent = t;
      fit(t);
    },
  };
}

/** On phones a panel is a bottom sheet: drag its header down to put it away. */
function swipeToClose(sheet: HTMLElement, grip: HTMLElement, close: () => void): void {
  grip.addEventListener('pointerdown', (e) => {
    if (!document.body.classList.contains('layout-phone') || (e.target as HTMLElement).closest('button')) return;
    const y0 = e.clientY;
    let dy = 0;
    grip.setPointerCapture(e.pointerId);
    sheet.style.transition = 'none';
    const move = (ev: PointerEvent) => {
      dy = Math.max(0, ev.clientY - y0);
      sheet.style.transform = `translateY(${dy}px)`;
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      if (dy > 90) {
        sheet.style.transition = 'transform 0.18s ease-in';
        sheet.style.transform = 'translateY(100%)';
        setTimeout(close, 170);
      } else {
        sheet.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        sheet.style.transform = '';
      }
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  });
}

export function closeAllModals(): void {
  while (stack.length) {
    const s = stack.pop()!;
    s.back.remove();
    s.onClose?.();
  }
}

// Every button gives a soft blip (the panel sounds cover opening and closing).
document.addEventListener('pointerdown', (e) => {
  const b = (e.target as HTMLElement).closest?.('button, .card:not(.locked), .chip');
  if (b && !(b as HTMLButtonElement).disabled && !b.classList.contains('close')) sfx.tap();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) {
    const s = stack.pop()!;
    s.back.remove();
    sfx.close();
    s.onClose?.();
    e.stopPropagation();
  }
});

// --- confetti -----------------------------------------------------------------------

export function confetti(n = 60): void {
  const colors = ['#f8a6b2', '#b77dee', '#889df0', '#f7cd67', '#e59266', '#82d5bb', '#8ac68a', '#fc736d', '#19c8b9'];
  const shapes = ['', ' dot', ' star', ' dot'];
  for (let i = 0; i < n; i++) {
    const el = h('div', {
      class: `confetti${shapes[i % shapes.length]}`,
      style: {
        left: `${Math.random() * 100}vw`,
        background: colors[i % colors.length],
        animationDuration: `${1.6 + Math.random() * 1.6}s`,
        animationDelay: `${Math.random() * 0.4}s`,
      },
    });
    root().append(el);
    setTimeout(() => el.remove(), 3800);
  }
}

// A press in progress: re-rendering under a finger swaps the button out and the tap is lost.
let held = false;
document.addEventListener('pointerdown', () => (held = true), true);
for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, () => (held = false), true);

/** Is it a bad moment to rebuild this panel (a press in progress, or a field or picker in use)? */
export function interacting(root: HTMLElement): boolean {
  const a = document.activeElement;
  return held || (!!a && root.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA'));
}
