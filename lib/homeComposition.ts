import { Box3, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from "three";
import type { CinematicPose } from "./cinematicFlight.ts";

export const HOME_COMPOSITION = {
  enlargement: 1.8,
  shipEmphasis: 1.2,
  stationPitch: -0.18,
  stationYaw: Math.PI / 2,
  shipAxialAngle: Math.PI / 4,
  top: 96,
  bottom: 68,
  clearance: 0.16,
  depth: 8.35,
};
export const SHIP_HULL = new Box3(
  new Vector3(-0.26, -0.21, -1.01),
  new Vector3(0.26, 0.21, 1.01),
);
export const STATION_HULL = new Box3(
  new Vector3(-2.3, -0.677, -2.3),
  new Vector3(2.3, 0.677, 2.3),
);
/** Project the actual model's local bounding box through its complete display transform. */
export function projectedBounds(
  box: Box3 | readonly Vector3[],
  pose: CinematicPose,
  width: number,
  height: number,
  fov = 48,
) {
  const camera = new PerspectiveCamera(fov, width / height, 0.1, 120);
  camera.position.z = 8;
  camera.updateMatrixWorld();
  const matrix = new Matrix4().compose(
    pose.position,
    pose.quaternion,
    new Vector3().setScalar(pose.scale),
  );
  let left = Infinity,
    right = -Infinity,
    top = Infinity,
    bottom = -Infinity;
  const points =
    box instanceof Box3
      ? [box.min.x, box.max.x].flatMap((x) =>
          [box.min.y, box.max.y].flatMap((y) =>
            [box.min.z, box.max.z].map((z) => new Vector3(x, y, z)),
          ),
        )
      : box;
  const p = new Vector3();
  for (const point of points) {
    p.copy(point).applyMatrix4(matrix).project(camera);
    const px = ((p.x + 1) * width) / 2,
      py = ((1 - p.y) * height) / 2;
    left = Math.min(left, px);
    right = Math.max(right, px);
    top = Math.min(top, py);
    bottom = Math.max(bottom, py);
  }
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}
/** One reusable dock pose. Fit ship and station together; never scale the whole scene. */
export function createHomeComposition(
  width: number,
  height: number,
  shipBox = SHIP_HULL,
  stationBox = STATION_HULL,
  userRotation = new Quaternion(),
  stationPoints: readonly Vector3[] | null = null,
) {
  const c = HOME_COMPOSITION,
    aspect = width / height,
    half = c.depth * Math.tan((48 * Math.PI) / 360);
  const oldStationScale = (2 * half * aspect * 0.44) / 4.6;
  const oldShipScale = 1.2;
  const dockRotation = new Quaternion()
    .setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2)
    .multiply(
      new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), c.shipAxialAngle),
    );
  const stationRotation = new Quaternion()
    .setFromAxisAngle(new Vector3(1, 0, 0), c.stationPitch)
    .multiply(
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), c.stationYaw),
    )
    .multiply(userRotation);
  const rotatedStation = stationPoints
    ? new Box3().setFromPoints(
        stationPoints.map((p) => p.clone().applyQuaternion(stationRotation)),
      )
    : stationBox
        .clone()
        .applyMatrix4(
          new Matrix4().makeRotationFromQuaternion(stationRotation),
        );
  const shipRotated = shipBox
    .clone()
    .applyMatrix4(new Matrix4().makeRotationFromQuaternion(dockRotation));
  const build = (multiplier: number) => {
    const stationScale = oldStationScale * multiplier,
      shipScale = oldShipScale * multiplier * c.shipEmphasis;
    const station = {
      position: new Vector3(0, 0, 8 - c.depth),
      quaternion: stationRotation.clone(),
      scale: stationScale,
    };
    const ship = {
      position: new Vector3(
        0,
        rotatedStation.max.y * stationScale +
          c.clearance * multiplier -
          shipRotated.min.y * shipScale,
        8 - c.depth,
      ),
      quaternion: dockRotation.clone(),
      scale: shipScale,
    };
    // Center the combined projected composition, with a few iterations for perspective depth.
    for (let i = 0; i < 4; i++) {
      const a = projectedBounds(shipBox, ship, width, height),
        b = projectedBounds(
          stationPoints ?? stationBox,
          station,
          width,
          height,
        );
      const center =
        (Math.min(a.top, b.top) + Math.max(a.bottom, b.bottom)) / 2;
      const target = (c.top + height - c.bottom) / 2;
      const shift = ((center - target) / height) * half * 2;
      station.position.y += shift;
      ship.position.y += shift;
    }
    return { ship, station };
  };
  let low = 0.1,
    high = c.enlargement;
  for (let i = 0; i < 18; i++) {
    const m = (low + high) / 2,
      { ship, station } = build(m);
    const a = projectedBounds(shipBox, ship, width, height),
      b = projectedBounds(stationPoints ?? stationBox, station, width, height);
    const fits =
      Math.min(a.top, b.top) >= c.top &&
      Math.max(a.bottom, b.bottom) <= height - c.bottom &&
      Math.min(a.left, b.left) >= width * 0.04 &&
      Math.max(a.right, b.right) <= width * 0.96;
    if (fits) low = m;
    else high = m;
  }
  const result = build(low);
  return {
    ...result,
    multiplier: low,
    shipBounds: projectedBounds(shipBox, result.ship, width, height),
    stationBounds: projectedBounds(
      stationPoints ?? stationBox,
      result.station,
      width,
      height,
    ),
  };
}

/** Keep user-rotated station geometry inside its reserved dock space without moving the ship/path. */
export function fitStationDrag(
  home: ReturnType<typeof createHomeComposition>,
  box: Box3,
  rotation: Quaternion,
  width: number,
  height: number,
  shipBox: Box3,
  points: readonly Vector3[] | null = null,
) {
  const rotated = box
    .clone()
    .applyMatrix4(new Matrix4().makeRotationFromQuaternion(rotation));
  // Use the same measured envelope as the resting fit, including clearance.
  // Empty AABB corners would otherwise shrink the station on the first tiny drag.
  let stationTop = rotated.max.y;
  if (points) {
    stationTop = -Infinity;
    const sample = new Vector3();
    for (const point of points)
      stationTop = Math.max(
        stationTop,
        sample.copy(point).applyQuaternion(rotation).y,
      );
  }
  const shipBottom = shipBox.min.z * home.ship.scale + home.ship.position.y;
  let low = 0,
    high = home.station.scale;
  for (let i = 0; i < 16; i++) {
    const scale = (low + high) / 2;
    const b = projectedBounds(
      points ?? box,
      { position: home.station.position, quaternion: rotation, scale },
      width,
      height,
    );
    const fits =
      b.left >= width * 0.04 &&
      b.right <= width * 0.96 &&
      b.top >= HOME_COMPOSITION.top &&
      b.bottom <= height - HOME_COMPOSITION.bottom &&
      stationTop * scale + home.station.position.y < shipBottom - 0.08;
    if (fits) low = scale;
    else high = scale;
  }
  return low;
}
