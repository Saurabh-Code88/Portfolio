import { Vector2 } from "three";
import { sampleCubicBezier, sampleOrbit } from "./orbitPath.ts";
import { arrivalExpansion } from "./journeyMotion.ts";
import { ORBIT_RADIUS_INSET, ORBIT_RATE_VARIATION, ORBIT_SCALE_AMPLITUDE, ORBIT_SCALE_BASE, ORBIT_TILT, ORBIT_TURNS, PARK_SCALE } from "./ship.config.ts";

export type ScrollOrbitBounds = { centerX: number; centerY: number; radiusX: number; radiusY: number; left: number; right: number };
const ease = (t: number) => t * t * t * (10 + t * (-15 + 6 * t));
/** Reuses the navigation orbit/Bezier geometry; all scratch objects are allocated once. */
export function createScrollOrbitSample() {
  return {
    position: new Vector2(), tangent: new Vector2(), start: new Vector2(), end: new Vector2(),
    control1: new Vector2(), control2: new Vector2(), orbitPosition: new Vector2(), orbitTangent: new Vector2(),
    orbit: { angle: 0, angleRate: 0, radiusScale: 1, scale: 1 },
    scale: PARK_SCALE, bank: 0, headingWeight: 0, arrival: 0,
    phase: "idle" as "idle" | "travel" | "orbit" | "settle",
  };
}

export function sampleScrollOrbit(local: number, bounds: ScrollOrbitBounds,
  fromX: number, fromY: number, fromScale: number, parkX: number, parkY: number,
  result: ReturnType<typeof createScrollOrbitSample>) {
  const t = Math.max(0, Math.min(1, ease(Math.max(0, Math.min(1, local)))));
  const travelEnd = .28, orbitEnd = .82, orbitSpan = orbitEnd - travelEnd;
  const travel = Math.min(1, t / travelEnd);
  const orbit = Math.max(0, Math.min(1, (t - travelEnd) / orbitSpan));
  const settle = Math.max(0, (t - orbitEnd) / (1 - orbitEnd));
  const info = sampleOrbit(orbit, bounds.centerX, bounds.centerY, bounds.radiusX, bounds.radiusY,
    ORBIT_TURNS, result.orbitPosition, result.orbitTangent, result.orbit,
    ORBIT_RADIUS_INSET, ORBIT_RATE_VARIATION, ORBIT_SCALE_BASE, ORBIT_SCALE_AMPLITUDE);
  if (t < travelEnd) {
    result.start.set(fromX, fromY);
    result.end.copy(result.orbitPosition);
    result.control1.copy(result.start);
    result.control2.copy(result.end).addScaledVector(result.orbitTangent, -travelEnd / (3 * orbitSpan));
    sampleCubicBezier(travel, result.start, result.control1, result.control2, result.end, result.position, result.tangent);
    result.scale = fromScale + (info.scale - fromScale) * ease(travel);
    result.phase = t === 0 ? "idle" : "travel";
  } else if (t <= orbitEnd) {
    result.position.copy(result.orbitPosition);
    result.tangent.copy(result.orbitTangent);
    result.scale = info.scale;
    result.phase = "orbit";
  } else {
    result.start.copy(result.orbitPosition);
    result.end.set(parkX, parkY);
    result.control1.copy(result.start).addScaledVector(result.orbitTangent, (1 - orbitEnd) / (3 * orbitSpan));
    result.control2.copy(result.end);
    sampleCubicBezier(settle, result.start, result.control1, result.control2, result.end, result.position, result.tangent);
    result.scale = info.scale + (PARK_SCALE - info.scale) * ease(settle);
    result.phase = t === 1 ? "idle" : "settle";
  }
  result.headingWeight = ease(Math.min(1, t / .12, (1 - t) / .12));
  result.bank = result.phase === "orbit" ? Math.cos(info.angle) * ORBIT_TILT : 0;
  result.arrival = arrivalExpansion(t);
  return result;
}
