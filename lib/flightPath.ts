import { CatmullRomCurve3, Vector3 } from "three";

export const FLIGHT_SECTION_IDS = ["hero", "toolkit", "projects", "research", "experience", "contact"] as const;

// TODO: Adjust these world-space stops by eye. Research sits toward the image's bright, right-hand side.
export const FLIGHT_WAYPOINTS = [
  new Vector3(2.05, -0.48, 0),
  new Vector3(-2.2, 0.85, -0.35),
  new Vector3(2.15, 0.25, -0.7),
  new Vector3(3.1, 0.4, -0.45),
  new Vector3(-2.25, -0.4, -0.7),
  new Vector3(1.8, -0.9, -0.25),
];

export const flightCurve = new CatmullRomCurve3(FLIGHT_WAYPOINTS, false, "catmullrom", 0.5);

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
  const eased = local * local * (3 - 2 * local);
  const curveProgress = (segment + eased) / (stops.length - 1);
  return {
    curveProgress,
    warp: Math.sin(Math.PI * local),
    position: flightCurve.getPoint(curveProgress),
    tangent: flightCurve.getTangent(curveProgress).normalize(),
  };
}
