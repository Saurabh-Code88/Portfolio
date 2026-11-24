import type { Vector2 } from 'three';
const smoothstep = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
export type OrbitSample = { angle: number; angleRate: number; radiusScale: number; scale: number };

/**
 * Samples the existing clockwise section orbit. The cyclic easing keeps a
 * non-zero, matching tangent at the top entry/exit, avoiding a pause between
 * travel, orbit, and settle while retaining the one-turn choreography.
 */
export function sampleOrbit(
  progress: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  turns: number,
  position: Vector2,
  tangent: Vector2,
  result: OrbitSample,
  radiusInset = 0.15,
  rateVariation = 0.5,
  scaleBase = 0.9,
  scaleAmplitude = 0.1,
) {
  const t = Math.max(0, Math.min(1, progress));
  const eased = t + Math.sin(Math.PI * 2 * t) / (Math.PI * 4);
  const angle = -Math.PI / 2 + Math.PI * 2 * turns * eased;
  const angleRate = Math.PI * 2 * turns * (1 + rateVariation * Math.cos(Math.PI * 2 * t));
  const radiusScale = 1 - radiusInset * smoothstep(t);
  const radiusRate = -radiusInset * 6 * t * (1 - t);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  position.set(
    centerX + cos * radiusX * radiusScale,
    centerY + sin * radiusY * radiusScale,
  );
  tangent.set(
    radiusX * (radiusRate * cos - radiusScale * sin * angleRate),
    radiusY * (radiusRate * sin + radiusScale * cos * angleRate),
  );

  result.angle = angle;
  result.angleRate = angleRate;
  result.radiusScale = radiusScale;
  result.scale = scaleBase + scaleAmplitude * sin;
  return result;
}

export function sampleCubicBezier(
  progress: number,
  start: Vector2,
  control1: Vector2,
  control2: Vector2,
  end: Vector2,
  position: Vector2,
  tangent: Vector2,
) {
  const t = Math.max(0, Math.min(1, progress));
  const inverse = 1 - t;
  const inverseSquared = inverse * inverse;
  const tSquared = t * t;
  position.set(
    inverseSquared * inverse * start.x + 3 * inverseSquared * t * control1.x + 3 * inverse * tSquared * control2.x + tSquared * t * end.x,
    inverseSquared * inverse * start.y + 3 * inverseSquared * t * control1.y + 3 * inverse * tSquared * control2.y + tSquared * t * end.y,
  );
  tangent.set(
    3 * inverseSquared * (control1.x - start.x) + 6 * inverse * t * (control2.x - control1.x) + 3 * tSquared * (end.x - control2.x),
    3 * inverseSquared * (control1.y - start.y) + 6 * inverse * t * (control2.y - control1.y) + 3 * tSquared * (end.y - control2.y),
  );
  return position;
}
