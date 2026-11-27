/** Measured horizontal pixels, sampled by the existing scene frame (no scroll listener). */
export const createShipArrival = () => ({
  x: NaN,
  changedAt: 0,
  index: -1,
  elapsed: 0,
  moving: true,
});
export function updateShipArrival(
  state: ReturnType<typeof createShipArrival>,
  x: number,
  offsets: readonly number[],
  width: number,
  now: number,
  delta: number,
  navigating: boolean,
) {
  if (!Number.isFinite(state.x) || Math.abs(x - state.x) > 0.35) {
    state.x = x;
    state.changedAt = now;
  }
  state.moving = now - state.changedAt < 0.28;
  let nearest = 0;
  offsets.forEach((offset, i) => {
    if (Math.abs(x - offset) < Math.abs(x - offsets[nearest])) nearest = i;
  });
  const gap = Math.min(
    offsets[nearest] - (offsets[nearest - 1] ?? -Infinity),
    (offsets[nearest + 1] ?? Infinity) - offsets[nearest],
  );
  // A bounded 8% viewport region, capped by the actual measured panel interval.
  const eligible =
    Math.abs(x - offsets[nearest]) <= Math.min(width * 0.08, gap * 0.1);
  const index = eligible && !state.moving && !navigating ? nearest : -1;
  if (index !== state.index) {
    state.index = index;
    state.elapsed = 0;
  }
  if (index >= 0) state.elapsed += Math.min(delta, 0.25);
  else state.elapsed = 0;
  const t = Math.min(1, state.elapsed / 0.85);
  return { index, eligible, moving: state.moving, blend: t * t * (3 - 2 * t) };
}
