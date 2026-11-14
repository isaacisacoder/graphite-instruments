import { useSyncExternalStore } from "react";
import { routeFromHash } from "./catalog";
function subscribe(change: () => void) {
  window.addEventListener("hashchange", change);
  return () => window.removeEventListener("hashchange", change);
}
// React rechecks after subscribing, including hash changes during initial rendering.
export function useRoute() {
  return useSyncExternalStore(subscribe, routeFromHash);
}
