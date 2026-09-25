import { type Settings } from './shared';
export type State = { settings: Settings; cache: { count: number; bytes: number; limit: number }; origins: string[] };
export async function send<T>(type: string, extra: object = {}): Promise<T> {
  const response = await chrome.runtime.sendMessage({ type, ...extra });
  if (response?.error) throw new Error(response.error);
  return response as T;
}
