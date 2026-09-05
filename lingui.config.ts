import { defineConfig } from "@lingui/cli";

const config = defineConfig({
  sourceLocale: "en",
  locales: ["en", "ro"],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["<rootDir>/src"],
      exclude: [
        "<rootDir>/src/routes/admin/**",
        "<rootDir>/src/routes/pnrr.tsx",
        "<rootDir>/src/routes/pnrr.lazy.tsx",
        "<rootDir>/src/routes/pnrr_*.tsx",
        "<rootDir>/src/features/campaigns/buget/admin/**",
        "<rootDir>/src/features/pnrr/**",
        // Local-only prototyping surface. Prototypes may use t/<Trans>; the
        // source message renders under `vite dev`. Strings enter the catalogs
        // on promotion, keeping messages.po out of every prototype commit.
        "<rootDir>/src/development/**",
      ],
    },
    {
      path: "<rootDir>/src/locales/{locale}/admin",
      include: [
        "<rootDir>/src/routes/admin/**",
        "<rootDir>/src/features/campaigns/buget/admin/**",
      ],
    },
    {
      path: "<rootDir>/src/locales/{locale}/pnrr",
      include: [
        "<rootDir>/src/routes/pnrr.tsx",
        "<rootDir>/src/routes/pnrr.lazy.tsx",
        "<rootDir>/src/routes/pnrr_*.tsx",
        "<rootDir>/src/features/pnrr/**",
      ],
    },
  ],
});

export default config;
