/*
 * Ephemeral UI state shared across the route tree. Not persisted — this is
 * the in-memory sibling of the localStorage stores in stores.ts, with the
 * same useSyncExternalStore shape so components read it the same way.
 */
function makeFlag(initial: boolean) {
  const listeners = new Set<() => void>();
  let value = initial;
  return {
    read: () => value,
    serverSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next: boolean) {
      if (value === next) return;
      value = next;
      listeners.forEach((l) => l());
    },
  };
}

/*
 * Whether something else owns the bottom slot right now.
 *
 * The bottom nav lives in the root layout so that it survives navigation —
 * that is what lets its selected pill glide from tab to tab instead of being
 * remounted with the page. The cost is that a page can no longer decide not
 * to render it. The Bible reader's sheets (books, compare) float in exactly
 * the nav's slot and used to be the reason it withheld the nav; now it raises
 * this flag while a sheet is open and the nav steps aside.
 */
export const navHiddenStore = makeFlag(false);
