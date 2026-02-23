const DEFAULT_ROUTER_STATE = { __TSR_index: 0 };

type RouterLocationState = {
  state?: unknown;
};

type RouterLocation = {
  location?: RouterLocationState;
};

type RouterState = {
  state?: RouterLocation;
};

type ParsedLocation = {
  href: string;
};

export type ShareRouter = RouterState & {
  parseLocation: (location: any) => ParsedLocation;
};

export type ShareNavigate = (opts: { href: string; replace?: boolean }) => unknown;

export function buildShareRedirectHref(
  router: ShareRouter,
  redirectUrl: string,
  currentOrigin: string
): string {
  const url = new URL(redirectUrl, currentOrigin);
  const locationState = router.state?.location?.state ?? DEFAULT_ROUTER_STATE;
  const parsedLocation = router.parseLocation({
    href: `${url.pathname}${url.search}${url.hash}`,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    state: locationState,
  });

  return parsedLocation.href;
}

export async function navigateShareRedirect(args: {
  redirectUrl: string;
  currentOrigin: string;
  router: ShareRouter;
  navigate: ShareNavigate;
  replaceLocation: (redirectUrl: string) => void;
}) {
  const { redirectUrl, currentOrigin, router, navigate, replaceLocation } = args;

  try {
    const href = buildShareRedirectHref(router, redirectUrl, currentOrigin);
    await Promise.resolve(navigate({ href, replace: true }));
  } catch (error) {
    console.error("Router redirect failed. Falling back to hard redirect.", error);
    replaceLocation(redirectUrl);
  }
}
