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
    // Default visit behavior
    vi.mocked(visit).mockImplementation((tree: any, type, callback: any) => {
      if (tree.children) {
        tree.children.forEach((child: any, index: number) => {
          if (child.type === 'code') {
            callback(child, index, tree);
          }
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
    // Should NOT write file if no blocks found?
    // The code says: `if (flowBlocks.length === 0) return;`
    // So yes, no write.
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should process a file, remove block, inject assets, and write to done file', async () => {
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

    // Check output filename
    const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
    expect(writeCall[0]).toBe('test-done.md');

    const writtenContent = writeCall[1] as string;

    // Check frontmatter
    expect(writtenContent).toContain('---');
    expect(writtenContent).toContain('title: test');
    expect(writtenContent).toContain('generator: docuflow');

    // Check image inserted
    expect(writtenContent).toContain('![Snapshot](test.png)');

    // Check code block REMOVED
    expect(writtenContent).not.toContain('```flow');
  });

  it('should replace existing video (html node) with image and remove block', async () => {
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

    // Image inserted
    expect(writtenContent).toContain('![Snapshot](new.png)');
    // Old video removed/replaced?
    // Wait, the logic replaces the *code block* with the asset.
    // What about the existing video?
    // The previous logic was "find next node and replace it".
    // The new logic is "remove code block and insert asset".
    // BUT what happens to the existing video node that was manually there?
    // In the new workflow, the user inputs a file with CODE BLOCKS.
    // The existing "old.webm" might be from a previous manual edit?
    // If the input file has `<video src="old.webm">`, it's just content.
    // My new `processFile` logic:
    // `flowBlocks` identified.
    // Loop blocks.
    // Run runner -> get assets.
    // `injectAssets` is called.
    // `injectAssets` iterates assets.
    // It checks `nextNode`.
    // IF `nextNode` is a video, `isMatchingImage` becomes true.
    // Then `parent.children[currentIndex] = newNode`.
    // So the existing video IS replaced by the new asset (image or video).
    // AND the code block?
    // Wait, `injectAssets` modifies `parent.children`.
    // `processFile` logic:
    // `if (assets.length > 0) { ... const currentIndex = parent.children.indexOf(node); ... splice(currentIndex, 1, ...assetNodes); }`
    // This removes the CODE NODE.
    // BUT `injectAssets` logic inside `processFile` loop?
    // Wait, in my updated `src/processor.ts`:
    // ```typescript
    //   if (assets.length > 0) {
    //     injectAssets(node, parent, assets);
    //   }
    // ```
    // I KEPT `injectAssets` call!
    // But `injectAssets` logic (from previous version) was designed to insert *after* or replace *next* node.
    // It does NOT remove the code block.
    // AND in `processFile`, I added logic to REMOVE the code block:
    // ```typescript
    //     const currentIndex = parent.children.indexOf(node);
    //     if (currentIndex !== -1) {
    //         parent.children.splice(currentIndex, 1, ...assetNodes);
    //     }
    // ```
    // ERROR!
    // If I use `injectAssets` (which modifies the tree to insert/replace NEXT node) AND I use `splice` to replace CURRENT node...
    // I will have BOTH the inserted asset (from injectAssets) AND the replaced asset (from splice).
    // Duplication!

    // The requirement is "Remove all flow code block, add image/video elements".
    // "Remove flow block" -> The code block node itself goes away.
    // "Add image/video" -> Where? "In place" usually means where the code block was.
    // BUT if there was an *existing* generated image (from previous run) *after* the block?
    // If the user inputs a "clean" file (just code blocks), it's easy.
    // If the user inputs a file that was already processed? (e.g. they edited the code block but left the old image).
    // The user said "Executing after markdown rename to xxx-done.md".
    // This implies the input is the "source" (clean or with previous artifacts?)
    // Usually "source" has the code. The output has the result.
    // If I process `source.md` -> `source-done.md`.
    // `source.md` has Code. `source-done.md` has Image.
    // If I run again on `source.md`, it still has Code.
    // If I run on `source-done.md`, it has Image but NO Code. (So `flowBlocks.length === 0`).

    // So, `injectAssets` (scanning for next node to replace) is probably OBSOLETE if we are always generating a *fresh* output file from source.
    // We should assume the source contains the code block, and we replace that code block with the asset.
    // We shouldn't care about what's *after* the code block in the source, unless we suspect the user manually put an image there and we want to overwrite it?
    // But if we overwrite the code block, the "next node" (old image) would remain, resulting in [New Image] [Old Image].
    // This is bad.

    // So we MUST detect if the *next* node is an artifact and remove it too.
    // So `injectAssets` logic of "finding matching image/video next to block" is still useful, but instead of *updating* it, we should *remove* it.

    // REVISED LOGIC:
    // 1. Identify Flow Block.
    // 2. Look ahead: Is the next node a "generated asset" (Image/Video)?
    //    - If yes, mark it for removal.
    // 3. Run script -> Get New Assets.
    // 4. Replace Flow Block with New Assets.
    // 5. Remove the "old artifact" node if found.

    // This ensures `source.md` (with Code + Old Image) -> `source-done.md` (New Image).
    // And `source.md` (Clean Code) -> `source-done.md` (New Image).

    // I need to update `src/processor.ts` to remove `injectAssets` function (which inserts/updates) and instead implement "detect and consume next visual node".

    // I will read `src/processor.ts` again.

    expect(writtenContent).not.toContain('old.webm');
  });
});
