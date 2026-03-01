import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const PROJECT_ROOT = process.cwd();

const TARGET_PATHS = [
  'src/components/maps',
  'src/features/advanced-map-analytics/components',
  'src/routes/map.lazy.tsx',
  'src/routes/maps/editor/new.lazy.tsx',
  'src/routes/maps/editor/$mapId.lazy.tsx',
  'src/routes/maps/public/$mapId.lazy.tsx',
] as const;

const EXCLUDED_FILES = new Set([
  path.join('src', 'components', 'maps', 'EmployeesMap.tsx'),
]);

const ATTRIBUTE_LITERAL_REGEX =
  /(?:aria-label|title|placeholder|alt|label|text)\s*=\s*"[^"{]*[A-Za-z][^"{]*"/;
const RAW_TEXT_NODE_REGEX = /<[A-Za-z][^>]*>[^<{]*[A-Za-z][^<{]*<\/[A-Za-z]/;

function collectSourceFiles(targetPath: string): string[] {
  const absolutePath = path.join(PROJECT_ROOT, targetPath);
  if (!fs.existsSync(absolutePath)) {
    return [];
  }

  const stats = fs.statSync(absolutePath);
  if (stats.isFile()) {
    return [absolutePath];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    const fullPath = path.join(absolutePath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(path.relative(PROJECT_ROOT, fullPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) {
      continue;
    }

    if (fullPath.endsWith('.test.ts') || fullPath.endsWith('.test.tsx')) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function relativePath(filePath: string): string {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
}

describe('Map UI i18n audit', () => {
  it('does not contain obvious hardcoded user-facing literals', () => {
    const files = TARGET_PATHS.flatMap(collectSourceFiles);
    const violations: string[] = [];

    for (const filePath of files) {
      const relPath = relativePath(filePath);
      if (EXCLUDED_FILES.has(relPath)) {
        continue;
      }

      const source = fs.readFileSync(filePath, 'utf8');
      const lines = source.split(/\r?\n/);

      lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmed = line.trim();

        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
          return;
        }

        if (ATTRIBUTE_LITERAL_REGEX.test(line)) {
          violations.push(`${relPath}:${lineNumber}`);
          return;
        }

        const hasRawTextNode = RAW_TEXT_NODE_REGEX.test(line);
        const isLocalizedNode = line.includes('<Trans>') || line.includes('{t`') || line.includes('{t(');

        if (hasRawTextNode && !isLocalizedNode) {
          violations.push(`${relPath}:${lineNumber}`);
        }
      });
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
