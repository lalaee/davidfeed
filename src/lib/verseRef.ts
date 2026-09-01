/**
 * "v 1", "v 1-3", "v 1, 4-5". Runs are collapsed because a multi-verse
 * selection is usually contiguous, and "v 3-9" is what a person would write
 * where a list of seven numbers is what a loop would produce.
 *
 * Shared by the reader, which formats the selection under the thumb, and the
 * Library, which formats a saved run back out of storage.
 */
export function formatVerseRange(numbers: number[]): string {
  if (!numbers.length) return "";
  const runs: string[] = [];
  let start = numbers[0];
  let prev = numbers[0];
  for (const n of numbers.slice(1).concat(NaN)) {
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    runs.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = n;
  }
  return `v ${runs.join(", ")}`;
}
