import { Browser, BrowserContext, Page, chromium, devices } from 'playwright';
import { Action, ActionType, GeneratedAsset } from './types.js';
import * as path from 'path';
import * as fs from 'fs/promises';

export class Runner {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async init() {
    this.browser = await chromium.launch();
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  async run(actions: Action[], baseDir: string): Promise<GeneratedAsset[]> {
    if (!this.page) {
      throw new Error('Runner not initialized. Call init() first.');
    }

    const assets: GeneratedAsset[] = [];

    for (const action of actions) {
      const asset = await this.executeAction(action, baseDir);
      if (asset) {
        assets.push(asset);
      }
    }

    return assets;
  }

  private async executeAction(action: Action, baseDir: string): Promise<GeneratedAsset | null> {
    if (!this.page) return null;
    const { type, params } = action;

    switch (type) {
      case ActionType.CONFIG_VIEWPORT: {
        const [size] = params;
        const [width, height] = size.split('x').map(Number);
        if (!isNaN(width) && !isNaN(height)) {
          await this.page.setViewportSize({ width, height });
        }
        break;
      }
      case ActionType.CONFIG_DEVICE: {
        const deviceName = params.join(' ');
        const device = devices[deviceName];
        if (device && this.browser) {
          await this.context?.close();
          this.context = await this.browser.newContext({ ...device });
          this.page = await this.context.newPage();
        } else {
            console.warn(`Device ${deviceName} not found.`);
        }
        break;
      }
      case ActionType.CONFIG_THEME: {
        const theme = params[0] as 'light' | 'dark';
        await this.page.emulateMedia({ colorScheme: theme });
        break;
      }
      case ActionType.GOTO:
        await this.page.goto(params[0]);
        break;
      case ActionType.RELOAD:
        await this.page.reload();
        break;
      case ActionType.GO_BACK:
        await this.page.goBack();
        break;
      case ActionType.CLICK:
        try {
            await this.page.click(params[0], { timeout: 5000 });
        } catch (e) {
            await this.page.getByText(params[0]).click();
        }
        break;
      case ActionType.FILL:
        await this.page.fill(params[0], params[1]);
        break;
      case ActionType.TYPE:
        await this.page.keyboard.type(params[0]);
        break;
      case ActionType.PRESS:
        await this.page.keyboard.press(params[0]);
        break;
      case ActionType.HOVER:
        await this.page.hover(params[0]);
        break;
      case ActionType.CHECK:
        await this.page.check(params[0]);
        break;
      case ActionType.WAIT_TIME:
        await this.page.waitForTimeout(Number(params[0]));
        break;
      case ActionType.WAIT_SELECTOR:
        await this.page.waitForSelector(params[0]);
        break;
      case ActionType.WAIT_URL:
        await this.page.waitForURL(params[0]);
        break;
      case ActionType.SNAPSHOT: {
        const filename = params[0];
        const filepath = path.join(baseDir, filename);
        // Ensure dir exists
        await fs.mkdir(path.dirname(filepath), { recursive: true });
        await this.page.screenshot({ path: filepath });
        return { type: 'image', path: filename, alt: 'Snapshot' };
      }
      case ActionType.SNAPSHOT_ELEMENT: {
        const [selector, filename] = params;
        const filepath = path.join(baseDir, filename);
        await fs.mkdir(path.dirname(filepath), { recursive: true });
        await this.page.locator(selector).screenshot({ path: filepath });
        return { type: 'image', path: filename, alt: 'Element Snapshot' };
      }
      case ActionType.RECORD_START: {
        const storageState = await this.context?.storageState().catch(() => undefined);
        await this.context?.close();
        this.context = await this.browser!.newContext({
            recordVideo: { dir: path.join(baseDir, '.temp_videos') }, // Temp dir for raw videos
            storageState: storageState
        });
        this.page = await this.context.newPage();
        break;
      }
      case ActionType.RECORD_STOP: {
        const filename = params[0];
        const targetPath = path.join(baseDir, filename);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });

        const page = this.page;
        const video = page?.video();
        
        if (video) {
            // We must close the page/context to finish the video
            await page?.close();
            // wait for video to be saved?
            // "The video is guaranteed to be saved after the page is closed."
            
            // Now save to target
            await video.saveAs(targetPath);
            
            // Re-init context
             const storageState = await this.context?.storageState().catch(() => undefined);
             await this.context?.close(); // ensure old context closed
             
             this.context = await this.browser!.newContext({ storageState });
             this.page = await this.context.newPage();
             
             return { type: 'video', path: filename, alt: 'Video Recording' };
        } else {
            console.warn('No video recording active.');
        }
        break;
      }
    }
    return null;
  }
}
