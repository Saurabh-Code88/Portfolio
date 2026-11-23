const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Finish in the ship's approach interval, before the destination parking stop. */
export function sectionArrivalProgress(x: number, offset: number, width: number) {
  return clamp((0.92 - Math.abs(offset - x) / Math.max(1, width)) / 0.7);
}

export function sectionRevealStyle(progress: number, index: number, heading: boolean) {
  const stagger = heading ? 0 : Math.min(index, 5) * 0.025;
  const t = clamp((progress - stagger) / (1 - stagger));
  const eased = t * t * (3 - 2 * t);
  return {
    // Visible partial states keep text and focus targets readable throughout travel.
    opacity: 0.55 + eased * 0.45,
    scale: heading ? 0.9 + eased * 0.1 : 1,
    y: heading ? 0 : 24 * (1 - eased),
  };
}
