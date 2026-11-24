/** Select a section from ordered start boundaries, with a small reversal deadband. */
export function selectActiveSection(
  starts: readonly number[],
  position: number,
  previous: number = -1,
  tolerance = 12,
) {
  if (!starts.length) return -1;
  let candidate = 0;
  for (let index = 1; index < starts.length; index += 1) {
    if (position >= starts[index]) candidate = index;
  }
  if (previous >= 0 && previous < starts.length && candidate !== previous) {
    const boundary = candidate > previous ? starts[previous + 1] : starts[previous];
    if (Math.abs(position - boundary) <= tolerance) return previous;
  }
  return candidate;
}
