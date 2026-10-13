// Backing up a farm that lives on this device (the browser-only build): save
// it as a file, or bring one back (on a new phone, or after clearing the browser).

import { exportSave, importSave } from '../local';
import { h } from '../util';

/** Download the farm as a .json file. */
export function downloadBackup(farmName: string): void {
  const blob = new Blob([exportSave()], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `${farmName.replace(/[^\w ]+/g, '').trim() || 'farm'} backup.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Let the player pick a backup file; resolves once it's restored (then reload to play it). */
export function pickBackup(): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = h('input', { type: 'file', accept: '.json,application/json' });
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        importSave(await file.text());
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}
