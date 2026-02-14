export enum ActionType {
  CONFIG_VIEWPORT = 'config_viewport',
  CONFIG_DEVICE = 'config_device',
  CONFIG_THEME = 'config_theme',
  GOTO = 'goto',
  RELOAD = 'reload',
  GO_BACK = 'go_back',
  CLICK = 'click',
  FILL = 'fill',
  TYPE = 'type',
  PRESS = 'press',
  HOVER = 'hover',
  CHECK = 'check',
  WAIT_TIME = 'wait_time',
  WAIT_SELECTOR = 'wait_selector',
  WAIT_URL = 'wait_url',
  SNAPSHOT = 'snapshot',
  SNAPSHOT_ELEMENT = 'snapshot_element',
  RECORD_START = 'record_start',
  RECORD_STOP = 'record_stop'
}

export interface Action {
  type: ActionType;
  params: string[];
  originalLine: string;
}

export interface Config {
  viewport?: { width: number; height: number };
  device?: string;
  theme?: 'light' | 'dark';
}

export interface GeneratedAsset {
  type: 'image' | 'video';
  path: string; // Relative to the markdown file or asset dir
  alt?: string;
}
