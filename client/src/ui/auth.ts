import { LOCAL, api, setToken, type MePayload } from '../api';
import { pickBackup } from './backup';
import { DECORATION_LIST, type FarmSnapshot } from '@farm/shared';
import { artURL, hasArt, iconURL } from '../art';
import { featuredEvent } from '../events';
import { h } from '../util';

/** Cute farm friends wandering across the title screen. */
function titleScenery(): HTMLElement[] {
  const out: HTMLElement[] = [];
  const parade = h('div', { class: 'parade' });
  const walkers = ['animal:chicken', 'animal:sheep', 'animal:cow', 'animal:pig', 'animal:rabbit', 'animal:duck', 'animal:goat'];
  walkers.forEach((key, i) => {
    if (!hasArt(key)) return;
    // The walker moves right; the animal inside is mirrored to face that way.
    const walker = h('span', { class: 'walker' }, h('img', { src: artURL(key), alt: '' }));
    walker.style.animationDuration = `${26 + (i % 3) * 4}s`;
    walker.style.animationDelay = `${-i * 4.2}s`;
    parade.append(walker);
  });
  out.push(parade);
  const decos: [string, string, string, string][] = [
    ['deco:cherry_blossom', '4%', '8%', '150px'],
    ['building:mill', '78%', '4%', '170px'],
    ['deco:sunflower_row', '8%', '62%', '120px'],
    ['deco:hot_air_balloon', '72%', '52%', '120px'],
    ['tree:apple_tree:ready', '86%', '60%', '110px'],
    ['deco:scarecrow', '16%', '40%', '90px'],
  ];
  // Dress the title screen for whatever festival is on.
  const feature = featuredEvent(Date.now());
  if (feature) {
    const spots: [string, string, string][] = [
      ['22%', '74%', '90px'],
      ['66%', '24%', '80px'],
      ['2%', '36%', '140px'],
      ['88%', '30%', '110px'],
      ['40%', '4%', '80px'],
    ];
    const festive = DECORATION_LIST.filter((d) => d.event === feature.event).slice(0, spots.length);
    festive.forEach((d, i) => decos.push([`deco:${d.id}`, ...spots[i]]));
  }
  decos.forEach(([key, left, top, size], i) => {
    if (!hasArt(key)) return;
    const img = h('img', { class: 'title-deco', src: artURL(key), alt: '' });
    Object.assign(img.style, { left, top, width: size, animationDelay: `${-i * 0.7}s` });
    out.push(img);
  });
  return out;
}

/** Shows the login/register screen and resolves once the player is signed in. */
export function showAuth(invite?: FarmSnapshot | null): Promise<MePayload> {
  return new Promise((resolve) => {
    let mode: 'login' | 'register' = 'register';
    const user = h('input', { class: 'field', placeholder: 'Farmer name', autocomplete: 'username', maxlength: 16 });
    const pass = h('input', {
      class: 'field',
      placeholder: 'Password',
      type: 'password',
      autocomplete: 'new-password',
    });
    const error = h('div', { class: 'auth-error' });
    const submit = h('button', { class: 'btn green big', type: 'submit' }, 'Start my farm 🌱');
    const tabReg = h('button', { class: 'btn tab active', type: 'button' }, 'New farmer');
    const tabLogin = h('button', { class: 'btn tab', type: 'button' }, 'Welcome back');

    const setMode = (m: typeof mode) => {
      mode = m;
      tabReg.classList.toggle('active', m === 'register');
      tabLogin.classList.toggle('active', m === 'login');
      submit.textContent = m === 'register' ? 'Start my farm 🌱' : 'Back to the farm 🚜';
      pass.autocomplete = m === 'register' ? 'new-password' : 'current-password';
      error.textContent = '';
    };
    tabReg.onclick = () => setMode('register');
    tabLogin.onclick = () => setMode('login');

    // The browser-only build keeps the farm on this device: just a name, no password.
    const restore = h(
      'button',
      {
        class: 'btn ghost small',
        type: 'button',
        onclick: () =>
          pickBackup()
            .then(() => location.reload())
            .catch((err) => (error.textContent = (err as Error).message)),
      },
      '📂 I have a backup',
    );
    if (LOCAL) user.placeholder = 'Your name';
    const form = h(
      'form',
      { class: 'auth-card' },
      h('img', { class: 'auth-logo', src: iconURL('sunflower'), alt: '' }),
      h('h1', null, 'Meadowbrook Farm'),
      h('p', null, LOCAL ? 'Grow crops, raise animals, decorate, and visit the villagers. Your farm is saved on this device.' : 'Grow crops, raise animals, decorate, and visit your neighbors.'),
      invite ? h('div', { class: 'auth-invite' }, `💌 ${invite.by.replace('_', ' ')} invited you to visit ${invite.name}! Start a farm of your own and we'll take you straight there.`) : null,
      LOCAL ? null : h('div', { class: 'auth-tabs' }, tabReg, tabLogin),
      user,
      LOCAL ? null : pass,
      error,
      submit,
      LOCAL ? restore : null,
    );
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submit.disabled = true;
      error.textContent = '';
      try {
        const res =
          mode === 'register' ? await api.register(user.value.trim(), pass.value) : await api.login(user.value.trim(), pass.value);
        setToken(res.token);
        screen.remove();
        resolve(res);
      } catch (err) {
        error.textContent = (err as Error).message;
      } finally {
        submit.disabled = false;
      }
    });

    const screen = h('div', { class: 'auth' }, ...titleScenery(), form);
    document.body.append(screen);
    user.focus();
  });
}
