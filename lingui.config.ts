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
        "<rootDir>/src/features/campaigns/buget/admin/**",
        "<rootDir>/src/features/pnrr/**",
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
        "<rootDir>/src/features/pnrr/**",
      ],
    },
  ],
});

export default config;
