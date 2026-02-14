# DocuFlow

**Automated Documentation Generator based on Markdown DSL and Playwright.**

DocuFlow allows you to embed execution scripts directly within your Markdown files. It automatically runs these scripts to capture screenshots or record videos, and then generates a "published" version of your document with the artifacts embedded.

[中文文档 (Chinese Documentation)](./README.zh.md)

## Key Features

*   **Single Source of Truth**: The documentation contains the automation script.
*   **Automated**: Always up-to-date screenshots and videos.
*   **Simple DSL**: Easy-to-write syntax for browser automation.

## Usage Guide

### 1. Installation

DocuFlow relies on Playwright. Ensure you have Node.js (>=18) installed.

**Global Installation:**

```bash
pnpm install -g @mizufinancial/docuflow
pnpx playwright install chromium
```

**Local Installation:**

```bash
pnpm add -D @mizufinancial/docuflow
pnpm exec playwright install chromium
```

### 2. Writing Documentation

Write `flow` code blocks in your Markdown file (`example.md`):

````markdown
# My Feature

Here is the homepage:

```flow
config viewport 1280x720
goto https://example.com
snapshot homepage.png
```
````

### 3. Generation

Run the tool to process your files:

```bash
# Process all .md files in the current directory
pnpx docuflow

# Process a specific directory
pnpx docuflow ./docs
```

**Output:**
The tool will generate a new file named `example-done.md`.
*   The `flow` code blocks will be **removed**.
*   The generated images/videos will be inserted in their place.
*   YAML metadata (frontmatter) will be added to the top of the file.

### 4. DSL Specification

See [DSL_SPEC.md](./DSL_SPEC.md) for full syntax details.

## Example

Check out [Mizu Homepage](./mizu/homepage.md) for a real-world example.
