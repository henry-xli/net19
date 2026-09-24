import { INDEX_KEY, MAX_CACHE_BYTES, MAX_PROFILES, MAX_PROFILE_BYTES, isStylePack, profileKey, type ProfileResult, type StylePack } from './shared';

export interface LocalStorage {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}
type Index = Record<string, { usedAt: number; bytes: number; kind: 'profile' | 'miss' }>;
type Miss = { miss: true; expiresAt: number; reason: ProfileResult['reason'] };

export class ProfileCache {
  private writes: Promise<unknown> = Promise.resolve();
  private generation = 0;
  constructor(private storage: LocalStorage, private now = Date.now) {}

  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.writes.then(fn, fn);
    this.writes = result.catch(() => undefined);
    return result;
  }

  revision(): number { return this.generation; }

  async read(origin: string, year: number): Promise<ProfileResult | null> {
    const key = profileKey(origin, year);
    const entry = (await this.storage.get(key))[key];
    if (isStylePack(entry, origin, year)) return { pack: entry, cached: true };
    const miss = entry as Miss | undefined;
    if (miss?.miss === true && miss.expiresAt > this.now()) return { reason: miss.reason, cached: true };
    return null;
  }

  touch(origin: string, year: number): Promise<void> {
    return this.serialize(async () => {
      const index = ((await this.storage.get(INDEX_KEY))[INDEX_KEY] ?? {}) as Index;
      const key = profileKey(origin, year);
      if (index[key]) { index[key].usedAt = this.now(); await this.storage.set({ [INDEX_KEY]: index }); }
    });
  }

  async put(pack: StylePack, revision = this.generation): Promise<void> {
    if (!isStylePack(pack)) throw new Error('Invalid historical profile');
    return this.save(profileKey(pack.origin, pack.targetYear), pack, 'profile', revision);
  }

  miss(origin: string, year: number, reason: ProfileResult['reason'], revision = this.generation): Promise<void> {
    const ttl = reason === 'missing' ? 6 * 60 * 60 * 1000 : 5 * 60 * 1000;
    return this.save(profileKey(origin, year), { miss: true, expiresAt: this.now() + ttl, reason }, 'miss', revision);
  }

  private save(key: string, entry: StylePack | Miss, kind: 'profile' | 'miss', revision: number): Promise<void> {
    return this.serialize(async () => {
      if (revision !== this.generation) return;
      const bytes = new TextEncoder().encode(JSON.stringify(entry)).byteLength;
      if (bytes > MAX_PROFILE_BYTES) throw new Error('Historical profile exceeds storage budget');
      const index = ((await this.storage.get(INDEX_KEY))[INDEX_KEY] ?? {}) as Index;
      index[key] = { usedAt: this.now(), bytes, kind };
      const entries = Object.entries(index).sort((a, b) => b[1].usedAt - a[1].usedAt || (a[0] === key ? -1 : b[0] === key ? 1 : 0));
      let total = 0, profiles = 0, misses = 0;
      const evict: string[] = [];
      for (const [id, item] of entries) {
        const count = item.kind === 'profile' ? ++profiles : ++misses;
        total += item.bytes;
        if (count > MAX_PROFILES || total > MAX_CACHE_BYTES) { evict.push(id); delete index[id]; }
      }
      // Remove first so the browser quota cannot block an otherwise valid replacement.
      if (evict.length) await this.storage.remove(evict);
      await this.storage.set({ [key]: entry, [INDEX_KEY]: index });
    });
  }

  clear(): Promise<void> {
    this.generation++;
    return this.serialize(async () => {
      // Recover orphan entries left if a worker stopped between storage writes.
      const all = await this.storage.get(null);
      const keys = Object.keys(all).filter(key => key.startsWith('profile:') || key === INDEX_KEY);
      if (keys.length) await this.storage.remove(keys);
    });
  }

  async stats(): Promise<{ count: number; bytes: number; limit: number }> {
    const index = ((await this.storage.get(INDEX_KEY))[INDEX_KEY] ?? {}) as Index;
    return { count: Object.values(index).filter(item => item.kind === 'profile').length,
      bytes: Object.values(index).reduce((n, item) => n + item.bytes, 0), limit: MAX_PROFILES };
  }
}
