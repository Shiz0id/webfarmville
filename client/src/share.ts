// Farm invite links: share your farm as a link, and open a friend's link as a
// visit. The farm travels inside the link (after the #, so it never reaches a
// server), so links work on the browser-only build with no accounts at all.

import { decodeFarm, encodeFarm, snapshotFarm, type FarmSnapshot } from '@farm/shared';
import { LOCAL } from './api';
import { addPal } from './local';
import type { Store } from './store';
import { openModal, toast } from './ui/dom';
import { h, timeAgo } from './util';

const PREFIX = '#farm=';

export async function inviteLink(store: Store): Promise<string> {
  const code = await encodeFarm(snapshotFarm(store.state, store.username, store.now()));
  return `${location.origin}${location.pathname}${PREFIX}${code}`;
}

/** The farm in the address bar's link, if any. The link is tidied away so a reload doesn't reopen it. */
export async function readInvite(): Promise<FarmSnapshot | null> {
  if (!location.hash.startsWith(PREFIX)) return null;
  const code = location.hash.slice(PREFIX.length);
  history.replaceState(null, '', location.pathname + location.search);
  const snap = await decodeFarm(code);
  if (!snap) toast("That farm link didn't come through in one piece. Ask for a fresh one!", 'error');
  return snap;
}

/** Take the player to a friend's farm from a link. */
export async function openInvite(store: Store, snap: FarmSnapshot): Promise<void> {
  const name = LOCAL ? addPal(snap) : null;
  if (name) {
    await store.refreshSocial();
    await store.startVisit(name);
  } else await store.viewSnapshot(snap);
  if (!store.isVisiting) return;
  const who = snap.by.replace('_', ' ');
  toast(
    name
      ? `Welcome to ${snap.name}! ${who} is in your Neighbors now. Come back any time to help out.`
      : `Welcome to ${snap.name}! This is how ${who}'s farm looked ${timeAgo(snap.at, store.now())}.`,
    'good',
  );
}

/** Share this farm: the share sheet on phones, the clipboard elsewhere, or a box to copy from. */
export async function shareInvite(store: Store): Promise<void> {
  const url = await inviteLink(store);
  const text = `Come visit ${store.state.name} in Meadowbrook Farm! 🌻`;
  const touch = document.body.classList.contains('touch');
  if (touch && navigator.share) {
    try {
      await navigator.share({ title: store.state.name, text, url });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    toast('🔗 Invite link copied! Paste it to a friend so they can come visit.', 'good');
    return;
  } catch {
    /* no clipboard: show the link instead */
  }
  const m = openModal('Invite a friend', { narrow: true });
  const field = h('textarea', { class: 'field invite-field', readonly: true, rows: 4 }, url);
  m.body.append(h('p', { class: 'muted small' }, 'Copy this link and send it to a friend:'), field);
  field.select();
}
