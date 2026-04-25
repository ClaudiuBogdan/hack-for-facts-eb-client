#!/usr/bin/env node

import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { spawnSync } from "node:child_process";

const outputDir = process.argv[2] ?? ".output";
const serverEntry = join(outputDir, "server", "index.mjs");
const assetsDir = join(outputDir, "public", "assets");
const jsExtensions = new Set([".js", ".mjs", ".cjs"]);

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

console.log(`Validated ${outputJavaScriptFiles.length} JavaScript files in ${outputDir}`);
