// Query-string state shared by client pages: replaceState + a listener set, read
// through useSyncExternalStore so Back/Forward and shared links restore the view.
// ---- URL-backed state ----
const urlListeners = new Set<() => void>();
export function subscribeUrl(cb: () => void) {
  urlListeners.add(cb);
  window.addEventListener("popstate", cb); // Back / Forward
  return () => {
    urlListeners.delete(cb);
    window.removeEventListener("popstate", cb);
  };
}
/** Update query params in place (replaceState: filter tweaks don't pile up in history). */
export function setUrl(changes: Record<string, string>) {
  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(changes)) {
    if (v) params.set(k, v);
    else params.delete(k);
  }
  const qs = params.toString().replace(/%2C/g, ","); // keep lists readable: ?u=a,b
  const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(window.history.state, "", url);
    urlListeners.forEach((l) => l());
  }
}
