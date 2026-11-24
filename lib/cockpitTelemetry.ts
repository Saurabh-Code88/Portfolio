/** Measured horizontal travel, independent of document height and nested scrolling. */
export function journeyCompletion(x: number, first: number, last: number) {
  if (![x, first, last].every(Number.isFinite) || last <= first) return 0;
  return Math.round(Math.max(0, Math.min(1, (x - first) / (last - first))) * 100);
}

export function flightReadout(phase: string, isParked: boolean, atHero: boolean) {
  if (phase === "approach" || phase === "orbit") return "approach";
  if (phase === "settle") return "arrived";
  if (phase !== "idle") return "transit";
  if (atHero) return "docked";
  return isParked ? "arrived" : "transit";
}
