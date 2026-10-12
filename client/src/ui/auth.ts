import { api, setToken, type MePayload } from '../api';
import { artURL, hasArt } from '../art';
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
  if (new Date().getMonth() === 9 || new URLSearchParams(location.search).get('event') === 'halloween') {
    decos.push(
      ['deco:pumpkin_pile', '22%', '74%', '90px'],
      ['deco:friendly_ghost', '66%', '24%', '70px'],
      ['deco:haunted_house', '2%', '36%', '150px'],
      ['deco:spooky_tree', '88%', '30%', '110px'],
    );
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
export function showAuth(): Promise<MePayload> {
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

    const form = h(
      'form',
      { class: 'auth-card' },
      h('div', { style: { fontSize: '54px' } }, '🌻'),
      h('h1', null, 'Meadowbrook Farm'),
      h('p', null, 'Grow crops, raise animals, decorate, and visit your neighbors.'),
      h('div', { class: 'auth-tabs' }, tabReg, tabLogin),
      user,
      pass,
      error,
      submit,
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
