import { Vector3, Quaternion } from "three";
import {
  createCinematicSegment,
  sampleCinematicSegment,
  type CinematicPose,
} from "./cinematicFlight.ts";
import type { ReturnPhase } from "./stationReturnStatus.ts";
export { stationReturnStatus } from "./stationReturnStatus.ts";
export const RETURN_TIMING = {
  departure: 700,
  hyperspace: 650,
  minimumPrepare: 250,
  maximumPrepare: 2200,
  approach: 1800,
};
export const createStationReturn = () => ({
  phase: "idle" as ReturnPhase,
  started: 0,
  reset: false,
});
export function cancelStationReturn(
  state: ReturnType<typeof createStationReturn>,
) {
  Object.assign(state, createStationReturn());
}
export function canStartStationReturn(phase: ReturnPhase, section: string) {
  return phase === "idle" && section === "contact";
}
export function advanceStationReturn(
  state: ReturnType<typeof createStationReturn>,
  now: number,
  ready: boolean,
) {
  const elapsed = now - state.started;
  const duration =
    state.phase === "departing"
      ? RETURN_TIMING.departure
      : state.phase === "hyperspace"
        ? RETURN_TIMING.hyperspace
        : state.phase === "approach"
          ? RETURN_TIMING.approach
          : Infinity;
  if (
    elapsed >= duration ||
    (state.phase === "preparing" &&
      elapsed >= RETURN_TIMING.minimumPrepare &&
      (ready || elapsed >= RETURN_TIMING.maximumPrepare))
  ) {
    state.phase =
      state.phase === "departing"
        ? "hyperspace"
        : state.phase === "hyperspace"
          ? "preparing"
          : state.phase === "preparing"
            ? "approach"
            : "idle";
    state.started = now;
  }
  return state.phase;
}
export function returnDeparture(from: CinematicPose) {
  const to = {
    position: from.position.clone().add(new Vector3(0.8, 0.7, -13)),
    quaternion: new Quaternion().setFromUnitVectors(
      new Vector3(0, 0, 1),
      new Vector3(0.1, 0.1, -1).normalize(),
    ),
    scale: from.scale,
  };
  return createCinematicSegment(
    from,
    to,
    from.position.clone().add(new Vector3(0.3, 0.2, -2)),
    to.position.clone().add(new Vector3(-0.2, 0, 3)),
    -0.25,
  );
}
/** A distinct clockwise, two-leg XYZ approach. No ordinary destination path changes. */
export function stationApproach(home: CinematicPose) {
  const far = {
    position: home.position.clone().add(new Vector3(-3, 2.5, -14)),
    quaternion: new Quaternion().setFromUnitVectors(
      new Vector3(0, 0, 1),
      new Vector3(1, 0, 0.3).normalize(),
    ),
    scale: home.scale,
  };
  const turn = {
    position: home.position.clone().add(new Vector3(2, 0.7, -3)),
    quaternion: new Quaternion().setFromUnitVectors(
      new Vector3(0, 0, 1),
      new Vector3(-0.6, -0.5, 0.7).normalize(),
    ),
    scale: home.scale,
  };
  return [
    createCinematicSegment(
      far,
      turn,
      home.position.clone().add(new Vector3(-1, 4, -11)),
      home.position.clone().add(new Vector3(3, 3, -6)),
      0.48,
    ),
    createCinematicSegment(
      turn,
      home,
      home.position.clone().add(new Vector3(2, -0.4, -1.5)),
      home.position.clone().add(new Vector3(0.2, -0.5, -0.3)),
      -0.3,
    ),
  ];
}
export function sampleStationApproach(
  path: ReturnType<typeof stationApproach>,
  progress: number,
  out: CinematicPose,
) {
  const t = Math.max(0, Math.min(1, progress));
  return sampleCinematicSegment(
    path[t < 0.55 ? 0 : 1],
    t < 0.55 ? t / 0.55 : (t - 0.55) / 0.45,
    out,
  );
}
