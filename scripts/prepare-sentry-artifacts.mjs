#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

const sourceAssetsDir = process.argv[2] ?? ".output/public/assets";
const targetAssetsDir = process.argv[3] ?? "/tmp/sentry-artifacts/assets";
const jsExtensions = [".js", ".mjs", ".cjs"];
const debugIdPattern = /\/\/# debugId=([0-9a-fA-F-]+)/;
const sentryDebugIdPattern = /sentry-dbid-([0-9a-fA-F-]+)/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function walkFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

function hasJavaScriptExtension(file) {
  return jsExtensions.some((extension) => file.endsWith(extension));
}

if (!existsSync(sourceAssetsDir) || !statSync(sourceAssetsDir).isDirectory()) {
  fail(`Missing assets directory: ${sourceAssetsDir}`);
}

rmSync(targetAssetsDir, { recursive: true, force: true });
mkdirSync(dirname(targetAssetsDir), { recursive: true });
cpSync(sourceAssetsDir, targetAssetsDir, { recursive: true });

const javascriptFiles = walkFiles(targetAssetsDir).filter(hasJavaScriptExtension);

if (javascriptFiles.length === 0) {
  fail(`No JavaScript assets found under ${targetAssetsDir}`);
}

let pairedMaps = 0;
let maplessJavaScriptFiles = 0;

for (const file of javascriptFiles) {
  const relativeFile = relative(targetAssetsDir, file);
  let js = readFileSync(file, "utf8");
  const debugIdMatch = js.match(debugIdPattern) ?? js.match(sentryDebugIdPattern);

  if (!debugIdMatch) {
    fail(`Missing Sentry debug ID in ${relativeFile}`);
  }

  const debugId = debugIdMatch[1];
  const mapFile = `${file}.map`;

  if (!existsSync(mapFile)) {
    maplessJavaScriptFiles += 1;
    continue;
  }

  let parsedMap;
  try {
    parsedMap = JSON.parse(readFileSync(mapFile, "utf8"));
  } catch (error) {
    fail(`Invalid source map JSON for ${relativeFile}: ${error.message}`);
  }

  parsedMap.debug_id = debugId;
  parsedMap.debugId = debugId;
  writeFileSync(mapFile, `${JSON.stringify(parsedMap)}\n`);

  if (!debugIdPattern.test(js)) {
    js = `${js.replace(/\s*$/, "")}\n//# debugId=${debugId}\n`;
    writeFileSync(file, js);
  }

  pairedMaps += 1;
}

if (pairedMaps === 0) {
  fail(`No JavaScript source maps paired under ${targetAssetsDir}`);
}

if (maplessJavaScriptFiles > 0) {
  console.warn(`Skipped source map pairing for ${maplessJavaScriptFiles} JavaScript assets without maps`);
}

console.log(
  `Prepared Sentry artifacts for ${javascriptFiles.length} JavaScript assets and ${pairedMaps} source maps in ${targetAssetsDir}`,
);
