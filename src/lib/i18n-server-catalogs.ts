import { registerServerCatalogs } from "@/lib/i18n";

/**
 * Compiles every catalog into the server bundle, so a render never waits for
 * one (see `registerServerCatalogs`). Only the server entry may import this
 * module: in the client graph its eager globs would put both languages'
 * catalogs back on every page.
 */
export function installServerCatalogs(): void {
  registerServerCatalogs({
    messages: import.meta.glob("../locales/*/messages.po", { eager: true }),
    admin: import.meta.glob("../locales/*/admin.po", { eager: true }),
    pnrr: import.meta.glob("../locales/*/pnrr.po", { eager: true }),
  });
}
