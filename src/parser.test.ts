import { describe, it, expect } from 'vitest';
import { parseLine, parseScript } from './parser.js';
import { ActionType } from './types.js';

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
        originalLine: 'config viewport 1280x720'
      });
      expect(parseLine('config device iPhone 13')).toEqual({
        type: ActionType.CONFIG_DEVICE,
        params: ['iPhone', '13'],
        originalLine: 'config device iPhone 13'
      });
      expect(parseLine('config theme dark')).toEqual({
        type: ActionType.CONFIG_THEME,
        params: ['dark'],
        originalLine: 'config theme dark'
      });
    });

    it('should parse navigation commands', () => {
      expect(parseLine('goto https://example.com')).toEqual({
        type: ActionType.GOTO,
        params: ['https://example.com'],
        originalLine: 'goto https://example.com'
      });
      expect(parseLine('reload')).toEqual({
        type: ActionType.RELOAD,
        params: [],
        originalLine: 'reload'
      });
      expect(parseLine('goback')).toEqual({
        type: ActionType.GO_BACK,
        params: [],
        originalLine: 'goback'
      });
    });

    it('should parse interaction commands', () => {
      expect(parseLine('click #btn')).toEqual({
        type: ActionType.CLICK,
        params: ['#btn'],
        originalLine: 'click #btn'
      });
      expect(parseLine('fill #input "hello world"')).toEqual({
        type: ActionType.FILL,
        params: ['#input', 'hello world'],
        originalLine: 'fill #input "hello world"'
      });
      expect(parseLine('type "text"')).toEqual({
        type: ActionType.TYPE,
        params: ['text'],
        originalLine: 'type "text"'
      });
      expect(parseLine('press Enter')).toEqual({
        type: ActionType.PRESS,
        params: ['Enter'],
        originalLine: 'press Enter'
      });
      expect(parseLine('hover .menu')).toEqual({
        type: ActionType.HOVER,
        params: ['.menu'],
        originalLine: 'hover .menu'
      });
      expect(parseLine('check #cb')).toEqual({
        type: ActionType.CHECK,
        params: ['#cb'],
        originalLine: 'check #cb'
      });
    });

    it('should parse wait commands', () => {
      expect(parseLine('wait time 1000')).toEqual({
        type: ActionType.WAIT_TIME,
        params: ['1000'],
        originalLine: 'wait time 1000'
      });
      expect(parseLine('wait selector #modal')).toEqual({
        type: ActionType.WAIT_SELECTOR,
        params: ['#modal'],
        originalLine: 'wait selector #modal'
      });
      expect(parseLine('wait url /dashboard')).toEqual({
        type: ActionType.WAIT_URL,
        params: ['/dashboard'],
        originalLine: 'wait url /dashboard'
      });
    });

    it('should parse snapshot commands', () => {
      expect(parseLine('snapshot screen.png')).toEqual({
        type: ActionType.SNAPSHOT,
        params: ['screen.png'],
        originalLine: 'snapshot screen.png'
      });
      expect(parseLine('snapshot element #hero hero.png')).toEqual({
        type: ActionType.SNAPSHOT_ELEMENT,
        params: ['#hero', 'hero.png'],
        originalLine: 'snapshot element #hero hero.png'
      });
    });

    it('should parse record commands', () => {
      expect(parseLine('record start')).toEqual({
        type: ActionType.RECORD_START,
        params: [],
        originalLine: 'record start'
      });
      expect(parseLine('record stop video.webm')).toEqual({
        type: ActionType.RECORD_STOP,
        params: ['video.webm'],
        originalLine: 'record stop video.webm'
      });
    });

    it('should handle unknown commands gracefully', () => {
        // We expect it to log a warning and return null
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(parseLine('unknown command')).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('Unknown command: unknown');
        consoleSpy.mockRestore();
    });
    
    it('should handle partial commands gracefully', () => {
         // wait without type
         const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
         expect(parseLine('wait')).toBeNull(); // wait without params falls through switch but 'type' remains undefined?
         // Actually in switch case 'wait': params[0] check might fail or type stays undefined
         // Let's check logic: if params[0] is undefined, type is undefined.
         // Then logs unknown command 'wait'.
         expect(consoleSpy).toHaveBeenCalledWith('Unknown command: wait');
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
          // Current logic: loops to end. If inQuote is true at end, it just pushes buffer.
          const line = 'fill #id "foo bar';
          const result = parseLine(line);
          // 'foo bar' should be captured
          expect(result?.params).toEqual(['#id', 'foo bar']);
      });
  });
});
