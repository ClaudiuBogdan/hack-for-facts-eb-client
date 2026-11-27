#!/usr/bin/env node
// No page goes into a shared cache (CACHE-002). Every page renders from the reader's cookies through the root route
// (language, theme, preferences, notices), so every HTML response must be `private, no-store`, whatever its status:
// a 200, a 404, a 500 after a failed read. The share images render from the address alone and stay public; they must
// not depend on cookies. The script starts the built server twice: once reading the API, once with the API unreachable,
// so the pages' failed reads (5xx, degraded renders) are walked too.
//   node scripts/check-built-page-cache-headers.mjs [.output]

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const outputDir = process.argv[2] ?? ".output";

/** A value for each path parameter: the header must not depend on it, only the page's outcome (200, 404, 500) does. */
const SAMPLE = {
  lang: "ro", cui: "4305857", siruta: "54975", countyCode: "CJ", countySiruta: "12", chamber: "cdep", cod: "POP107D",
  electionKey: "2024-prezidentiale",
};
/** Not HTML: images and data with headers of their own. */
const NOT_PAGES = /^\/(admin|api|development)(\/|$)|\.(png|json)$/u;
const SHARE_IMAGES = [
  "/national-budget/share-image.png?an=2025&lang=ro",
  "/pnrr/share-image.png",
  `/entities/${SAMPLE.cui}/share-image.png`,
  `/primarie/${SAMPLE.cui}/share-image.png`,
];

/** Every page route the router knows, from the generated tree, with sample parameters; plus a path that is no page. */
function pagePaths() {
  const tree = readFileSync("src/routeTree.gen.ts", "utf8");
  const full = new Set([...tree.matchAll(/fullPath: '([^']+)'/gu)].map((match) => match[1]));
  const paths = [...full]
    .filter((path) => !NOT_PAGES.test(path))
    .map((path) => path.replace(/\/\$$/u, "/x").replace(/\$(\w+)/gu, (_, key) => SAMPLE[key] ?? "1").replace(/(.)\/$/u, "$1"));
  return [...new Set(paths), "/__no-such-page__"];
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function startServer(env) {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [join(outputDir, "server", "index.mjs")], {
    env: { ...process.env, ...env, PORT: String(port), HOST: "127.0.0.1" },
    stdio: ["ignore", "ignore", "ignore"],
  });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`The server exited with ${server.exitCode} before answering.`);
    try {
      await fetch(`${base}/robots.txt`, { signal: AbortSignal.timeout(2_000) });
      return { base, server };
    } catch {
      await sleep(500);
    }
  }
  server.kill();
  throw new Error("The server did not answer within a minute.");
}

/** A header that lets a shared cache keep the response. */
const shared = (cacheControl, cdnCacheControl) =>
  /\bpublic\b|s-maxage/iu.test(cacheControl) || /\b(s-)?max-age=[1-9]/iu.test(cdnCacheControl);

async function walk(base, paths, label, failures) {
  const before = failures.length;
  const statuses = new Map();
  let next = 0;
  const worker = async () => {
    while (next < paths.length) {
      const path = paths[next++];
      try {
        const response = await fetch(`${base}${path}`, { redirect: "manual", signal: AbortSignal.timeout(90_000) });
        await response.arrayBuffer();
        const cacheControl = response.headers.get("cache-control") ?? "";
        const cdnCacheControl = response.headers.get("cdn-cache-control") ?? "";
        statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
        if (shared(cacheControl, cdnCacheControl)) failures.push(`${label} ${path}: HTTP ${response.status}, Cache-Control "${cacheControl}", CDN-Cache-Control "${cdnCacheControl}"`);
        if (path === "/__no-such-page__" && response.status !== 404) failures.push(`${label} ${path}: HTTP ${response.status}, expected 404`);
      } catch (error) {
        failures.push(`${label} ${path}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  const summary = [...statuses].sort(([a], [b]) => a - b).map(([status, count]) => `${count}×${status}`).join(", ");
  console.log(`${label}: ${paths.length} paths (${summary}), none shared-cacheable: ${failures.length === before ? "ok" : "see below"}`);
  return statuses;
}

/** The same picture with a cookie or without, still public, never varying on or setting a cookie. */
async function checkShareImage(base, path, failures) {
  const read = async (cookie) => {
    const response = await fetch(`${base}${path}`, { headers: { accept: "image/png", ...(cookie ? { cookie } : {}) }, signal: AbortSignal.timeout(90_000) });
    return { status: response.status, cache: response.headers.get("cache-control") ?? "", vary: response.headers.get("vary") ?? "", setCookie: response.headers.get("set-cookie"), bytes: Buffer.from(await response.arrayBuffer()) };
  };
  const plain = await read(null);
  const withCookie = await read("user-locale=en; ui-theme=dark; currency=EUR");
  // Bytes are compared between two full cards only: an API slow for one request draws a card without figures (no-store).
  const full = plain.cache.startsWith("public") && withCookie.cache.startsWith("public");
  const same = plain.status === withCookie.status && (!full || plain.bytes.equals(withCookie.bytes));
  const clean = !/cookie/iu.test(plain.vary + withCookie.vary) && !plain.setCookie && !withCookie.setCookie;
  if (plain.status === 200 && same && clean) console.log(`ok  ${path}: ${full ? `public, the same ${plain.bytes.length} bytes` : "a card without figures"} with a cookie or without`);
  else failures.push(`${path}: HTTP ${plain.status}/${withCookie.status}, same ${same}, vary "${plain.vary}"/"${withCookie.vary}", set-cookie ${Boolean(plain.setCookie || withCookie.setCookie)}`);
}

const paths = pagePaths();
const failures = [];

const reading = await startServer({});
try {
  await walk(reading.base, paths, "API read", failures);
  for (const path of SHARE_IMAGES) await checkShareImage(reading.base, path, failures);
} finally {
  reading.server.kill();
}

// The same pages with every server read failing: the 5xx and degraded renders must not be shareable either.
const failing = await startServer({ INTERNAL_API_URL: "http://127.0.0.1:9" });
try {
  const statuses = await walk(failing.base, paths, "API down", failures);
  if (![...statuses.keys()].some((status) => status >= 500)) failures.push("API down: no 5xx answered, so the failed-read case was not exercised");
} finally {
  failing.server.kill();
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  console.error("A page answered with a header a shared cache may keep (CACHE-002): pages render from cookies, so they send private, no-store.");
  process.exit(1);
}
