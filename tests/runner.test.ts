import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Runner } from '../src/runner.ts';
import { ActionType } from '../src/types.ts';
import type { Action } from '../src/types.ts';
import * as playwright from 'playwright';
import * as fs from 'fs/promises';

// Mock fs
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

const mockLocatorObj = { screenshot: vi.fn() };
const mockVideoObj = { path: vi.fn().mockResolvedValue('/tmp/video.webm'), saveAs: vi.fn() };

const { mockPage, mockContext, mockBrowser } = vi.hoisted(() => {
  const page = {
    setViewportSize: vi.fn(),
    emulateMedia: vi.fn(),
    goto: vi.fn(),
    reload: vi.fn(),
    goBack: vi.fn(),
    click: vi.fn(),
    getByText: vi.fn(() => ({ click: vi.fn() })),
    fill: vi.fn(),
    keyboard: {
      type: vi.fn(),
      press: vi.fn(),
    },
    hover: vi.fn(),
    check: vi.fn(),
    waitForTimeout: vi.fn(),
    waitForSelector: vi.fn(),
    waitForURL: vi.fn(),
    screenshot: vi.fn(),
    locator: vi.fn(() => mockLocatorObj),
    video: vi.fn(() => mockVideoObj),
    close: vi.fn(),
  };

  const context = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn(),
    storageState: vi.fn().mockResolvedValue({ cookies: [], origins: [] }),
  };

  const browser = {
    newContext: vi.fn().mockResolvedValue(context),
    close: vi.fn(),
  };

  return { mockPage: page, mockContext: context, mockBrowser: browser };
});

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
  devices: {
    'iPhone 13': {
      viewport: { width: 390, height: 844 },
      userAgent: 'iPhone',
    },
  },
}));

describe('Runner', () => {
  let runner: Runner;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockLocatorObj.screenshot.mockClear();
    mockVideoObj.saveAs.mockClear();
    runner = new Runner();
    await runner.init();
  });

  afterEach(async () => {
    await runner.close();
  });

  it('should initialize browser, context, and page', () => {
    expect(playwright.chromium.launch).toHaveBeenCalled();
    expect(mockBrowser.newContext).toHaveBeenCalled();
    expect(mockContext.newPage).toHaveBeenCalled();
  });

  it('should run actions', async () => {
    const actions: Action[] = [
      { type: ActionType.GOTO, params: ['https://example.com'], originalLine: 'goto https://example.com' },
    ];
    await runner.run(actions, '/tmp');
    expect(mockPage.goto).toHaveBeenCalledWith('https://example.com');
  });

  it('should handle viewport config', async () => {
    await runner.run([{ type: ActionType.CONFIG_VIEWPORT, params: ['800x600'], originalLine: '' }], '/tmp');
    expect(mockPage.setViewportSize).toHaveBeenCalledWith({ width: 800, height: 600 });
  });

  it('should ignore invalid viewport config', async () => {
    await runner.run([{ type: ActionType.CONFIG_VIEWPORT, params: ['invalid'], originalLine: '' }], '/tmp');
    expect(mockPage.setViewportSize).not.toHaveBeenCalled();
  });

  it('should handle device config', async () => {
    await runner.run([{ type: ActionType.CONFIG_DEVICE, params: ['iPhone', '13'], originalLine: '' }], '/tmp');
    expect(mockContext.close).toHaveBeenCalled();
    expect(mockBrowser.newContext).toHaveBeenCalledWith(expect.objectContaining({ userAgent: 'iPhone' }));
  });

  it('should warn on unknown device', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await runner.run([{ type: ActionType.CONFIG_DEVICE, params: ['UnknownDevice'], originalLine: '' }], '/tmp');
    expect(consoleSpy).toHaveBeenCalledWith('Device UnknownDevice not found.');
  });

  it('should handle theme config', async () => {
    await runner.run([{ type: ActionType.CONFIG_THEME, params: ['dark'], originalLine: '' }], '/tmp');
    expect(mockPage.emulateMedia).toHaveBeenCalledWith({ colorScheme: 'dark' });
  });

  it('should handle navigation', async () => {
    await runner.run(
      [
        { type: ActionType.RELOAD, params: [], originalLine: '' },
        { type: ActionType.GO_BACK, params: [], originalLine: '' },
      ],
      '/tmp',
    );
    expect(mockPage.reload).toHaveBeenCalled();
    expect(mockPage.goBack).toHaveBeenCalled();
  });

  it('should handle interaction', async () => {
    await runner.run(
      [
        { type: ActionType.FILL, params: ['#input', 'val'], originalLine: '' },
        { type: ActionType.TYPE, params: ['text'], originalLine: '' },
        { type: ActionType.PRESS, params: ['Enter'], originalLine: '' },
        { type: ActionType.HOVER, params: ['#el'], originalLine: '' },
        { type: ActionType.CHECK, params: ['#cb'], originalLine: '' },
      ],
      '/tmp',
    );
    expect(mockPage.fill).toHaveBeenCalledWith('#input', 'val');
    expect(mockPage.keyboard.type).toHaveBeenCalledWith('text');
    expect(mockPage.keyboard.press).toHaveBeenCalledWith('Enter');
    expect(mockPage.hover).toHaveBeenCalledWith('#el');
    expect(mockPage.check).toHaveBeenCalledWith('#cb');
  });

  it('should handle click with fallback', async () => {
    await runner.run([{ type: ActionType.CLICK, params: ['#btn'], originalLine: '' }], '/tmp');
    expect(mockPage.click).toHaveBeenCalledWith('#btn', expect.anything());

    mockPage.click.mockRejectedValueOnce(new Error('fail'));
    await runner.run([{ type: ActionType.CLICK, params: ['Submit'], originalLine: '' }], '/tmp');
    expect(mockPage.getByText).toHaveBeenCalledWith('Submit');
  });

  it('should handle wait commands', async () => {
    await runner.run(
      [
        { type: ActionType.WAIT_TIME, params: ['100'], originalLine: '' },
        { type: ActionType.WAIT_SELECTOR, params: ['#el'], originalLine: '' },
        { type: ActionType.WAIT_URL, params: ['/url'], originalLine: '' },
      ],
      '/tmp',
    );
    expect(mockPage.waitForTimeout).toHaveBeenCalledWith(100);
    expect(mockPage.waitForSelector).toHaveBeenCalledWith('#el');
    expect(mockPage.waitForURL).toHaveBeenCalledWith('/url');
  });

  it('should handle snapshots', async () => {
    const assets = await runner.run([{ type: ActionType.SNAPSHOT, params: ['shot.png'], originalLine: '' }], '/assets');
    expect(fs.mkdir).toHaveBeenCalled();
    expect(mockPage.screenshot).toHaveBeenCalled();
    expect(assets).toHaveLength(1);
    expect(assets[0]).toEqual({ type: 'image', path: 'shot.png', alt: 'Snapshot' });
  });

  it('should handle element snapshots', async () => {
    const assets = await runner.run(
      [{ type: ActionType.SNAPSHOT_ELEMENT, params: ['#el', 'el.png'], originalLine: '' }],
      '/assets',
    );
    expect(mockPage.locator).toHaveBeenCalledWith('#el');
    expect(mockLocatorObj.screenshot).toHaveBeenCalled();
    expect(assets[0]).toEqual({ type: 'image', path: 'el.png', alt: 'Element Snapshot' });
  });

  it('should handle recording start', async () => {
    await runner.run([{ type: ActionType.RECORD_START, params: [], originalLine: '' }], '/assets');
    expect(mockContext.close).toHaveBeenCalled();
    expect(mockBrowser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({ recordVideo: { dir: '/assets/.temp_videos' } }),
    );
  });

  it('should handle recording stop', async () => {
    await runner.run([{ type: ActionType.RECORD_STOP, params: ['demo.webm'], originalLine: '' }], '/assets');

    expect(mockPage.close).toHaveBeenCalled();
    expect(mockPage.video).toHaveBeenCalled();
    expect(mockVideoObj.saveAs).toHaveBeenCalled();
    expect(mockBrowser.newContext).toHaveBeenCalled();
  });

  it('should handle recording stop when no video', async () => {
    mockPage.video.mockReturnValueOnce(null);
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await runner.run([{ type: ActionType.RECORD_STOP, params: ['demo.webm'], originalLine: '' }], '/assets');

    expect(spy).toHaveBeenCalledWith('No video recording active.');
    expect(mockPage.close).not.toHaveBeenCalled();
  });

  it('should throw if run without init', async () => {
    const r = new Runner();
    await expect(r.run([], '/')).rejects.toThrow('Runner not initialized');
  });

  it('should handle close safely if not initialized', async () => {
    const r = new Runner();
    await r.close(); // Should not throw
    expect(mockBrowser.close).not.toHaveBeenCalled();
  });
});
