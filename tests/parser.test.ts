import { describe, it, expect, vi } from 'vitest';
import { parseLine, parseScript } from '../src/parser.ts';
import { ActionType } from '../src/types.ts';

describe('Parser', () => {
  describe('parseLine', () => {
    it('should ignore empty lines and comments', () => {
      expect(parseLine('')).toBeNull();
      expect(parseLine('   ')).toBeNull();
      expect(parseLine('# comment')).toBeNull();
      expect(parseLine('  # indented comment')).toBeNull();
    });

    it('should parse config commands', () => {
      expect(parseLine('config viewport 1280x720')).toEqual({
        type: ActionType.CONFIG_VIEWPORT,
        params: ['1280x720'],
        originalLine: 'config viewport 1280x720',
      });
      expect(parseLine('config device iPhone 13')).toEqual({
        type: ActionType.CONFIG_DEVICE,
        params: ['iPhone', '13'],
        originalLine: 'config device iPhone 13',
      });
      expect(parseLine('config theme dark')).toEqual({
        type: ActionType.CONFIG_THEME,
        params: ['dark'],
        originalLine: 'config theme dark',
      });
    });

    it('should ignore unknown config commands', () => {
      // Should fall through and log unknown command 'config' or similar?
      // Actually the code sets `type` only if match. If not match, `type` is undefined.
      // Then `if (type) params.shift()`.
      // Then `break`.
      // Then `if (!type)` logs warning.
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(parseLine('config unknown')).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Unknown command: config');
    });

    it('should parse navigation commands', () => {
      expect(parseLine('goto https://example.com')).toEqual({
        type: ActionType.GOTO,
        params: ['https://example.com'],
        originalLine: 'goto https://example.com',
      });
      expect(parseLine('reload')).toEqual({
        type: ActionType.RELOAD,
        params: [],
        originalLine: 'reload',
      });
      expect(parseLine('goback')).toEqual({
        type: ActionType.GO_BACK,
        params: [],
        originalLine: 'goback',
      });
    });

    it('should parse interaction commands', () => {
      expect(parseLine('click #btn')).toEqual({
        type: ActionType.CLICK,
        params: ['#btn'],
        originalLine: 'click #btn',
      });
      expect(parseLine('fill #input "hello world"')).toEqual({
        type: ActionType.FILL,
        params: ['#input', 'hello world'],
        originalLine: 'fill #input "hello world"',
      });
      expect(parseLine('type "text"')).toEqual({
        type: ActionType.TYPE,
        params: ['text'],
        originalLine: 'type "text"',
      });
      expect(parseLine('press Enter')).toEqual({
        type: ActionType.PRESS,
        params: ['Enter'],
        originalLine: 'press Enter',
      });
      expect(parseLine('hover .menu')).toEqual({
        type: ActionType.HOVER,
        params: ['.menu'],
        originalLine: 'hover .menu',
      });
      expect(parseLine('check #cb')).toEqual({
        type: ActionType.CHECK,
        params: ['#cb'],
        originalLine: 'check #cb',
      });
    });

    it('should parse wait commands', () => {
      expect(parseLine('wait time 1000')).toEqual({
        type: ActionType.WAIT_TIME,
        params: ['1000'],
        originalLine: 'wait time 1000',
      });
      expect(parseLine('wait selector #modal')).toEqual({
        type: ActionType.WAIT_SELECTOR,
        params: ['#modal'],
        originalLine: 'wait selector #modal',
      });
      expect(parseLine('wait url /dashboard')).toEqual({
        type: ActionType.WAIT_URL,
        params: ['/dashboard'],
        originalLine: 'wait url /dashboard',
      });
    });

    it('should ignore unknown wait commands', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(parseLine('wait unknown')).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Unknown command: wait');
    });

    it('should parse snapshot commands', () => {
      expect(parseLine('snapshot screen.png')).toEqual({
        type: ActionType.SNAPSHOT,
        params: ['screen.png'],
        originalLine: 'snapshot screen.png',
      });
      expect(parseLine('snapshot element #hero hero.png')).toEqual({
        type: ActionType.SNAPSHOT_ELEMENT,
        params: ['#hero', 'hero.png'],
        originalLine: 'snapshot element #hero hero.png',
      });
    });

    it('should parse record commands', () => {
      expect(parseLine('record start')).toEqual({
        type: ActionType.RECORD_START,
        params: [],
        originalLine: 'record start',
      });
      expect(parseLine('record stop video.webm')).toEqual({
        type: ActionType.RECORD_STOP,
        params: ['video.webm'],
        originalLine: 'record stop video.webm',
      });
    });

    it('should handle unknown commands gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(parseLine('unknown command')).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Unknown command: unknown');
      consoleSpy.mockRestore();
    });
  });

  describe('parseScript', () => {
    it('should parse a multiline script', () => {
      const script = `
        # This is a comment
        config viewport 800x600
        goto /home
      `;
      const actions = parseScript(script);
      expect(actions).toHaveLength(2);
      expect(actions[0].type).toBe(ActionType.CONFIG_VIEWPORT);
      expect(actions[1].type).toBe(ActionType.GOTO);
    });
  });

  describe('Quoted string splitting', () => {
    it('should handle spaces inside quotes', () => {
      const line = 'fill #id "foo bar baz"';
      const result = parseLine(line);
      expect(result?.params).toEqual(['#id', 'foo bar baz']);
    });

    it('should handle unclosed quotes (treat as rest of string)', () => {
      const line = 'fill #id "foo bar';
      const result = parseLine(line);
      expect(result?.params).toEqual(['#id', 'foo bar']);
    });
  });
});
