#!/usr/bin/env node

import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { spawnSync } from "node:child_process";

const outputDir = process.argv[2] ?? ".output";
const serverEntry = join(outputDir, "server", "index.mjs");
const assetsDir = join(outputDir, "public", "assets");
const jsExtensions = new Set([".js", ".mjs", ".cjs"]);

// The local-only prototyping surface (docs/design/prototyping.md) must never
// reach a build artifact. Markers are literal, never assembled from parts: an
// assembled string exists at runtime but cannot be found by a text search, so
// the check would silently pass. The path and filename checks generalise beyond
// the marked modules, since Rolldown keeps module paths in sourcemaps and names
// chunks after module basenames.
const developmentMarkers = [
  "TRANSPARENTA_DEV_SURFACE_HARNESS_MUST_NOT_SHIP",
  "TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP",
];
const developmentSourcePath = "src/development/";
// The three route stubs are named `development*` and are expected to ship.
const developmentFileName = /prototype|harness/i;
const scannedExtensions = [".js", ".mjs", ".cjs", ".css", ".html", ".json", ".map"];

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
  return [...jsExtensions].some((extension) => file.endsWith(extension));
}

function writeLimitedOutput(stream, output) {
  if (!output) return;
  const maxLength = 4000;
  stream.write(output.length > maxLength ? `${output.slice(0, maxLength)}\n... output truncated ...\n` : output);
}

function checkJavaScriptSyntax(file) {
  const isBrowserAsset = file.startsWith(`${assetsDir}${sep}`) && file.endsWith(".js");
  const args = isBrowserAsset
    ? ["--input-type=module", "--check"]
    : ["--check", file];
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    input: isBrowserAsset ? readFileSync(file, "utf8") : undefined,
  });

  if (result.status !== 0) {
    writeLimitedOutput(process.stdout, result.stdout);
    writeLimitedOutput(process.stderr, result.stderr);
    fail(`JavaScript syntax validation failed for ${file}`);
  }
}

if (!existsSync(serverEntry)) {
  fail(`Missing server entry: ${serverEntry}`);
}

if (!existsSync(assetsDir) || !statSync(assetsDir).isDirectory()) {
  fail(`Missing assets directory: ${assetsDir}`);
}

const assetFiles = walkFiles(assetsDir);
const javascriptFiles = assetFiles.filter(hasJavaScriptExtension);
const outputJavaScriptFiles = walkFiles(outputDir).filter(hasJavaScriptExtension);

if (javascriptFiles.length === 0) {
  fail(`No JavaScript assets found under ${assetsDir}`);
}

for (const file of outputJavaScriptFiles) {
  checkJavaScriptSyntax(file);
}

const scannedFiles = walkFiles(outputDir).filter((file) =>
  scannedExtensions.some((extension) => file.endsWith(extension)),
);

const developmentFailures = [];

for (const file of scannedFiles) {
  const base = file.slice(file.lastIndexOf(sep) + 1);
  if (developmentFileName.test(base)) {
    developmentFailures.push(`${file}: emitted file is named after a prototype or the harness`);
  }

  const contents = readFileSync(file, "utf8");

  for (const marker of developmentMarkers) {
    if (contents.includes(marker)) {
      developmentFailures.push(`${file}: contains the development marker ${marker}`);
    }
  }

  if (contents.includes(developmentSourcePath)) {
    developmentFailures.push(`${file}: references ${developmentSourcePath}`);
  }
}

if (developmentFailures.length > 0) {
  for (const failure of developmentFailures) {
    console.error(failure);
  }
  fail(
    `The local-only /development surface leaked into ${outputDir}. ` +
      "It must never ship. See docs/design/prototyping.md.",
  );
}

console.log(`Validated ${outputJavaScriptFiles.length} JavaScript files in ${outputDir}`);
console.log(`Checked ${scannedFiles.length} files for /development leakage`);
