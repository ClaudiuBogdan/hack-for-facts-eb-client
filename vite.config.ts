import path from "path";
import http from "http";
import https from "https";

import { defineConfig, loadEnv } from "vite";
import babel from "@rolldown/plugin-babel";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import checker from "vite-plugin-checker";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import { nitro } from "nitro/vite";
import fs from "fs";
import { createChallengeStepSectionsPlugin } from "./config/challenge-step-sections-plugin";
import { createSafariRegexFixPlugin } from "./config/safari-regex-fix-plugin";

const getHttpsConfig = () => {
  if (String(process.env.HTTPS_ENABLED) !== "true") {
    return
  }
  try {
    return {
      // Generate ssl certs using ./ssl.sh
      key: fs.readFileSync(path.resolve(__dirname, "localhost-key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "localhost-cert.pem")),
    }
  } catch (_e) {
    console.warn('Run ./ssl.sh to generate the local certs')
    return undefined
  }
}

const esmExtensionFixesPlugin = () => ({
  name: "esm-extension-fixes",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (
      !code.includes("lodash/memoize") &&
      !code.includes("@visx/drag/lib/")
    ) {
      return null;
    }
    if (!id.match(/\.(cjs|mjs|js|jsx|ts|tsx)$/)) return null;
    let updated = code.replace(
      /lodash\/memoize(?!\.js)/g,
      "lodash/memoize.js",
    );
    updated = updated.replace(
      /@visx\/drag\/lib\/([A-Za-z0-9_/-]+)(?!\.js)/g,
      "@visx/drag/lib/$1.js",
    );
    if (updated === code) return null;
    return { code: updated, map: null };
  },
});

const getContentLocale = (id: string) => {
  if (id.includes('.en.mdx')) {
    return 'en';
  }
  if (id.includes('.ro.mdx')) {
    return 'ro';
  }
  return null;
};

const getContentManualChunk = (id: string) => {
  const normalizedId = id.replace(/\\/g, '/');
  const locale = getContentLocale(normalizedId);
  if (!locale) {
    return undefined;
  }

  if (normalizedId.includes('/src/content/learning/modules/')) {
    return `learning-content-${locale}`;
  }

  if (normalizedId.includes('/src/content/challenges/steps/')) {
    return `challenge-step-content-${locale}`;
  }

  return undefined;
};

const getClientManualChunk = (id: string) => {
  const contentChunk = getContentManualChunk(id);
  if (contentChunk) {
    return contentChunk;
  }

  if (id.includes('/node_modules/recharts/')) {
    return 'recharts';
  }
  if (
    id.includes('/node_modules/leaflet/') ||
    id.includes('/node_modules/react-leaflet/') ||
    id.includes('/node_modules/maplibre-gl/') ||
    id.includes('/node_modules/pmtiles/')
  ) {
    return 'maps';
  }
  if (id.includes('/node_modules/@clerk/clerk-react/')) {
    return 'clerk';
  }
  if (id.includes('/node_modules/framer-motion/') || id.includes('/node_modules/motion/')) {
    return 'motion';
  }
  if (id.includes('/node_modules/@sentry/')) {
    return 'sentry';
  }
  if (id.includes('/node_modules/posthog-js/')) {
    return 'posthog';
  }
  if (
    id.includes('/node_modules/@tanstack/react-query/') ||
    id.includes('/node_modules/@tanstack/react-table/') ||
    id.includes('/node_modules/@tanstack/react-virtual/')
  ) {
    return 'tanstack';
  }

  return undefined;
};


export default defineConfig(({ mode }) => {
  // Proxy best practices: https://vite.dev/config/server-options
  // Cookie handling: https://github.com/sagemathinc/http-proxy-3
  // Origin header security: https://github.com/vitejs/vite/issues/17562
  const env = loadEnv(mode, process.cwd(), "");
  const shouldPrepareSentrySourcemaps =
    mode === "production" && process.env.SENTRY_SOURCEMAPS === "true";
  const shouldGenerateSentrySourcemaps =
    mode === "production" && shouldPrepareSentrySourcemaps;
  const sentryRelease = process.env.SENTRY_RELEASE ?? process.env.VITE_APP_VERSION;
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || env.VITE_API_URL;

  // Keep-alive agent for connection reuse (better performance)
  // Use http or https agent based on target protocol
  const proxyAgent = apiProxyTarget
    ? apiProxyTarget.startsWith("https")
      ? new https.Agent({ keepAlive: true, maxSockets: 50 })
      : new http.Agent({ keepAlive: true, maxSockets: 50 })
    : undefined;

  interface ProxyInstance {
    on(event: 'error', listener: (error: Error, req: http.IncomingMessage, res: http.ServerResponse) => void): void
    on(event: 'proxyReq', listener: (proxyReq: unknown, req: http.IncomingMessage) => void): void
  }

  const configureProxy = (proxyInstance: ProxyInstance) => {
    proxyInstance.on("error", (error: Error, _req: http.IncomingMessage, res: http.ServerResponse) => {
      console.error("[Proxy Error]", error.message);
      if (res && !res.headersSent) {
        res.writeHead(502, { "Content-Type": "application/json" });
      }
      if (res) {
        res.end(JSON.stringify({ error: "proxy_error", message: error.message }));
      }
    });

    // Debug logging (enable with DEBUG_PROXY=true)
    if (env.DEBUG_PROXY === "true") {
      proxyInstance.on("proxyReq", (_proxyReq: unknown, req: http.IncomingMessage) => {
        console.log("[Proxy]", req.method, req.url);
      });
    }
  };

  const proxy = apiProxyTarget
    ? {
      "/graphql": {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: true,
        proxyTimeout: 120_000,
        timeout: 120_000,
        agent: proxyAgent,
        xfwd: true,
        cookieDomainRewrite: { "*": "" },
        cookiePathRewrite: { "*": "/" },
        configure: configureProxy,
      },
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: true,
        proxyTimeout: 120_000,
        timeout: 120_000,
        agent: proxyAgent,
        xfwd: true,
        cookieDomainRewrite: { "*": "" },
        cookiePathRewrite: { "*": "/" },
        configure: configureProxy,
      },
    }
    : undefined;

  return ({
    plugins: [
      {
        name: 'md-404-dev-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url || '/';
            try {
              const parsed = new URL(url, 'http://localhost');
              const pathname = decodeURIComponent(parsed.pathname);
              if (pathname.endsWith('.md')) {
                const rel = pathname.startsWith('/') ? pathname.slice(1) : pathname;
                const filePath = path.resolve(__dirname, 'public', rel);
                if (!fs.existsSync(filePath)) {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                  res.end('Not Found');
                  return;
                }
              }
            } catch {
              // If URL parsing fails, let Vite handle it
            }
            next();
          });
        },
      },
      esmExtensionFixesPlugin(),
      createSafariRegexFixPlugin(),
      createChallengeStepSectionsPlugin(),
      lingui(),
      tanstackStart(),
      nitro({
        preset: "node_server",
        alias: {
          "lodash/memoize": "lodash/memoize.js",
        },
      }),
      {
        enforce: 'pre' as const,
        ...mdx({
          remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
        }),
      },
      babel({
        presets: [linguiTransformerBabelPreset()],
      }),
      react(),
      tailwindcss(),
      checker({
        typescript: true,
      }),
      ...(shouldPrepareSentrySourcemaps ? sentryTanstackStart({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        // Upload and Debug ID source-map pairing are handled by Dockerfile steps.
        // Keep the framework plugin active without noisy no-auth upload warnings.
        silent: true,
        telemetry: false,
        release: {
          name: sentryRelease,
          inject: false,
          create: false,
          finalize: false,
          setCommits: false,
          deploy: false,
        },
        sourcemaps: {
          // Keep production sourcemaps available for the Docker artifact step,
          // which injects Debug IDs and uploads private artifacts later.
          disable: "disable-upload",
          // TanStack Start + Nitro outputs assets under .output.
          assets: [
            "./.output/public/assets/**",
          ],
        },
      }) : []),
    ],
    // Static assets will be fingerprinted by Vite and can be cached long-term by the browser/CDN
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "lodash/memoize": "lodash/memoize.js",
      },
    },
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
      allowedHosts: [
        String(process.env.VITE_ALLOWED_HOST)
      ],
      https: getHttpsConfig(),
      proxy,
    },
    build: {
      // Limit output to ES2022 syntax for Safari 16+ / Chrome 100+ / Firefox 100+.
      // Without this, esbuild defaults to `esnext` which may emit syntax or rely on
      // APIs unavailable in older mobile Safari, causing lazy-loaded chunks to fail
      // at evaluation time (Sentry 81e7b5c2: `Error: undefined` on iOS 16.1.2).
      target: 'es2022',
      // Sentry injection needs sourceMappingURL references to pair JS assets with maps.
      // Docker copies maps into private upload artifacts and removes them from served output.
      sourcemap: shouldGenerateSentrySourcemaps,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            return getContentManualChunk(id);
          },
        },
      },
    },
    // SSR configuration - bundle packages that have import issues when externalized
    ssr: {
      noExternal: [
        'decimal.js-light',
        'lodash',
        'recharts',
        'recharts-scale',
        'd3-scale',
        'd3-array',
        'd3-format',
        'd3-interpolate',
        'd3-time',
        'd3-time-format',
        'd3-color',
        'd3-path',
        'd3-shape',
      ],
    },
    // Client-specific build options (manualChunks don't apply to SSR where packages are external)
    environments: {
      client: {
        build: {
          rollupOptions: {
            output: {
              manualChunks(id) {
                return getClientManualChunk(id);
              },
            },
          },
        },
      },
    },
  });
});
