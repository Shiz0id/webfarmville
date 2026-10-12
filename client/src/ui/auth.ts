import { api, setToken, type MePayload } from '../api';
import { h } from '../util';

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

    const screen = h('div', { class: 'auth' }, form);
    document.body.append(screen);
    user.focus();
  });
}
