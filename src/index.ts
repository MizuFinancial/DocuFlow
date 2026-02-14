import * as fs from 'fs/promises';
import * as path from 'path';
import { processFile } from './processor.js';
import chalk from 'chalk';

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        files.push(...await findMarkdownFiles(fullPath));
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const targetDir = process.argv[2] || '.';
  console.log(chalk.blue(`Scanning ${targetDir} for Markdown files...`));

  try {
    const files = await findMarkdownFiles(targetDir);
    console.log(chalk.green(`Found ${files.length} files.`));

    for (const file of files) {
      console.log(chalk.yellow(`Processing ${file}...`));
      await processFile(file);
    }
    
    console.log(chalk.blue('Done.'));
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

main();
