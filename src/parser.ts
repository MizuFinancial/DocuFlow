import { Action, ActionType } from './types.js';

export function parseLine(line: string): Action | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  // Split by whitespace but respect quotes
  const parts = splitWithQuotes(trimmed);
  // parts is guaranteed to have at least one element if trimmed is not empty

  const command = parts[0].toLowerCase();
  const params = parts.slice(1);

  let type: ActionType | undefined;

  switch (command) {
    case 'config':
      if (params[0] === 'viewport') type = ActionType.CONFIG_VIEWPORT;
      else if (params[0] === 'device') type = ActionType.CONFIG_DEVICE;
      else if (params[0] === 'theme') type = ActionType.CONFIG_THEME;
      // Remove the sub-command from params for cleaner handling later
      if (type) params.shift();
      break;
    case 'goto':
      type = ActionType.GOTO;
      break;
    case 'reload':
      type = ActionType.RELOAD;
      break;
    case 'goback':
      type = ActionType.GO_BACK;
      break;
    case 'click':
      type = ActionType.CLICK;
      break;
    case 'fill':
      type = ActionType.FILL;
      break;
    case 'type':
      type = ActionType.TYPE;
      break;
    case 'press':
      type = ActionType.PRESS;
      break;
    case 'hover':
      type = ActionType.HOVER;
      break;
    case 'check':
      type = ActionType.CHECK;
      break;
    case 'wait':
      if (params[0] === 'time') type = ActionType.WAIT_TIME;
      else if (params[0] === 'selector') type = ActionType.WAIT_SELECTOR;
      else if (params[0] === 'url') type = ActionType.WAIT_URL;
      if (type) params.shift();
      break;
    case 'snapshot':
      if (params[0] === 'element') {
        type = ActionType.SNAPSHOT_ELEMENT;
        params.shift();
      } else {
        type = ActionType.SNAPSHOT;
      }
      break;
    case 'record':
      if (params[0] === 'start') type = ActionType.RECORD_START;
      else if (params[0] === 'stop') type = ActionType.RECORD_STOP;
      if (type) params.shift();
      break;
  }

  if (!type) {
    console.warn(`Unknown command: ${command}`);
    return null;
  }

  return {
    type,
    params,
    originalLine: line,
  };
}

function splitWithQuotes(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === ' ' && !inQuote) {
      if (current) {
        result.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current) {
    result.push(current);
  }
  return result;
}

export function parseScript(script: string): Action[] {
  return script
    .split('\n')
    .map(parseLine)
    .filter((a): a is Action => a !== null);
}
