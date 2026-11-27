/** Desktop eligibility is independent of WebGL availability. */
export function canUseBackgroundJourney(desktopJourney: boolean, width: number,
  reducedMotion: boolean, reducedData: boolean, lowPower: boolean, imageSource: boolean) {
  return desktopJourney && width >= 1024 && !reducedMotion && !reducedData && !lowPower && imageSource;
}

/** A maximum 1.2% horizontal displacement fits inside the 2% video overscan. */
export function videoParallax(x: number, distance: number, width: number) {
  const progress = Math.max(0, Math.min(1, x / Math.max(1, distance)));
  return progress === 0 ? 0 : -progress * width * .012;
}

/** Keep the Home station mounted, departing completely before Toolkit. */
export function stationDeparture(x: number, home: number, toolkit: number) {
  if (toolkit <= home) return 0;
  const travel = (x - home) / (toolkit - home);
  const t = Math.max(0, Math.min(1, (travel - .02) / .8));
  return t * t * (3 - 2 * t);
}
