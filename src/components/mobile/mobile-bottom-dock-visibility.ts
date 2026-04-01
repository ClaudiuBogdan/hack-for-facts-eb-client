const MOBILE_BOTTOM_DOCK_HIDDEN_PATH_PATTERNS = [
  /^\/provocare\/challenges\/.+$/,
  /^\/primarie\/[^/]+\/buget\/provocari\/.+$/,
];

export function shouldHideMobileBottomDock(pathname: string): boolean {
  return MOBILE_BOTTOM_DOCK_HIDDEN_PATH_PATTERNS.some((pattern) =>
    pattern.test(pathname),
  );
}
