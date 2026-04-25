#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const assetsDir = process.argv[2] ?? ".output/public/assets";
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

function writeLimitedOutput(stream, output) {
  if (!output) return;
  const maxLength = 4000;
  stream.write(output.length > maxLength ? `${output.slice(0, maxLength)}\n... output truncated ...\n` : output);
}

function checkJavaScriptSyntax(file) {
  const isModule = !file.endsWith(".cjs");
  const result = spawnSync(
    process.execPath,
    isModule ? ["--input-type=module", "--check"] : ["--check", file],
    {
      encoding: "utf8",
      input: isModule ? readFileSync(file, "utf8") : undefined,
    },
  );

  if (result.status !== 0) {
    writeLimitedOutput(process.stdout, result.stdout);
    writeLimitedOutput(process.stderr, result.stderr);
    fail(`JavaScript syntax validation failed for ${relative(assetsDir, file)}`);
  }
}

if (!existsSync(assetsDir) || !statSync(assetsDir).isDirectory()) {
  fail(`Missing assets directory: ${assetsDir}`);
}

const javascriptFiles = walkFiles(assetsDir).filter(hasJavaScriptExtension);
const sourceMapFiles = walkFiles(assetsDir).filter((file) => file.endsWith(".js.map"));

if (javascriptFiles.length === 0) {
  fail(`No JavaScript assets found under ${assetsDir}`);
}

if (sourceMapFiles.length === 0) {
  fail(`No JavaScript source maps found under ${assetsDir}`);
}

const debugIdsByFile = new Map();

for (const file of javascriptFiles) {
  const relativeFile = relative(assetsDir, file);
  checkJavaScriptSyntax(file);
  const js = readFileSync(file, "utf8");
  const debugIdMatch = js.match(debugIdPattern) ?? js.match(sentryDebugIdPattern);

  if (!debugIdMatch) {
    fail(`Missing Sentry debug ID in ${relativeFile}`);
  }

  debugIdsByFile.set(file, debugIdMatch[1]);
}

let maplessJavaScriptFiles = 0;

for (const file of javascriptFiles) {
  if (!existsSync(`${file}.map`)) {
    maplessJavaScriptFiles += 1;
  }
}

for (const mapFile of sourceMapFiles) {
  const jsFile = mapFile.slice(0, -".map".length);
  const relativeFile = relative(assetsDir, jsFile);

  if (!existsSync(jsFile)) {
    fail(`Missing JavaScript asset for source map ${relative(assetsDir, mapFile)}`);
  }

  let parsedMap;
  try {
    parsedMap = JSON.parse(readFileSync(mapFile, "utf8"));
  } catch (error) {
    fail(`Invalid source map JSON for ${relativeFile}: ${error.message}`);
  }

  const mapDebugId = parsedMap.debug_id ?? parsedMap.debugId;

  if (typeof mapDebugId !== "string" || mapDebugId.length === 0) {
    fail(`Missing debug_id in source map for ${relativeFile}`);
  }

  const debugId = debugIdsByFile.get(jsFile);

  if (mapDebugId !== debugId) {
    fail(
      `Debug ID mismatch for ${relativeFile}: JS has ${debugId}, map has ${mapDebugId}`,
    );
  }
}

if (maplessJavaScriptFiles > 0) {
  console.warn(`Skipped source map pairing for ${maplessJavaScriptFiles} JavaScript assets without maps`);
}

console.log(
  `Validated Debug IDs for ${javascriptFiles.length} JavaScript assets and ${sourceMapFiles.length} source maps in ${assetsDir}`,
);
