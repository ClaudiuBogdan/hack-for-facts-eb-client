import path from "path";
import http from "http";
import https from "https";
import type { ClientRequest } from "http";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import checker from "vite-plugin-checker";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { lingui } from "@lingui/vite-plugin";
import { nitro } from "nitro/vite";
import fs from "fs";
import {
  buildChallengeStepSectionRequestId,
  isChallengeStepMdxFile,
  parseChallengeStepSectionRequestId,
  transformSectionedChallengeStepSource,
} from "./src/features/challenges/utils/sectioned-step-markdown.build";

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
  } catch (e) {
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

const challengeStepSectionsPlugin = () => ({
  name: "challenge-step-sections",
  enforce: "pre" as const,
  load(id: string) {
    const sectionRequest = parseChallengeStepSectionRequestId(id);
    if (!sectionRequest) {
      return null;
    }

    return challengeStepSectionSources.get(
      buildChallengeStepSectionRequestId(
        sectionRequest.filePath,
        sectionRequest.sectionIndex,
      ),
    ) ?? null;
  },
  transform(code: string, id: string) {
    if (parseChallengeStepSectionRequestId(id)) {
      return null;
    }

    const normalizedId = id.replace(/\\/g, "/");
    if (!isChallengeStepMdxFile(normalizedId)) {
      return null;
    }

    const transformed = transformSectionedChallengeStepSource({
      source: code,
      filePath: normalizedId,
    });
    if (!transformed.didTransform) {
      return null;
    }

    transformed.sections.forEach((section, sectionIndex) => {
      challengeStepSectionSources.set(
        buildChallengeStepSectionRequestId(normalizedId, sectionIndex),
        section.bodySource,
      );
    });

    return {
      code: transformed.source,
      map: null,
    };
  },
});

const challengeStepSectionSources = new Map<string, string>();


export default defineConfig(({ mode }) => {
  // Proxy best practices: https://vite.dev/config/server-options
  // Cookie handling: https://github.com/sagemathinc/http-proxy-3
  // Origin header security: https://github.com/vitejs/vite/issues/17562
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || env.VITE_API_URL;

  // Keep-alive agent for connection reuse (better performance)
  // Use http or https agent based on target protocol
  const proxyAgent = apiProxyTarget
    ? apiProxyTarget.startsWith("https")
      ? new https.Agent({ keepAlive: true, maxSockets: 50 })
      : new http.Agent({ keepAlive: true, maxSockets: 50 })
    : undefined;

  const configureProxy = (proxyInstance: any) => {
    proxyInstance.on("error", (error: Error, _req: unknown, res: any) => {
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
      proxyInstance.on("proxyReq", (_proxyReq: ClientRequest, req: any) => {
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
      challengeStepSectionsPlugin(),
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
      react({
        plugins: [["@lingui/swc-plugin", {}]],
      }),
      tailwindcss(),
      checker({
        typescript: true,
      }),
      // Sentry plugin will upload sourcemaps only on production builds when env vars are set
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        disable:
          mode !== "production" ||
          !process.env.SENTRY_ORG ||
          !process.env.SENTRY_PROJECT ||
          !process.env.SENTRY_AUTH_TOKEN,
        telemetry: false,
        sourcemaps: {
          // TanStack Start + Nitro outputs assets under .output.
          assets: [
            "./.output/public/assets/**",
            "./.output/server/**/*.js.map",
          ],
        },
      }),
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
      // Generate sourcemaps in production so Sentry can upload and map stack traces
      // Using 'hidden' avoids adding sourceMappingURL references to the bundled files
      sourcemap: 'hidden',
      chunkSizeWarningLimit: 1500,
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
              manualChunks: {
                recharts: ['recharts'],
                leaflet: ['leaflet', 'react-leaflet'],
                clerk: ['@clerk/clerk-react'],
                motion: ['framer-motion', 'motion'],
                sentry: ['@sentry/react'],
                posthog: ['posthog-js'],
                tanstack: ['@tanstack/react-query', '@tanstack/react-table', '@tanstack/react-virtual'],
              },
            },
          },
        },
      },
    },
  });
});
