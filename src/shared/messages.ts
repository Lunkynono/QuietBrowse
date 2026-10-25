import type { Settings } from './settings';

export type AppRequest =
  | { type: 'QUIETBROWSE_STATUS'; host?: string }
  | { type: 'QUIETBROWSE_SET_ENABLED'; enabled: boolean }
  | { type: 'QUIETBROWSE_SET_SITE'; host: string; enabled: boolean };

export type AppResponse = {
  settings: Settings;
  engineState: 'loading' | 'active' | 'disabled' | 'error';
  error?: string;
};
