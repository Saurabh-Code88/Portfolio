export const CINEMATIC_ANCHORS = [
  { id: "hero", video: 0, x: 0.85, y: 0.5, depth: 8.35, bank: 0 },
  { id: "toolkit", video: 0.17, x: 0.88, y: 0.22, depth: 8.8, bank: -0.16 },
  { id: "projects", video: 0.38, x: 0.89, y: 0.23, depth: 9.6, bank: 0.22 },
  { id: "research", video: 0.6, x: 0.86, y: 0.19, depth: 10, bank: -0.24 },
  { id: "experience", video: 0.81, x: 0.9, y: 0.24, depth: 7.8, bank: 0.28 },
  { id: "contact", video: 1, x: 0.87, y: 0.19, depth: 9.4, bank: -0.1 },
] as const;
export const CINEMATIC_VIDEO_MOMENTS = CINEMATIC_ANCHORS.map(a => a.video);
export type MeasuredPanel = { id: string; offset: number };
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const easeCinematic = (n: number) => {
  const t = clamp01(n);
  return t * t * t * (10 + t * (-15 + 6 * t));
};
/** Continuous section coordinate in [0,5], from actual measured horizontal offsets. */
export function cinematicCoordinate(
  x: number,
  panels: readonly MeasuredPanel[],
) {
  if (panels.length < 2) return 0;
  for (let i = 0; i < panels.length - 1; i++) {
    if (x <= panels[i + 1].offset)
      return (
        i +
        clamp01(
          (x - panels[i].offset) /
            Math.max(1, panels[i + 1].offset - panels[i].offset),
        )
      );
  }
  return panels.length - 1;
}
/** Monotonic configurable chronological moments; never seek the unrenderable duration endpoint. */
export function cinematicVideoTime(
  coordinate: number,
  duration: number,
  moments: readonly number[] = CINEMATIC_VIDEO_MOMENTS,
) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  const c = Math.max(0, Math.min(moments.length - 1, coordinate));
  const i = Math.min(moments.length - 2, Math.floor(c));
  const fraction = moments[i] + (moments[i + 1] - moments[i]) * (c - i);
  return fraction * Math.max(0, duration - 1 / 120);
}
/** A skipped destination uses one transit parameter rather than intermediate arrivals. */
export function cinematicTransitProgress(
  progress: number,
  from: number,
  to: number,
) {
  return Math.abs(to - from) < 1e-8
    ? 1
    : clamp01((progress - from) / (to - from));
}

/** Native scroll quantization must not leave a completed HUD flight owned forever. */
export function cinematicTransitArrived(progress:number,target:number,distance:number) {
  return Math.abs(progress-target)*Math.max(1,distance)<=1;
}
