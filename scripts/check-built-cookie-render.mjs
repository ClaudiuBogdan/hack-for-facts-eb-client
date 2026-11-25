#!/usr/bin/env node
// The built server renders pages from the reader's cookies: `user-locale=en`
// gives an English page, no cookie the Romanian default. A Nitro route cache
// broke it on /, /map and /entity-analytics, because ocache strips the headers
// it varies on from the request it renders (nitro.config.ts, CACHE-001).
//   node scripts/check-built-cookie-render.mjs [.output]

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const outputDir = process.argv[2] ?? ".output";
const PATHS = ["/", "/map", "/entity-analytics", "/public-institutions"];
const CASES = [
  { cookie: "user-locale=en", lang: "en" },
  { cookie: null, lang: "ro" },
];

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

async function waitUntilAnswering(base, server) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`The server exited with ${server.exitCode} before answering.`);
    try {
      await fetch(`${base}/robots.txt`, { signal: AbortSignal.timeout(2_000) });
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error("The server did not answer within a minute.");
}

async function langOf(base, path, cookie) {
  const response = await fetch(`${base}${path}`, {
    headers: cookie ? { cookie } : {},
    signal: AbortSignal.timeout(90_000),
  });
  const html = await response.text();
  return { status: response.status, lang: html.match(/<html[^>]*\blang="([^"]*)"/)?.[1] ?? null };
}

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [join(outputDir, "server", "index.mjs")], {
  env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" },
  stdio: ["ignore", "ignore", "inherit"],
});

const failures = [];
try {
  await waitUntilAnswering(base, server);
  for (const path of PATHS) {
    for (const { cookie, lang } of CASES) {
      const answer = await langOf(base, path, cookie);
      const said = `${path} with ${cookie ?? "no cookie"}: HTTP ${answer.status}, lang="${answer.lang}"`;
      if (answer.lang === lang) console.log(`ok  ${said}`);
      else failures.push(`${said}, expected lang="${lang}"`);
    }
  }
  // The national budget page renders from the reader's cookies: no shared cache may keep it. Its share image
  // depends on the address only: the same picture with a cookie or without, and no cookie set (CACHE-001).
  const page = await fetch(`${base}/national-budget`, { headers: { cookie: "user-locale=en" }, signal: AbortSignal.timeout(90_000) });
  await page.arrayBuffer();
  const pageCache = page.headers.get("cache-control") ?? "";
  if (pageCache.includes("private") && pageCache.includes("no-store")) console.log(`ok  /national-budget: Cache-Control "${pageCache}"`);
  else failures.push(`/national-budget: Cache-Control "${pageCache}", expected private, no-store`);
  const image = async (cookie) => {
    const response = await fetch(`${base}/national-budget/share-image.png?an=2025&lang=ro`, { headers: { accept: "image/png,text/html", ...(cookie ? { cookie } : {}) }, signal: AbortSignal.timeout(90_000) });
    return { status: response.status, type: response.headers.get("content-type"), cache: response.headers.get("cache-control") ?? "", vary: response.headers.get("vary") ?? "", setCookie: response.headers.get("set-cookie"), bytes: Buffer.from(await response.arrayBuffer()) };
  };
  const plain = await image(null);
  const withCookie = await image("user-locale=en; theme=dark");
  // The bytes are compared only between two cards with figures (public): an API slow for one request draws the
  // card without figures (no-store) for it, which says nothing about cookies.
  const figures = plain.cache.startsWith("public") && withCookie.cache.startsWith("public");
  const same = plain.status === withCookie.status && (!figures || plain.bytes.equals(withCookie.bytes));
  const clean = !/cookie/iu.test(plain.vary) && !/cookie/iu.test(withCookie.vary) && !plain.setCookie && !withCookie.setCookie;
  if (plain.status === 200 && plain.type === "image/png" && withCookie.type === "image/png" && same && clean) console.log(`ok  /national-budget/share-image.png: ${figures ? `the same ${plain.bytes.length} bytes` : "a card without figures (API unreadable)"} with a cookie or without, no Vary on cookies, no cookie set`);
  else failures.push(`/national-budget/share-image.png: HTTP ${plain.status}/${withCookie.status}, ${plain.type}/${withCookie.type}, same bytes ${same}, vary "${plain.vary}", set-cookie ${Boolean(plain.setCookie || withCookie.setCookie)}`);
} finally {
  server.kill();
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  console.error("A page rendered without the reader's cookies: is a Nitro route cache (nitro.config.ts) back on that path?");
  process.exit(1);
}
