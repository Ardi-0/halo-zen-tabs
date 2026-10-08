import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readJson = name => JSON.parse(readFileSync(resolve(root, name), 'utf8'));
const theme = readJson('theme.json');
const preferences = readJson('preferences.json');

assert.equal(theme.id, 'halo-zen-tabs', 'Keep the existing Sine ID for installed users');
assert.equal(theme.name, 'Halora Tabs for Zen');
assert.deepEqual(theme.fork, ['zen']);
assert.equal(theme.readme, 'README.md');
assert.equal(theme.preferences, 'preferences.json');
assert.deepEqual(Object.keys(theme.scripts), ['halo-tabs.uc.js']);
assert.deepEqual(theme.scripts['halo-tabs.uc.js'].include, ['chrome://browser/content/browser.xhtml']);
assert.equal(preferences.find(pref => pref.property === 'uc.halo-zen-tabs.enabled')?.type, 'checkbox');

for (const name of ['halo-tabs.uc.js', 'README.md', 'LICENSE', 'icon.svg', 'PRIVACY.md']) {
  assert.ok(existsSync(resolve(root, name)), `Missing ${name}`);
}
assert.ok(!existsSync(resolve(root, 'halo-extension')), 'Firefox extension files belong in a separate repository');
console.log(`Validated ${theme.name} ${theme.version}`);
