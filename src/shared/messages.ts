import type { Settings } from './settings';

export type AppRequest =
  | { type: 'QUIETBROWSE_STATUS'; tabId?: number }
  | { type: 'QUIETBROWSE_SET_ENABLED'; enabled: boolean }
  | { type: 'QUIETBROWSE_SET_SITE'; host: string; enabled: boolean }
  | { type: 'QUIETBROWSE_SAVE_SETTINGS'; settings: Settings }
  | { type: 'QUIETBROWSE_ADD_RULE'; host: string; selector: string }
  | { type: 'QUIETBROWSE_RESET_COUNTS' };

export type AppResponse = {
  settings: Settings;
  engineState: 'loading' | 'active' | 'disabled' | 'error';
  error?: string;
  counts?: { page: number | null; total: number };
};
