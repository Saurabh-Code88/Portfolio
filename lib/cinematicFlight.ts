import {
  DESTINATION_STAGES,
  restingPose,
  stageWorldPoint,
} from "./shipStaging.ts";
import { CubicBezierCurve3, Matrix4, Quaternion, Vector3 } from "three";
import { clamp01, easeCinematic } from "./cinematicTimeline.ts";
export type CinematicPose = {
  position: Vector3;
  quaternion: Quaternion;
  scale: number;
};
export const createCinematicPose = (): CinematicPose => ({
  position: new Vector3(),
  quaternion: new Quaternion(),
  scale: 0.78,
});
const forward = new Vector3(0, 0, 1),
  up = new Vector3(0, 1, 0),
  origin = new Vector3();
/** Curve geometry and orientation samples are constructed only on layout/navigation changes. */
export function createCinematicSegment(
  from: CinematicPose,
  to: CinematicPose,
  control1: Vector3,
  control2: Vector3,
  bank: number,
) {
  const curve = new CubicBezierCurve3(
    from.position.clone(),
    control1.clone(),
    control2.clone(),
    to.position.clone(),
  );
  const rotations: Quaternion[] = [];
  const matrix = new Matrix4(),
    tangent = new Vector3(),
    roll = new Quaternion();
  const before = new Vector3(),
    after = new Vector3();
  const times = [0, 0.2, 0.48, 0.76, 1];
  const keys = times.map((t, i) => {
    if (i === 0) return from.quaternion.clone();
    if (i === times.length - 1) return to.quaternion.clone();
    curve.getTangent(easeCinematic(t), tangent);
    curve.getTangent(Math.max(0, easeCinematic(t) - 0.025), before);
    curve.getTangent(Math.min(1, easeCinematic(t) + 0.025), after);
    const curvature = Math.max(
      -1,
      Math.min(1, before.cross(after).dot(up) * 3),
    );
    return new Quaternion()
      .setFromRotationMatrix(matrix.lookAt(tangent, origin, up))
      .multiply(
        roll.setFromAxisAngle(
          forward,
          (bank * 0.5 + curvature * 0.2) * Math.sin(Math.PI * t) ** 2,
        ),
      );
  });
  // Sequential quaternion keyframes avoid hemisphere flips from re-blending a changing look direction.
  for (let i = 0; i <= 128; i++) {
    const t = i / 128;
    let key = 0;
    while (key < times.length - 2 && t > times[key + 1]) key++;
    rotations.push(
      keys[key]
        .clone()
        .slerp(
          keys[key + 1],
          easeCinematic((t - times[key]) / (times[key + 1] - times[key])),
        )
        .normalize(),
    );
  }
  return { curve, rotations, fromScale: from.scale, toScale: to.scale };
}
export type CinematicSegment = ReturnType<typeof createCinematicSegment>;
export function sampleCinematicSegment(
  segment: CinematicSegment,
  local: number,
  out: CinematicPose,
) {
  const t = clamp01(local),
    sample = t * 128,
    index = Math.min(127, Math.floor(sample));
  segment.curve.getPoint(easeCinematic(t), out.position);
  out.quaternion.slerpQuaternions(
    segment.rotations[index],
    segment.rotations[index + 1],
    sample - index,
  );
  out.scale =
    segment.fromScale +
    (segment.toScale - segment.fromScale) * easeCinematic(t);
  return out;
}
/** Fixed existing perspective camera; screen-safe anchor composition, actual world-space Z. */
export function createCinematicFlight(
  aspect: number,
  fov: number,
  home: CinematicPose,
) {
  const anchors = DESTINATION_STAGES.map((_, i) =>
    i === 0
      ? {
          position: home.position.clone(),
          quaternion: home.quaternion.clone(),
          scale: home.scale,
        }
      : restingPose(i, aspect, fov),
  );
  const segments = DESTINATION_STAGES.slice(1).map((stage, i) =>
    createCinematicSegment(
      anchors[i],
      anchors[i + 1],
      stageWorldPoint(DESTINATION_STAGES[i].departure, aspect, fov),
      stageWorldPoint(stage.entry, aspect, fov),
      stage.bank,
    ),
  );
  return { anchors, segments };
}
export function sampleCinematicFlight(
  path: ReturnType<typeof createCinematicFlight>,
  coordinate: number,
  out: CinematicPose,
) {
  const c = Math.max(0, Math.min(path.segments.length, coordinate));
  const i = Math.min(path.segments.length - 1, Math.floor(c));
  return sampleCinematicSegment(path.segments[i], c - i, out);
}
export function createCinematicTransit(
  from: CinematicPose,
  to: CinematicPose,
  entry?: Vector3,
  bank = 0.15,
) {
  const a = from.position.clone().lerp(to.position, 0.3),
    b = from.position.clone().lerp(to.position, 0.76);
  const depth = Math.min(from.position.z, to.position.z) - 5;
  a.z = depth;
  b.z = depth;
  if (entry) b.copy(entry);
  a.y += 0.7;
  b.y += 0.25;
  return createCinematicSegment(from, to, a, b, bank);
}
/** Progress-based handoff holds on interruption; no timed catch-up while stationary. */
export function blendCinematicHandoff(
  from: CinematicPose,
  to: CinematicPose,
  weight: number,
  out: CinematicPose,
) {
  const t = easeCinematic(weight);
  out.position.lerpVectors(from.position, to.position, t);
  if (out === to) out.quaternion.slerp(from.quaternion, 1 - t);
  else out.quaternion.slerpQuaternions(from.quaternion, to.quaternion, t);
  out.scale = from.scale + (to.scale - from.scale) * t;
  return out;
}
