export const JOURNEY_SCROLL_FACTOR = 3;
export const JOURNEY_RESPONSE = 10;
export function smoothJourneyPosition(current: number, target: number, seconds: number) {
  const next = current + (target - current) * (1 - Math.exp(-JOURNEY_RESPONSE * Math.max(0, Math.min(.1, seconds))));
  return Math.abs(target - next) < .1 ? target : next;
}
export function arrivalExpansion(progress: number) {
  const t = Math.max(0, Math.min(1, (progress - .82) / .18));
  return t * t * (3 - 2 * t);
}
export function fluidRevealStyle(progress: number, index: number) {
  const delay = Math.min(index, 5) * .025;
  const t = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
  const eased = t * t * (3 - 2 * t);
  return { opacity: eased, x: .06 + .94 * eased,
    y: .018 + .982 * eased ** 1.35, skew: Math.sin(Math.PI * t) * (1 - t) * 7 };
}
