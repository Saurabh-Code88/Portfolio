export type StationBreakpointName = "desktop" | "tablet";
export type StationTransform = {
  scale: number;
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
  dockPoint: readonly [number, number, number];
  widthFraction: number;
};

// Position X/Y are fractions of the camera frustum; Z is a world-space offset.
export const STATION_SCALE = 1;
export const STATION_DIAMETER = 4.6;
export const STATION_POSITION: readonly [number, number, number] = [0.27, -0.12, -0.35];
export const STATION_ROTATION: readonly [number, number, number] = [0, 0, 0];
export const DOCK_POINT: readonly [number, number, number] = [0, 0.76, 0];
export const STATION_YAW_DRIFT = 0.00012;
export const STATION_HEIGHT_RATIO = 0.35 / 1.19;
export const DOCK_HOVER_HEIGHT = 1.65;

export const STATION_BREAKPOINT_OVERRIDES: Record<StationBreakpointName, StationTransform & { minWidth: number }> = {
  desktop: {
    minWidth: 1024,
    scale: 1,
    position: STATION_POSITION,
    rotation: STATION_ROTATION,
    dockPoint: DOCK_POINT,
    widthFraction: 0.45,
  },
  tablet: {
    minWidth: 768,
    scale: 1,
    position: [0.27, -0.13, -0.35],
    rotation: [0, 0, 0],
    dockPoint: DOCK_POINT,
    widthFraction: 0.45,
  },
};

export const STATION_POD_GLOW_OFFSETS: readonly (readonly [number, number, number])[] = [
  [-0.78, 0.08, 0],
  [0.78, 0.08, 0],
];
export const STATION_DOCK_LIGHT_OFFSET: readonly [number, number, number] = [0, 0.28, 0];
