import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processFile } from '../src/processor.js';
import * as fs from 'fs/promises';
import { Runner } from '../src/runner.js';
import { ActionType } from '../src/types.js';
import { visit } from 'unist-util-visit';

// Define the mock instance outside
const mockRunnerInstance = {
  init: vi.fn(),
  close: vi.fn(),
  run: vi.fn().mockResolvedValue([]),
};

// Mock the module returning a constructor function
vi.mock('../src/runner.js', () => {
  return {
    Runner: vi.fn(function () {
      return mockRunnerInstance;
    }),
  };
});

vi.mock('fs/promises');

// Mock visit to control flow blocks
vi.mock('unist-util-visit', () => ({
  visit: vi.fn((tree, type, callback) => {
    // Default implementation that does nothing, or we can use a spy
  }),
}));

describe('Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunnerInstance.run.mockResolvedValue([]);
    // Default visit behavior: traverse realistically or just simple mock
    vi.mocked(visit).mockImplementation((tree: any, type, callback: any) => {
      if (tree.children) {
        tree.children.forEach((child: any, index: number) => {
          if (child.type === 'code') {
            callback(child, index, tree);
          }
          // Simple 1-level traversal for tests
          if (child.children) {
            child.children.forEach((grandChild: any, gIndex: number) => {
              if (grandChild.type === 'code') {
                callback(grandChild, gIndex, child);
              }
            });
          }
        });
      }
    });
  });

  it('should process a file with no flow blocks', async () => {
    // @ts-ignore
    fs.readFile.mockResolvedValue('# Hello\n\nNo flow here.');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await processFile('test.md');

    expect(fs.readFile).toHaveBeenCalledWith('test.md', 'utf-8');
    expect(consoleSpy).toHaveBeenCalledWith('No flow blocks found in test.md');
    expect(Runner).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should process a file with flow blocks and inject assets', async () => {
    const content = `
# Test

\`\`\`flow
snapshot test.png
\`\`\`
`;
    // @ts-ignore
    fs.readFile.mockResolvedValue(content);
    mockRunnerInstance.run.mockResolvedValue([{ type: 'image', path: 'test.png', alt: 'Snapshot' }]);

    await processFile('test.md');

    expect(Runner).toHaveBeenCalled();
    expect(mockRunnerInstance.init).toHaveBeenCalled();
    expect(mockRunnerInstance.run).toHaveBeenCalled();
    expect(mockRunnerInstance.close).toHaveBeenCalled();

    expect(fs.writeFile).toHaveBeenCalledWith('test.md', expect.stringContaining('![Snapshot](test.png)'), 'utf-8');
  });

  it('should update existing image', async () => {
    const content = `
\`\`\`flow
snapshot new.png
\`\`\`

![Old](old.png)
`;
    // @ts-ignore
    fs.readFile.mockResolvedValue(content);
    mockRunnerInstance.run.mockResolvedValue([{ type: 'image', path: 'new.png', alt: 'Snapshot' }]);

    await processFile('test.md');

    const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
    const writtenContent = writeCall[1] as string;

    expect(writtenContent).toContain('![Snapshot](new.png)');
    expect(writtenContent).not.toContain('old.png');
  });

  it('should insert new image if none exists', async () => {
    const content = `
\`\`\`flow
snapshot test.png
\`\`\`

# Next Section
`;
    // @ts-ignore
    fs.readFile.mockResolvedValue(content);
    mockRunnerInstance.run.mockResolvedValue([{ type: 'image', path: 'test.png', alt: 'Snapshot' }]);

    await processFile('test.md');
    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    expect(writtenContent).toContain('![Snapshot](test.png)');
  });

  it('should handle video assets', async () => {
    const content = `
\`\`\`flow
record stop video.webm
\`\`\`
`;
    // @ts-ignore
    fs.readFile.mockResolvedValue(content);
    mockRunnerInstance.run.mockResolvedValue([{ type: 'video', path: 'video.webm' }]);

    await processFile('test.md');
    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    expect(writtenContent).toContain('<video src="video.webm"');
  });

  it('should replace existing video (html node)', async () => {
    const content = `
\`\`\`flow
record stop new.webm
\`\`\`

<video src="old.webm"></video>
`;
    // @ts-ignore
    fs.readFile.mockResolvedValue(content);
    mockRunnerInstance.run.mockResolvedValue([{ type: 'video', path: 'new.webm' }]);

    await processFile('test.md');
    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    expect(writtenContent).toContain('src="new.webm"');
    expect(writtenContent).not.toContain('old.webm');
  });

  it('should replace existing video (html node) with image', async () => {
    const content = `
\`\`\`flow
snapshot new.png
\`\`\`

<video src="old.webm"></video>
`;
    // @ts-ignore
    fs.readFile.mockResolvedValue(content);
    mockRunnerInstance.run.mockResolvedValue([{ type: 'image', path: 'new.png', alt: 'Snapshot' }]);

    await processFile('test.md');
    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;

    expect(writtenContent).toContain('![Snapshot](new.png)');
    expect(writtenContent).not.toContain('old.webm');
  });

  it('should replace existing video (paragraph > html node) with image', async () => {
    const content = `
\`\`\`flow
snapshot new.png
\`\`\`

<video src="old.webm"></video>
`;
    // @ts-ignore
    fs.readFile.mockResolvedValue(content);
    mockRunnerInstance.run.mockResolvedValue([{ type: 'image', path: 'new.png', alt: 'Snapshot' }]);

    await processFile('test.md');
    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;

    expect(writtenContent).toContain('![Snapshot](new.png)');
    expect(writtenContent).not.toContain('old.webm');
  });

  it('should handle detached node (nodeIndex -1)', async () => {
    const content = `
\`\`\`flow
snapshot test.png
\`\`\`
`;
    // @ts-ignore
    fs.readFile.mockResolvedValue(content);
    mockRunnerInstance.run.mockResolvedValue([{ type: 'image', path: 'test.png', alt: 'Snapshot' }]);

    // Override visit to provide a detached parent
    vi.mocked(visit).mockImplementationOnce((tree: any, type, callback: any) => {
      const fakeNode = { lang: 'flow', value: 'snapshot test.png' };
      const fakeParent = { children: [] }; // indexOf returns -1
      callback(fakeNode, 0, fakeParent);
    });

    await processFile('test.md');
    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    expect(writtenContent).not.toContain('![Snapshot](test.png)');
  });

  it('should handle non-image/non-video visual blocks gracefully', async () => {
    // Test the 'else' branch of node detection
    const content = `
\`\`\`flow
snapshot test.png
\`\`\`

Some text paragraph.
`;
    // @ts-ignore
    fs.readFile.mockResolvedValue(content);
    mockRunnerInstance.run.mockResolvedValue([{ type: 'image', path: 'test.png', alt: 'Snapshot' }]);

    await processFile('test.md');
    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    // Should insert before text
    expect(writtenContent).toContain('![Snapshot](test.png)\n\nSome text paragraph.');
  });

  it('should ignore paragraph with non-video children', async () => {
    // Should cover 'else if paragraph' where children are not video
    const content = `
\`\`\`flow
snapshot test.png
\`\`\`

Text paragraph
`;
    // @ts-ignore
    fs.readFile.mockResolvedValue(content);
    mockRunnerInstance.run.mockResolvedValue([{ type: 'image', path: 'test.png', alt: 'Snapshot' }]);

    await processFile('test.md');
    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    expect(writtenContent).toContain('![Snapshot](test.png)');
  });
});
