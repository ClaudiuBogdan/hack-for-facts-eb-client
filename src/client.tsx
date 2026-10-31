import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";
import { i18n } from "@lingui/core";
import { activateLanguageForHydration } from "@/lib/i18n-hydration";
import { getUserLocale } from "@/lib/utils";
import { getReactRootErrorHandlers } from "@/lib/sentry";
import { registerChunkErrorHandler } from "@/lib/chunk-recovery";

const hasWindow = typeof window !== "undefined";

async function bootstrap() {
  const userLocale = hasWindow ? getUserLocale() : "ro";

  if (hasWindow) {
    registerChunkErrorHandler();
    // Without its catalog the page stays as the server rendered it, or loads afresh.
    const ready = await activateLanguageForHydration(
      userLocale,
      window.location.pathname,
    );
    if (!ready) return;
  } else {
    i18n.load(userLocale, {});
    i18n.activate(userLocale);
  }

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <StartClient />
      </StrictMode>,
      getReactRootErrorHandlers(),
    );
  });
}

void bootstrap();
