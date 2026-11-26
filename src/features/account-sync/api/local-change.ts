export type Collection = "recipes" | "businesses";
export type LocalChange =
  | { collection: Collection; op: "save"; id: string; name: string; data: Record<string, unknown> }
  | { collection: Collection; op: "delete"; id: string };

const EVENT = "squished:local-change";
const SYNCED = "squished:synced";

/** Saved recipes/businesses changed on this device; the account sync (if on) mirrors it. */
export function emitLocalChange(change: LocalChange) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<LocalChange>(EVENT, { detail: change }));
}

export function onLocalChange(cb: (c: LocalChange) => void) {
  const h = (e: Event) => cb((e as CustomEvent<LocalChange>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

/** Local copies were refreshed from the account; lists on screen should reload. */
export const emitSynced = () => window.dispatchEvent(new Event(SYNCED));
export function onSynced(cb: () => void) {
  window.addEventListener(SYNCED, cb);
  return () => window.removeEventListener(SYNCED, cb);
}
