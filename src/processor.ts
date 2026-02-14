import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parseScript } from './parser.js';
import { Runner } from './runner.js';
import { GeneratedAsset } from './types.js';

export async function processFile(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8');
  const baseDir = path.dirname(filePath);

  const processor = unified().use(remarkParse).use(remarkStringify, { bullet: '-', listItemIndent: 'one' }); // formatting options

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

      if (assets.length > 0) {
        injectAssets(node, parent, assets);
      }
    }
  } finally {
    await runner.close();
  }

  // 3. Stringify and Write
  const newContent = processor.stringify(tree);
  await fs.writeFile(filePath, newContent, 'utf-8');
  console.log(`Updated ${filePath}`);
}

function injectAssets(node: any, parent: any, assets: GeneratedAsset[]) {
  const nodeIndex = parent.children.indexOf(node);
  if (nodeIndex === -1) return; // Should not happen

  let currentIndex = nodeIndex + 1;

  for (const asset of assets) {
    // Check if next node is an image (or paragraph with image) or video
    const nextNode = parent.children[currentIndex];

    let isMatchingImage = false;
    let imageNode: any = null;

    if (nextNode) {
      if (nextNode.type === 'image') {
        isMatchingImage = true;
        imageNode = nextNode;
      } else if (
        nextNode.type === 'paragraph' &&
        nextNode.children &&
        nextNode.children.length === 1 &&
        nextNode.children[0].type === 'image'
      ) {
        isMatchingImage = true;
        imageNode = nextNode.children[0];
      } else {
        // Check for Video Node
        let isVideoNode = false;
        if (nextNode.type === 'html' && nextNode.value.trim().startsWith('<video')) {
          isVideoNode = true;
        } else if (nextNode.type === 'paragraph' && nextNode.children) {
          const hasVideoChild = nextNode.children.some(
            (c: any) => c.type === 'html' && c.value.trim().startsWith('<video'),
          );
          if (hasVideoChild) {
            isVideoNode = true;
          }
        }

        if (isVideoNode) {
          isMatchingImage = true;
          // imageNode remains null, signaling we should replace the whole node
        }
      }
    }

    if (isMatchingImage) {
      // Update existing
      if (asset.type === 'image' && imageNode) {
        // Update properties of existing image node
        imageNode.url = asset.path;
        if (asset.alt) imageNode.alt = asset.alt;
      } else {
        // Replace node (Video -> Image, Image -> Video, Video -> Video, or Image -> Image where struct differs)
        const newNode = createAssetNode(asset);
        parent.children[currentIndex] = newNode;
      }

      currentIndex++;
    } else {
      // Insert new
      const newNode = createAssetNode(asset);
      parent.children.splice(currentIndex, 0, newNode);
      currentIndex++;
    }
  }
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
    // Return HTML node
    return {
      type: 'html',
      value: `<video src="${asset.path}" controls width="100%"></video>`,
    };
  }
}
