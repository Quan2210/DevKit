import type { ReactNode } from "react";
import { useIsClient } from "../../hooks/useIsClient";

/**
 * Renders `children()` only in the browser after hydration. Everything that touches
 * window, localStorage, DOMParser or a heavy library goes behind this boundary so the
 * prerender (Node) only emits the fallback and never fails or mismatches.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: () => ReactNode;
  fallback?: ReactNode;
}) {
  return useIsClient() ? <>{children()}</> : <>{fallback}</>;
}
