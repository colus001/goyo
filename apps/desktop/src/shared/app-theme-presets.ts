import type { AppThemeId, CustomThemeSeed } from './app-theme-types';

export interface PresetThemeSeed extends CustomThemeSeed {
  id: Exclude<AppThemeId, 'custom'>;
  name: string;
}

export const APP_THEME_SEEDS: PresetThemeSeed[] = [
  {
    id: 'paper',
    name: 'Paper',
    colors: {
      accent: '#30302d',
      app: '#f7f7f5',
      panel: '#fbfaf7',
      paper: '#ffffff',
    },
  },
  {
    id: 'sage',
    name: 'Sage',
    colors: {
      accent: '#4f6f64',
      app: '#f3f6f1',
      panel: '#f8faf6',
      paper: '#fffefb',
    },
  },
  {
    id: 'clay',
    name: 'Clay',
    colors: {
      accent: '#a6534b',
      app: '#faf5f0',
      panel: '#fdf8f3',
      paper: '#fffdf9',
    },
  },
  {
    id: 'dusk',
    name: 'Dusk',
    colors: {
      accent: '#52697f',
      app: '#f3f5f7',
      panel: '#f8fafb',
      paper: '#ffffff',
    },
  },
  {
    id: 'ink',
    name: 'Ink',
    colors: {
      accent: '#c9895f',
      app: '#171512',
      panel: '#1c1a16',
      paper: '#211f1b',
    },
  },
  {
    id: 'night',
    name: 'Night',
    colors: {
      accent: '#7fa6c9',
      app: '#111821',
      panel: '#141d26',
      paper: '#18212b',
    },
  },
];
