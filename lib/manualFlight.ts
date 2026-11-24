export type ManualFlightSample = {
  x: number; y: number; scale: number; bank: number; pitch: number;
  departure: number; segment: number; local: number;
  phase: "undock" | "travel" | "approach" | "settle" | "idle";
};

const ease = (t: number) => t * t * t * (10 + t * (-15 + 6 * t));

/** Reversible, allocation-free screen-space arc. All derivatives vanish at section stops. */
export function sampleManualFlight(
  progress: number, stops: readonly number[], parkX: number, parkY: number,
  parkScale: number, arcWidth: number, arcHeight: number, bank: number,
  result: ManualFlightSample,
) {
  const p = Math.max(0, Math.min(1, progress));
  let segment = Math.max(0, stops.length - 2);
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (p <= stops[i + 1]) { segment = i; break; }
  }
  const local = Math.max(0, Math.min(1, (p - stops[segment]) / Math.max(0.000001, stops[segment + 1] - stops[segment])));
  const t = ease(local);
  // A clockwise outward/upward approach arc, returning to the exact parking pose.
  const envelope = Math.sin(Math.PI * t) ** 2;
  result.x = parkX - arcWidth * envelope * Math.sin(Math.PI * 2 * t);
  result.y = parkY - arcHeight * envelope;
  result.scale = parkScale * (1 - 0.1 * envelope);
  result.bank = bank * envelope * Math.cos(Math.PI * t);
  result.pitch = 0.25 * envelope * Math.sin(Math.PI * 2 * t);
  result.departure = segment === 0 ? ease(Math.min(1, local / 0.7)) : 1;
  result.segment = segment;
  result.local = local;
  result.phase = local < 0.00001 || local > 0.99999 ? "idle"
    : local < 0.18 ? "undock" : local < 0.65 ? "travel" : local < 0.9 ? "approach" : "settle";
  return result;
}
