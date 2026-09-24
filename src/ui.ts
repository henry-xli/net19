import { type Settings } from './shared';
export type State = { settings: Settings; cache: { count: number; bytes: number; limit: number }; origins: string[] };
export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing interface element: ${id}`);
  return node as T;
}
export async function send<T>(type: string, extra: object = {}): Promise<T> {
  const response = await chrome.runtime.sendMessage({ type, ...extra });
  if (response?.error) throw new Error(response.error);
  return response as T;
}
export function announce(message: string): void { element('notice').textContent = message; }
export function action(fn: () => Promise<void>): () => void {
  return () => { void fn().catch(() => announce('Could not save that change. Please try again.')); };
}
export function bytesLabel(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(0, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export function siteGrants(origins: string[]): string[] {
  return origins.filter(p => !/^https?:\/\/(?:web\.)?archive\.org\//.test(p));
}
