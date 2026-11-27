import { Box3, Matrix4, Mesh, Object3D, Vector3 } from "three";

/** Once per asset: conservative full-yaw profile measured directly from model vertices.
 * Height bins enclose both bin ends; circumscribed rings enclose every yaw angle.
 * Bounded to 32 * 2 * 32 points, independent of source triangle count.
 */
export function modelHull(
  root: Object3D,
  center: Vector3,
  scale: number,
  sourceBounds?: Box3,
) {
  root.updateWorldMatrix(true, true);
  const parentInverse = root.parent
    ? root.parent.matrixWorld.clone().invert()
    : new Matrix4();
  const bounds = sourceBounds ?? new Box3().setFromObject(root);
  const min = (bounds.min.y - center.y) * scale,
    max = (bounds.max.y - center.y) * scale;
  const radii = new Float64Array(32),
    point = new Vector3();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const position = object.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      point
        .fromBufferAttribute(position, i)
        .applyMatrix4(object.matrixWorld)
        .applyMatrix4(parentInverse)
        .sub(root.position)
        .sub(center)
        .multiplyScalar(scale);
      const bin = Math.min(
        31,
        Math.max(
          0,
          Math.floor(((point.y - min) / Math.max(0.0001, max - min)) * 32),
        ),
      );
      radii[bin] = Math.max(radii[bin], Math.hypot(point.x, point.z));
    }
  });
  const points: Vector3[] = [];
  radii.forEach((radius, bin) => {
    if (!radius) return;
    const r = radius / Math.cos(Math.PI / 32);
    for (const level of [bin, bin + 1])
      for (let i = 0; i < 32; i++) {
        const angle = (i * Math.PI) / 16;
        points.push(
          new Vector3(
            Math.cos(angle) * r,
            min + ((max - min) * level) / 32,
            Math.sin(angle) * r,
          ),
        );
      }
  });
  return points;
}
