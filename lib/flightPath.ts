import { CatmullRomCurve3, Vector2, Vector3 } from "three";
import { getHorizontalJourneySectionStops } from "@/lib/horizontalJourney";

export const FLIGHT_SECTION_IDS = ["hero", "toolkit", "projects", "research", "experience", "contact"] as const;

export type FlightPhase = "undock" | "travel" | "approach" | "orbit" | "settle" | "idle";

// Ship dwell stops beside each section — x offsets keep the ship in the margins,
// never behind a centered content panel. Research sits toward the bright right side.
export const FLIGHT_WAYPOINTS = [
  new Vector3(2.6, -0.1, 0),     // hero — right half (matches HERO_SHIP_POSITION)
  new Vector3(-2.8, 0.6, -0.3),  // toolkit — left margin
  new Vector3(2.8, 0.15, -0.6),  // projects — right margin
  new Vector3(3.2, 0.3, -0.4),   // research — bright right side
  new Vector3(-2.9, -0.3, -0.6), // experience — left margin
  new Vector3(2.4, -0.7, -0.2),  // contact — right margin
];

export const flightCurve = new CatmullRomCurve3(FLIGHT_WAYPOINTS, false, "catmullrom", 0.5);

export type FlightSectionId = (typeof FLIGHT_SECTION_IDS)[number];
export type FlightProgressSnapshot = {
  sectionId: FlightSectionId;
  targetSectionId: FlightSectionId | null;
  progress: number;
  isFlying: boolean;
  isParked: boolean;
  phase: FlightPhase;
};

let flightProgressSnapshot: FlightProgressSnapshot = {
  sectionId: "hero",
  targetSectionId: null,
  progress: 0,
  isFlying: false,
  isParked: false,
  phase: "idle",
};
const flightProgressListeners = new Set<() => void>();

export const flightProgressStore = {
  getSnapshot: () => flightProgressSnapshot,
  subscribe(listener: () => void) {
    flightProgressListeners.add(listener);
    return () => flightProgressListeners.delete(listener);
  },
  publish(next: FlightProgressSnapshot) {
    if (
      Math.abs(next.progress - flightProgressSnapshot.progress) < 0.0005
      && next.sectionId === flightProgressSnapshot.sectionId
      && next.targetSectionId === flightProgressSnapshot.targetSectionId
      && next.isFlying === flightProgressSnapshot.isFlying
      && next.isParked === flightProgressSnapshot.isParked
      && next.phase === flightProgressSnapshot.phase
    ) return;
    flightProgressSnapshot = next;
    flightProgressListeners.forEach((listener) => listener());
  },
};

export function easeInOutCubic(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function smoothstep(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export type OrbitSample = { angle: number; angleRate: number; radiusScale: number; scale: number };

/**
 * Samples the existing clockwise section orbit. The cyclic easing keeps a
 * non-zero, matching tangent at the top entry/exit, avoiding a pause between
 * travel, orbit, and settle while retaining the one-turn choreography.
 */
export function sampleOrbit(
  progress: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  turns: number,
  position: Vector2,
  tangent: Vector2,
  result: OrbitSample,
  radiusInset = 0.15,
  rateVariation = 0.5,
  scaleBase = 0.9,
  scaleAmplitude = 0.1,
) {
  const t = Math.max(0, Math.min(1, progress));
  const eased = t + Math.sin(Math.PI * 2 * t) / (Math.PI * 4);
  const angle = -Math.PI / 2 + Math.PI * 2 * turns * eased;
  const angleRate = Math.PI * 2 * turns * (1 + rateVariation * Math.cos(Math.PI * 2 * t));
  const radiusScale = 1 - radiusInset * smoothstep(t);
  const radiusRate = -radiusInset * 6 * t * (1 - t);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  position.set(
    centerX + cos * radiusX * radiusScale,
    centerY + sin * radiusY * radiusScale,
  );
  tangent.set(
    radiusX * (radiusRate * cos - radiusScale * sin * angleRate),
    radiusY * (radiusRate * sin + radiusScale * cos * angleRate),
  );

  result.angle = angle;
  result.angleRate = angleRate;
  result.radiusScale = radiusScale;
  result.scale = scaleBase + scaleAmplitude * sin;
  return result;
}

export function sampleCubicBezier(
  progress: number,
  start: Vector2,
  control1: Vector2,
  control2: Vector2,
  end: Vector2,
  position: Vector2,
  tangent: Vector2,
) {
  const t = Math.max(0, Math.min(1, progress));
  const inverse = 1 - t;
  const inverseSquared = inverse * inverse;
  const tSquared = t * t;
  position.set(
    inverseSquared * inverse * start.x + 3 * inverseSquared * t * control1.x + 3 * inverse * tSquared * control2.x + tSquared * t * end.x,
    inverseSquared * inverse * start.y + 3 * inverseSquared * t * control1.y + 3 * inverse * tSquared * control2.y + tSquared * t * end.y,
  );
  tangent.set(
    3 * inverseSquared * (control1.x - start.x) + 6 * inverse * t * (control2.x - control1.x) + 3 * tSquared * (end.x - control2.x),
    3 * inverseSquared * (control1.y - start.y) + 6 * inverse * t * (control2.y - control1.y) + 3 * tSquared * (end.y - control2.y),
  );
  return position;
}

export function sampleCubicBezier3(
  progress: number,
  start: Vector3,
  control1: Vector3,
  control2: Vector3,
  end: Vector3,
  position: Vector3,
  tangent: Vector3,
) {
  const t = Math.max(0, Math.min(1, progress));
  const inverse = 1 - t;
  const inverseSquared = inverse * inverse;
  const tSquared = t * t;
  position.set(
    inverseSquared * inverse * start.x + 3 * inverseSquared * t * control1.x + 3 * inverse * tSquared * control2.x + tSquared * t * end.x,
    inverseSquared * inverse * start.y + 3 * inverseSquared * t * control1.y + 3 * inverse * tSquared * control2.y + tSquared * t * end.y,
    inverseSquared * inverse * start.z + 3 * inverseSquared * t * control1.z + 3 * inverse * tSquared * control2.z + tSquared * t * end.z,
  );
  tangent.set(
    3 * inverseSquared * (control1.x - start.x) + 6 * inverse * t * (control2.x - control1.x) + 3 * tSquared * (end.x - control2.x),
    3 * inverseSquared * (control1.y - start.y) + 6 * inverse * t * (control2.y - control1.y) + 3 * tSquared * (end.y - control2.y),
    3 * inverseSquared * (control1.z - start.z) + 6 * inverse * t * (control2.z - control1.z) + 3 * tSquared * (end.z - control2.z),
  );
  return position;
}

export function getFlightSectionId(progress: number, stops: readonly number[]): FlightSectionId {
  const bounded = Math.max(0, Math.min(1, progress));
  for (let index = 0; index < stops.length - 1; index += 1) {
    const midpoint = (stops[index] + stops[index + 1]) / 2;
    if (bounded < midpoint) return FLIGHT_SECTION_IDS[index];
  }
  return FLIGHT_SECTION_IDS[FLIGHT_SECTION_IDS.length - 1];
}

export function getSectionStops(documentHeight: number, viewportHeight: number) {
  const horizontalStops = getHorizontalJourneySectionStops(documentHeight, viewportHeight);
  if (horizontalStops) return horizontalStops;
  const maxScroll = Math.max(1, documentHeight - viewportHeight);
  let previous = 0;
  const stops = FLIGHT_SECTION_IDS.map((id) => {
    const section = id === "hero"
      ? document.querySelector<HTMLElement>("[data-flight-section='hero']")
      : document.getElementById(id);
    if (!section) return previous;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const value = Math.max(previous, Math.min(1, top / maxScroll));
    previous = value;
    return value;
  });
  stops[0] = 0;
  stops[stops.length - 1] = 1;
  return stops;
}

export function sampleFlight(progress: number, stops: readonly number[] = FLIGHT_SECTION_IDS.map((_, i) => i / (FLIGHT_SECTION_IDS.length - 1))) {
  const bounded = Math.max(0, Math.min(1, progress));
  let segment = stops.length - 2;
  for (let index = 0; index < stops.length - 1; index += 1) {
    if (bounded <= stops[index + 1]) {
      segment = index;
      break;
    }
  }
  const start = stops[segment];
  const end = Math.max(start + 0.0001, stops[segment + 1]);
  const local = Math.max(0, Math.min(1, (bounded - start) / (end - start)));
  // Section stops identify where the ship is in the document. They must not
  // ease independently: that creates a stop at every section boundary.
  const curveProgress = (segment + local) / (stops.length - 1);
  return {
    curveProgress,
    warp: Math.sin(Math.PI * local),
    position: flightCurve.getPoint(curveProgress),
    tangent: flightCurve.getTangent(curveProgress).normalize(),
  };
}
