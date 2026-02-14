import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import { visit } from 'unist-util-visit';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseScript } from './parser.js';
import { Runner } from './runner.js';
import { GeneratedAsset } from './types.js';

export async function processFile(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8');
  const baseDir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);
  const outputFilePath = path.join(baseDir, `${basename}-done${ext}`);

  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkStringify, { bullet: '-', listItemIndent: 'one' });

  const tree = processor.parse(content);

  // 1. Identify flow blocks
  const flowBlocks: { node: any; parent: any }[] = [];

  visit(tree, 'code', (node, index, parent) => {
    if (node.lang === 'flow' && parent) {
      flowBlocks.push({ node, parent });
    }
  });

  if (flowBlocks.length === 0) {
    console.log(`No flow blocks found in ${filePath}`);
    return;
  }

  // 2. Run blocks sequentially
  const runner = new Runner();
  await runner.init();

  try {
    for (const { node, parent } of flowBlocks) {
      const script = node.value;
      const actions = parseScript(script);

      console.log(`Executing block in ${filePath}...`);
      const assets = await runner.run(actions, baseDir);

      // Find current index (it might shift if we modify tree)
      const currentIndex = parent.children.indexOf(node);
      if (currentIndex === -1) continue; // Should not happen

      // Check next node for existing artifacts to remove
      let removeCount = 1; // Always remove the code block itself
      const nextIndex = currentIndex + 1;
      if (nextIndex < parent.children.length) {
        const nextNode = parent.children[nextIndex];
        if (isVisualNode(nextNode)) {
          removeCount++; // Remove the artifact too
        }
      }

      if (assets.length > 0) {
        // Create nodes for new assets
        const assetNodes = assets.map(createAssetNode);
        // Replace code block (and potential artifact) with new assets
        parent.children.splice(currentIndex, removeCount, ...assetNodes);
      } else {
        // If no assets generated, just remove the block (and artifact)
        parent.children.splice(currentIndex, removeCount);
      }
    }
  } finally {
    await runner.close();
  }

  // 3. Add Metadata (Frontmatter)
  let hasFrontmatter = false;
  if (tree.children.length > 0 && tree.children[0].type === 'yaml') {
    hasFrontmatter = true;
  }

  if (!hasFrontmatter) {
    const metadata = `title: ${basename}\ndate: ${new Date().toISOString()}\ngenerator: docuflow`;
    tree.children.unshift({
      type: 'yaml',
      value: metadata,
    });
  }

  // 4. Stringify and Write to NEW file
  const newContent = processor.stringify(tree);
  await fs.writeFile(outputFilePath, newContent, 'utf-8');
  console.log(`Generated ${outputFilePath}`);
}

function isVisualNode(node: any): boolean {
  if (node.type === 'image') return true;
  if (node.type === 'paragraph' && node.children && node.children.length === 1 && node.children[0].type === 'image') {
    return true;
  }
  // Check for Video Node
  if (node.type === 'html' && node.value.trim().startsWith('<video')) return true;
  if (node.type === 'paragraph' && node.children) {
    return node.children.some((c: any) => c.type === 'html' && c.value.trim().startsWith('<video'));
  }
  return false;
}

function createAssetNode(asset: GeneratedAsset) {
  if (asset.type === 'image') {
    return {
      type: 'paragraph',
      children: [
        {
          type: 'image',
          url: asset.path,
          alt: asset.alt || 'Snapshot',
        },
      ],
    };
  } else {
    // Video
    return {
      type: 'html',
      value: `<video src="${asset.path}" controls width="100%"></video>`,
    };
  }
}
