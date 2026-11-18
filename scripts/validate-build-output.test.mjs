// The inlined-stylesheet guard of validate-build-output.mjs, on minimal build outputs.
//   node --test scripts/validate-build-output.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = join(dirname(fileURLToPath(import.meta.url)), "validate-build-output.mjs");
const SHEET = "/*! tailwindcss v4.3.3 | MIT License */\n@layer base{a>b{color:red}}.x{background:url(/assets/x.woff2)}";
const OTHER = "/*! tailwindcss v4.3.3 | other */\n.y{color:blue}";

function validate(files) {
  const dir = mkdtempSync(join(tmpdir(), "validate-build-"));
  try {
    const all = { "server/index.mjs": "export default 1;\n", "public/assets/entry.js": "export const a = 1;\n", ...files };
    for (const [path, contents] of Object.entries(all)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), contents);
    }
    const result = spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
    return { ok: result.status === 0, output: result.stdout + result.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const literal = (css) => `export const css = ${JSON.stringify(css)};\n`;

test("passes when the server's inlined sheet equals an emitted stylesheet", () => {
  const result = validate({ "server/_ssr/router.mjs": literal(SHEET), "public/assets/index-a.css": `${SHEET}\n` });
  assert.ok(result.ok, result.output);
});

test("fails without an inlined sheet in the server bundle", () => {
  const result = validate({ "public/assets/index-a.css": SHEET });
  assert.ok(!result.ok);
  assert.match(result.output, /holds no inlined Tailwind stylesheet/);
});

test("does not count a copy in public JavaScript as the server's", () => {
  const result = validate({ "public/worker.js": literal(SHEET), "public/assets/index-a.css": SHEET });
  assert.ok(!result.ok);
  assert.match(result.output, /holds no inlined Tailwind stylesheet/);
});

test("fails when the inlined sheet and the emitted file have drifted apart", () => {
  const result = validate({ "server/_ssr/router.mjs": literal(SHEET), "public/assets/index-a.css": SHEET.replace("red", "blue") });
  assert.ok(!result.ok);
  assert.match(result.output, /drifted apart/);
});

test("fails on a relative url(), which resolves against the page once inlined", () => {
  const relative = SHEET.replace("/assets/x.woff2", "./x.woff2");
  const result = validate({ "server/_ssr/router.mjs": literal(relative), "public/assets/index-a.css": relative });
  assert.ok(!result.ok);
  assert.match(result.output, /relative addresses.*\.\/x\.woff2/);
});

test("fails when browser JavaScript carries the sheet", () => {
  const result = validate({
    "server/_ssr/router.mjs": literal(SHEET),
    "public/assets/index-a.css": SHEET,
    "public/assets/leak.js": literal(SHEET),
  });
  assert.ok(!result.ok);
  assert.match(result.output, /leak\.js: browser JavaScript carries the inlined stylesheet/);
});

test("checks every inlined sheet for leaks, not only the first", () => {
  const result = validate({
    "server/_ssr/router.mjs": literal(SHEET) + `export const other = ${JSON.stringify(OTHER)};\n`,
    "public/assets/index-a.css": SHEET,
    "public/assets/index-b.css": OTHER,
    "public/worker.js": literal(OTHER),
  });
  assert.ok(!result.ok);
  assert.match(result.output, /worker\.js: browser JavaScript carries the inlined stylesheet/);
});
