import { bus, type HoverInfo } from '../bus';
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

export function setupTooltip(): void {
  tip = h('div', { class: 'tooltip', style: { display: 'none' } });
  root().append(tip);
  bus.on('hover', (info: HoverInfo | null) => {
    if (!tip) return;
    if (!info || modalOpen()) {
      tip.style.display = 'none';
      return;
    }
    tip.replaceChildren(h('b', null, info.title), ...info.lines.map((l) => h('div', null, l)));
    tip.style.display = 'block';
    const w = tip.offsetWidth;
    const x = Math.min(window.innerWidth - w - 8, info.x + 16);
    const y = Math.max(8, info.y - tip.offsetHeight - 12);
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
  const body = h('div', { class: 'modal-body' });
  const back = h('div', { class: 'modal-back' });
  const close = () => {
    const i = stack.findIndex((s) => s.back === back);
    if (i < 0) return;
    stack.splice(i, 1);
    back.remove();
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
  swipeToClose(modal, modal.querySelector('.modal-head') as HTMLElement, close);
  back.addEventListener('pointerdown', (e) => {
    if (e.target === back) close();
  });
  root().append(back);
  stack.push({ back, onClose: opts.onClose });
  bus.emit('hover', null);
  return { el: modal, body, close, setTitle: (t) => (titleEl.textContent = t) };
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

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) {
    const s = stack.pop()!;
    s.back.remove();
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
