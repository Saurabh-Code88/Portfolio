// Station model axes: +Y is up and the saucer lies flat, so no correction rotation is needed.
export const STATION_SCALE = 1;
export const STATION_DIAMETER = 4.6;
export const STATION_POSITION: readonly [number, number, number] = [3.2, -0.8, -0.35];
export const STATION_ROTATION: readonly [number, number, number] = [0, 0, 0];
// Local point above the station's top centre. The freighter's engine end hovers above this point.
export const DOCK_POINT: readonly [number, number, number] = [0, 0.76, 0];
export const STATION_POD_GLOW_OFFSETS: readonly (readonly [number, number, number])[] = [
  [-0.78, 0.08, 0],
  [0.78, 0.08, 0],
];
export const STATION_DOCK_LIGHT_OFFSET: readonly [number, number, number] = [0, 0.28, 0];
