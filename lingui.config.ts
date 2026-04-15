const config = {
  sourceLocale: "en",
  locales: ["en", "ro"],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["<rootDir>/src"],
      exclude: [
        "<rootDir>/src/routes/admin/**",
        "<rootDir>/src/features/campaigns/buget/admin/**",
      ],
    },
    {
      path: "<rootDir>/src/locales/{locale}/admin",
      include: [
        "<rootDir>/src/routes/admin/**",
        "<rootDir>/src/features/campaigns/buget/admin/**",
      ],
    },
  ],
  format: "po",
};

export default config;
