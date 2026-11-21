export type BackgroundSource = "image" | "procedural";

export const BACKGROUND_SOURCE: BackgroundSource = "image";
export const ENABLE_3D_SHIP = true;

// TODO: Inspect the model orientation in /dev/ship and flip this if its nose points toward -Z.
export const forwardSign: 1 | -1 = 1;

// TODO: Tune visually against the roughly 2-unit model length and the hero composition.
export const scale = 1;

// TODO: Confirm nozzle centers against the model geometry; offsets are local model coordinates.
export const nozzleOffsets: readonly [number, number, number][] = [
  [-0.16, -0.04, -0.78],
  [0.16, -0.04, -0.78],
];

// TODO: Confirm the model's long axis with the preview scan.
export const scanAxis: readonly [number, number, number] = [0, 0, 1];
