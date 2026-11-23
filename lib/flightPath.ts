import { CatmullRomCurve3, Vector3 } from "three";

export const FLIGHT_SECTION_IDS = ["hero", "toolkit", "projects", "research", "experience", "contact"] as const;

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
  progress: number;
  isFlying: boolean;
  isParked: boolean;
};

let flightProgressSnapshot: FlightProgressSnapshot = {
  sectionId: "hero",
  progress: 0,
  isFlying: false,
  isParked: false,
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
      && next.isFlying === flightProgressSnapshot.isFlying
      && next.isParked === flightProgressSnapshot.isParked
    ) return;
    flightProgressSnapshot = next;
    flightProgressListeners.forEach((listener) => listener());
  },
};

export function getFlightSectionId(progress: number, stops: readonly number[]): FlightSectionId {
  const bounded = Math.max(0, Math.min(1, progress));
  for (let index = 0; index < stops.length - 1; index += 1) {
    const midpoint = (stops[index] + stops[index + 1]) / 2;
    if (bounded < midpoint) return FLIGHT_SECTION_IDS[index];
  }
  return FLIGHT_SECTION_IDS[FLIGHT_SECTION_IDS.length - 1];
}

export function getSectionStops(documentHeight: number, viewportHeight: number) {
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
