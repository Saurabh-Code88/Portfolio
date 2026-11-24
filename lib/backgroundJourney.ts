export const BACKGROUND_JOURNEY = {
  nebulaUrl: "/backgrounds/nebula-desktop.webp",
  // Fractions of the measured hero-to-toolkit span, not document scroll pixels.
  transitionStart: 0.08,
  transitionEnd: 0.98,
  parallaxFraction: 0.018,
} as const;

export function backgroundBlend(x: number, heroOffset: number, departureOffset: number,
  start: number = BACKGROUND_JOURNEY.transitionStart, end: number = BACKGROUND_JOURNEY.transitionEnd) {
  const span = departureOffset - heroOffset;
  if (span <= 0 || end <= start) return 0;
  const travel = (x - heroOffset) / span;
  const t = Math.max(0, Math.min(1, (travel - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function canUseBackgroundJourney(desktopJourney: boolean, width: number,
  reducedMotion: boolean, reducedData: boolean, lowPower: boolean, imageSource: boolean) {
  return desktopJourney && width >= 1024 && !reducedMotion && !reducedData && !lowPower && imageSource;
}
