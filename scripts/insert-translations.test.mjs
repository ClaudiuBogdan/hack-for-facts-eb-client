import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// scripts/insert_translations.py on temporary catalogs: the default mode fills
// only empty msgstr (unchanged); --replace-source-copy also replaces, for the
// supplied msgids only, a single-line msgstr that is exactly its msgid, and
// never a human translation, a context, a plural, a multi-line or an obsolete
// entry. Run with: node --test scripts/insert-translations.test.mjs

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "insert_translations.py");

const CATALOG = `msgid ""
msgstr ""
"Language: en\\n"

#: src/a.tsx:1
msgid "Salut"
msgstr "Salut"

#: src/a.tsx:2
msgid "Lume"
msgstr "Lume"

#: src/a.tsx:3
msgid "Gata"
msgstr "Done already"

#: src/a.tsx:4
msgctxt "buton"
msgid "Salut"
msgstr "Salut"

#: src/a.tsx:5
msgid "un fișier"
msgid_plural "{0} fișiere"
msgstr[0] "un fișier"
msgstr[1] "{0} fișiere"

#: src/a.tsx:6
msgid "Rând"
msgstr "Rând"
" continuat"

#: src/a.tsx:7
msgid "Gol"
msgstr ""

#: src/a.tsx:8
msgid "Cu {0} și „ghilimele”"
msgstr "Cu {0} și „ghilimele”"

#~ msgid "Vechi"
#~ msgstr "Vechi"
`;

const pair = (msgid, msgstr) => `--\n./src/locales/en/messages.po-1-msgid "${msgid}"\n./src/locales/en/messages.po:2:msgstr "${msgstr}"\n`;

const INPUT = [
  pair("Salut", "Hello"),
  pair("Gata", "Done"),
  pair("un fișier", "one file"),
  pair("Rând", "Row"),
  pair("Gol", "Empty"),
  pair("Cu {0} și „ghilimele”", "With {0} and “quotes”"),
  pair("Vechi", "Old"),
].join("");

function run(args) {
  const dir = mkdtempSync(path.join(tmpdir(), "insert-translations-"));
  try {
    const catalog = path.join(dir, "messages.po");
    writeFileSync(catalog, CATALOG, "utf8");
    const result = spawnSync("python3", ["-I", SCRIPT, ...args(catalog)], { input: INPUT, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return readFileSync(catalog, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const expectedWith = (replacements) =>
  replacements.reduce((text, [from, to]) => {
    assert.ok(text.includes(from), `fixture lacks ${from}`);
    return text.replace(from, to);
  }, CATALOG);

const FILLED_EMPTY = ['msgid "Gol"\nmsgstr ""', 'msgid "Gol"\nmsgstr "Empty"'];

test("the default mode fills only empty msgstr: every source copy, translation, context and plural is unchanged", () => {
  assert.equal(
    run((catalog) => [catalog]),
    expectedWith([FILLED_EMPTY]),
  );
});

test("--replace-source-copy replaces only the supplied single-line source copies, and fills empty msgstr as before", () => {
  const expected = expectedWith([
    ['#: src/a.tsx:1\nmsgid "Salut"\nmsgstr "Salut"', '#: src/a.tsx:1\nmsgid "Salut"\nmsgstr "Hello"'],
    FILLED_EMPTY,
    ['msgstr "Cu {0} și „ghilimele”"', 'msgstr "With {0} and “quotes”"'],
  ]);
  const output = run((catalog) => ["--replace-source-copy", catalog]);
  assert.equal(output, expected);
  // Untouched: a source copy not supplied, a human translation, the msgctxt entry, the plural, the multi-line and the obsolete entry.
  assert.ok(output.includes('msgid "Lume"\nmsgstr "Lume"'));
  assert.ok(output.includes('msgid "Gata"\nmsgstr "Done already"'));
  assert.ok(output.includes('msgctxt "buton"\nmsgid "Salut"\nmsgstr "Salut"'));
  assert.ok(output.includes('msgstr[0] "un fișier"\nmsgstr[1] "{0} fișiere"'));
  assert.ok(output.includes('msgid "Rând"\nmsgstr "Rând"\n" continuat"'));
  assert.ok(output.includes('#~ msgid "Vechi"\n#~ msgstr "Vechi"'));
});

test("the flag may come after the catalog path", () => {
  assert.equal(
    run((catalog) => [catalog, "--replace-source-copy"]),
    run((catalog) => ["--replace-source-copy", catalog]),
  );
});
