import type { Settings } from './settings';

export const FILTER_IDS = [2, 3, 9, 18, 19, 21] as const;

export function selectedFilters(settings: Settings): number[] {
  if (!settings.enabled) return [];
  const ids: number[] = [];
  if (settings.blockAds) ids.push(2, 9);
  if (settings.blockTrackers) ids.push(3);
  if (settings.hideCookieNotices) ids.push(18);
  if (settings.blockDistractions) ids.push(19);
  if (settings.profile === 'aggressive') ids.push(21);
  return ids;
}
