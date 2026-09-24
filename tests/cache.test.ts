import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ProfileCache, type LocalStorage } from '../src/cache';
import { INDEX_KEY, profileKey } from '../src/shared';
import { makePack, ORIGIN } from './fixtures';

class Memory implements LocalStorage {
  data: Record<string, unknown> = {};
  async get(keys: string | string[] | null) { return structuredClone(keys === null ? this.data : Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, this.data[k]]))); }
  async set(items: Record<string, unknown>) { Object.assign(this.data, structuredClone(items)); }
  async remove(keys: string | string[]) { for (const key of Array.isArray(keys) ? keys : [keys]) delete this.data[key]; }
}

test('100-profile LRU evicts unused entries and survives worker restart', async () => {
  const storage = new Memory(); let now = 0;
  const cache = new ProfileCache(storage, () => ++now);
  for (let n = 0; n < 100; n++) await cache.put(makePack(`https://site${n}.example`));
  await cache.touch('https://site0.example', 2019);
  await cache.put(makePack('https://new.example'));
  assert.equal((await cache.stats()).count, 100);
  assert.ok(await cache.read('https://site0.example', 2019));
  assert.equal(await cache.read('https://site1.example', 2019), null);
  assert.ok(await new ProfileCache(storage).read('https://new.example', 2019));
});
test('concurrent cache writes with equal timestamps retain 100 actual profiles', async () => {
  const storage = new Memory(); const cache = new ProfileCache(storage, () => 100);
  await Promise.all(Array.from({ length: 120 }, (_, i) => cache.put(makePack(`https://site${i}.example`))));
  assert.equal((await cache.stats()).count, 100);
  assert.equal(Object.keys(storage.data).filter(k => k.startsWith('profile:')).length, 100);
});
test('negative results expire and have their own bounded allowance', async () => {
  const storage = new Memory(); let now = 1;
  const cache = new ProfileCache(storage, () => now);
  await cache.miss(ORIGIN, 2019, 'unavailable');
  assert.equal((await cache.read(ORIGIN, 2019))?.reason, 'unavailable');
  now += 301_000; assert.equal(await cache.read(ORIGIN, 2019), null);
  for (let n = 0; n < 110; n++) { now++; await cache.miss(`https://site${n}.example`, 2019, 'missing'); }
  assert.equal(Object.keys(storage.data).filter(k => k.startsWith('profile:')).length, 100);
});
test('clearing cache cannot be undone by an older in-flight lookup', async () => {
  const storage = new Memory(); const cache = new ProfileCache(storage);
  const revision = cache.revision(); await cache.put(makePack());
  storage.data.settings = { year: 2017 };
  storage.data['profile:old:orphan'] = {};
  await cache.clear(); await cache.put(makePack(), revision);
  assert.equal(await cache.read(ORIGIN, 2019), null);
  assert.deepEqual(storage.data, { settings: { year: 2017 } });
});
test('oversized or corrupted entries never become applicable styles', async () => {
  const storage = new Memory(); const cache = new ProfileCache(storage);
  storage.data[profileKey(ORIGIN, 2019)] = { css: 'malicious', schema: 1 };
  assert.equal(await cache.read(ORIGIN, 2019), null);
  await assert.rejects(cache.put({ ...makePack(), css: 'x'.repeat(100_000) }));
  assert.equal(storage.data[INDEX_KEY], undefined);
});
