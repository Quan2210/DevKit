/**
 * Guards async work so a slow, older result never overwrites a newer one:
 * call `begin()` before starting, and apply the result only if `isLatest(id)`.
 */
export function createLatestWins() {
  let current = 0;
  return {
    begin(): number {
      current += 1;
      return current;
    },
    isLatest(id: number): boolean {
      return id === current;
    },
  };
}
