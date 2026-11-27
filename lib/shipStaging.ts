import { Quaternion, Vector3 } from "three";
import type { FlightSectionId } from "./flightPath.ts";
import type { CinematicPose } from "./cinematicFlight.ts";

type Point = readonly [number, number, number];
type SafeRegion = readonly [number, number, number, number];
export type DestinationStage = {
  id: FlightSectionId;
  anchor: readonly [number, number];
  depth: number;
  scale: number;
  nose: Point;
  levitation: number;
  period: number;
  axialPeriod: number;
  bank: number;
  profile: string;
  departure: Point;
  entry: Point;
  content: SafeRegion;
};
/** Screen fractions use top-left origin; curve controls store camera depth, not world Z. */
export const DESTINATION_STAGES = [
  {
    id: "hero",
    anchor: [0.5, 0.5],
    depth: 8.35,
    scale: 1,
    nose: [0, 1, 0],
    levitation: 0,
    period: 6,
    axialPeriod: 44,
    bank: 0,
    profile: "docked",
    departure: [0.6, 0.3, 16],
    entry: [0.5, 0.5, 9],
    content: [0, 0, 1, 1],
  },
  {
    id: "toolkit",
    anchor: [0.5, 0.8],
    depth: 8.8,
    scale: 1.37,
    nose: [0.94, 0.03, 0.34],
    levitation: 0.05,
    period: 6,
    axialPeriod: 34,
    bank: -0.2,
    profile: "undock and bank",
    departure: [0.63, 0.53, 19],
    entry: [0.28, 0.72, 16],
    content: [0.05, 0.14, 0.95, 0.64],
  },
  {
    id: "projects",
    anchor: [0.16, 0.51],
    depth: 9.6,
    scale: 1.37,
    nose: [0.03, 0.96, 0.28],
    levitation: 0.05,
    period: 5.6,
    axialPeriod: 36,
    bank: 0.27,
    profile: "diagonal depth climb",
    departure: [0.25, 0.28, 22],
    entry: [0.15, 0.74, 18],
    content: [0.32, 0.14, 0.95, 0.88],
  },
  {
    id: "research",
    anchor: [0.84, 0.51],
    depth: 10,
    scale: 1.37,
    nose: [-0.28, 0.91, 0.31],
    levitation: 0.05,
    period: 6.4,
    axialPeriod: 38,
    bank: -0.28,
    profile: "receding broad sweep",
    departure: [0.61, 0.33, 24],
    entry: [0.9, 0.74, 18],
    content: [0.05, 0.14, 0.67, 0.88],
  },
  {
    id: "experience",
    anchor: [0.5, 0.8],
    depth: 7.8,
    scale: 1.37,
    nose: [-0.94, 0.03, 0.34],
    levitation: 0.045,
    period: 5.8,
    axialPeriod: 32,
    bank: 0.31,
    profile: "descending flyby",
    departure: [0.3, 0.63, 16],
    entry: [0.72, 0.73, 7],
    content: [0.05, 0.14, 0.95, 0.64],
  },
  {
    id: "contact",
    anchor: [0.17, 0.51],
    depth: 9.4,
    scale: 1.37,
    nose: [0.18, 0.95, 0.26],
    levitation: 0.05,
    period: 6.6,
    axialPeriod: 40,
    bank: -0.12,
    profile: "rising diagonal glide",
    departure: [0.17, 0.4, 17],
    entry: [0.13, 0.72, 13],
    content: [0.33, 0.18, 0.94, 0.85],
  },
] as const satisfies readonly DestinationStage[];

export function stageWorldPoint(point: Point, aspect: number, fov: number) {
  const [x, y, depth] = point,
    half = depth * Math.tan((fov * Math.PI) / 360);
  return new Vector3(
    (x * 2 - 1) * half * aspect,
    (1 - y * 2) * half,
    8 - depth,
  );
}
export function restingPose(
  index: number,
  aspect: number,
  fov: number,
): CinematicPose {
  const stage = DESTINATION_STAGES[index];
  return {
    position: stageWorldPoint([...stage.anchor, stage.depth], aspect, fov),
    quaternion: new Quaternion().setFromUnitVectors(
      new Vector3(0, 0, 1),
      new Vector3(...stage.nose).normalize(),
    ),
    // Bounded reduction for the dense 1024px composition. Home is supplied by the dock owner.
    scale: stage.scale * (aspect < 1.44 ? 0.95 : 1),
  };
}
export const createShipIdle = () => ({
  index: -1,
  elapsed: 0,
  weight: 0,
  angle: 0,
});
export type ShipIdle = ReturnType<typeof createShipIdle>;
const axial = new Vector3(0, 0, 1);
/** Called by the existing transform owner only. Base pose is freshly sampled each frame. */
export function applyShipIdle(
  state: ShipIdle,
  index: number,
  delta: number,
  pose: CinematicPose,
  rotation: Quaternion,
) {
  if (index < 0) {
    state.index = -1;
    state.elapsed = 0;
    state.weight = 0;
    state.angle = 0;
    return;
  }
  if (state.index !== index) {
    state.index = index;
    state.elapsed = 0;
    state.weight = 0;
  }
  const stage = DESTINATION_STAGES[index];
  state.elapsed += Math.min(delta, 0.25);
  state.weight = Math.min(1, state.elapsed / 1.2);
  const blend = state.weight * state.weight * (3 - 2 * state.weight);
  state.angle = (state.elapsed * Math.PI * 2) / stage.axialPeriod;
  pose.position.y +=
    Math.sin((state.elapsed * Math.PI * 2) / stage.period) *
    stage.levitation *
    blend;
  rotation.setFromAxisAngle(axial, state.angle * blend);
  pose.quaternion.multiply(rotation).normalize();
}
