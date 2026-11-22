export type BackgroundSource = "image" | "procedural";

export const BACKGROUND_SOURCE: BackgroundSource = "image";
export const ENABLE_3D_SHIP = true;

// Ship orientation: +Z is the front (nose), -Z is engines.
export const forwardSign: 1 | -1 = 1;

// ── Tunable hero ship constants ──────────────────────────────────────
// Scale of the ship model in the hero (world units).
export const scale = 1;

// Hero dwell position: the ship sits in the right half of the hero.
// x > 0 pushes right, y adjusts vertical, z adjusts depth.
export const HERO_SHIP_POSITION: readonly [number, number, number] = [1.5, -0.1, 0];

// Hero-only size multiplier; fades back to 1 as the ship leaves the hero.
export const HERO_SHIP_SCALE = 2.5;

// Three-quarter rotation (radians): nose toward upper-right.
// [pitch, yaw, roll] — yaw rotates nose right, pitch tilts nose up.
export const HERO_SHIP_ROTATION: readonly [number, number, number] = [-0.15, 0.55, 0.08];

// Idle bob amplitude (world units) and speed (radians/s).
export const HERO_BOB_AMPLITUDE = 0.06;
export const HERO_BOB_SPEED = 0.7;

// Nozzle centers in local model coordinates.
export const nozzleOffsets: readonly [number, number, number][] = [
  [-0.16, -0.04, -0.78],
  [0.16, -0.04, -0.78],
];

// Model's long axis for the preview scan.
export const scanAxis: readonly [number, number, number] = [0, 0, 1];

// ── Hardware gate ────────────────────────────────────────────────────
// Low-power threshold: hardwareConcurrency <= this value triggers fallback.
export const LOW_POWER_CORE_THRESHOLD = 2;
