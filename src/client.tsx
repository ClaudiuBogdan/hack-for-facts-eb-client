import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";
import { i18n } from "@lingui/core";
import { dynamicActivate } from "@/lib/i18n";
import { getUserLocale } from "@/lib/utils";
import { getReactRootErrorHandlers } from "@/lib/sentry";
import { registerChunkErrorHandler } from "@/lib/chunk-recovery";

const hasWindow = typeof window !== "undefined";

async function bootstrap() {
  const userLocale = hasWindow ? getUserLocale() : "ro";

  if (hasWindow) {
    registerChunkErrorHandler();
    try {
      await dynamicActivate(userLocale, {
        pathname: window.location.pathname,
      });
    } catch (error) {
      i18n.load(userLocale, {});
      i18n.activate(userLocale);
      if (import.meta.env.DEV) {
        console.error("Failed to load translations:", error);
      }
    }
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
