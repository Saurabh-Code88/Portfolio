export const BACKGROUND_JOURNEY = {
  nebulaUrl: "/backgrounds/nebula.webp",
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

export type Environment = {
  sectionId: string; asset: string; focalPoint: string;
  transitionRange: readonly [number, number]; travelDistance: number;
  parallax: number; drift: number; contrast: number;
  foregroundLayers?: readonly string[];
};
export const ENVIRONMENTS: readonly Environment[] = [
  { sectionId: "hero", asset: "planetary-sunrise", focalPoint: "center 58%", transitionRange: [.08, .98], travelDistance: .12, parallax: .012, drift: .2, contrast: .40 },
  { sectionId: "toolkit", asset: "nebula", focalPoint: "center", transitionRange: [.08, .98], travelDistance: .14, parallax: .018, drift: .35, contrast: .48 },
  { sectionId: "projects", asset: "asteroid-belt", focalPoint: "58% center", transitionRange: [.08, .98], travelDistance: .18, parallax: .03, drift: .15, contrast: .52 },
  { sectionId: "research", asset: "ringed-gas-giant", focalPoint: "60% center", transitionRange: [.08, .98], travelDistance: .10, parallax: .01, drift: .12, contrast: .48 },
  { sectionId: "experience", asset: "black-hole", focalPoint: "60% center", transitionRange: [.08, .98], travelDistance: .12, parallax: .014, drift: .1, contrast: .46 },
  { sectionId: "contact", asset: "spiral-galaxy", focalPoint: "center", transitionRange: [.08, .98], travelDistance: .10, parallax: .008, drift: .12, contrast: .40 },
];
export function environmentComposition(x: number, panels: readonly { id: string; offset: number }[], ready: readonly boolean[]) {
  const weights = ENVIRONMENTS.map(() => 0);
  let segment = 0;
  while (segment < panels.length - 2 && x >= panels[segment + 1].offset) segment++;
  const from = panels[segment];
  const to = panels[segment + 1];
  const blend = from && to ? backgroundBlend(x, from.offset, to.offset, ...ENVIRONMENTS[segment].transitionRange) : 0;
  weights[segment] = 1 - blend;
  if (to) weights[segment + 1] = blend;
  // Missing/failed destinations retain the nearest decoded region, including reverse travel.
  for (let i = 0; i < weights.length; i++) {
    if (ready[i] || !weights[i]) continue;
    let nearest = -1;
    for (let j = 0; j < ready.length; j++) if (ready[j] && (nearest < 0 || Math.abs(j-i) < Math.abs(nearest-i))) nearest = j;
    if (nearest >= 0) weights[nearest] += weights[i];
    weights[i] = 0;
  }
  return weights;
}
export function stationDeparture(x: number, home: number, toolkit: number) {
  return backgroundBlend(x, home, toolkit, .02, .82);
}
