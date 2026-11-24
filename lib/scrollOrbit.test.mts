import assert from "node:assert/strict";
import test from "node:test";
import { Vector2 } from "three";
import { createScrollOrbitSample, sampleScrollOrbit } from "./scrollOrbit.ts";
import { sampleOrbit } from "./orbitPath.ts";
import { ORBIT_RADIUS_INSET, ORBIT_RATE_VARIATION, ORBIT_SCALE_AMPLITUDE, ORBIT_SCALE_BASE, ORBIT_TURNS } from "./ship.config.ts";

const bounds = { left: .05, right: .8, centerX: .425, centerY: .5, radiusX: .38, radiusY: .32 };
function pose(local: number) {
  const result = sampleScrollOrbit(local, bounds, .9, .5, .58, .9, .5, createScrollOrbitSample());
  return { x: result.position.x, y: result.position.y, scale: result.scale, bank: result.bank, weight: result.headingWeight };
}
test("scroll orbit parks at both ends and reverses deterministically", () => {
  assert.deepEqual(pose(0), { x: .9, y: .5, scale: .58, bank: 0, weight: 0 });
  assert.deepEqual(pose(1), pose(0));
  const samples = Array.from({ length: 501 }, (_, i) => pose(i / 500));
  for (let i = 500; i >= 0; i--) assert.deepEqual(pose(i / 500), samples[i]);
});
test("manual orbit uses exactly the navigation clockwise geometry", () => {
  const position = new Vector2(), tangent = new Vector2();
  const info = { angle: 0, angleRate: 0, radiusScale: 1, scale: 1 };
  for (let local = .4; local <= .6; local += .01) {
    const t = local ** 3 * (10 + local * (-15 + 6 * local));
    const progress = (t - .28) / .54;
    sampleOrbit(progress, bounds.centerX, bounds.centerY, bounds.radiusX, bounds.radiusY,
      ORBIT_TURNS, position, tangent, info, ORBIT_RADIUS_INSET, ORBIT_RATE_VARIATION, ORBIT_SCALE_BASE, ORBIT_SCALE_AMPLITUDE);
    const actual = pose(local);
    assert.ok(Math.abs(actual.x - position.x) < 1e-12);
    assert.ok(Math.abs(actual.y - position.y) < 1e-12);
    assert.ok(Math.abs(actual.scale - info.scale) < 1e-12);
  }
  assert.ok(pose(.4).x > bounds.centerX);
  assert.ok(pose(.6).x < bounds.centerX);
});
test("travel/orbit/settle joins and section boundaries remain continuous", () => {
  for (let local = 0; local <= 1; local += .0005) {
    const a = pose(local), b = pose(local + 1e-7);
    for (const key of ["x", "y", "scale", "bank"] as const) {
      assert.ok(Number.isFinite(a[key]));
      assert.ok(Math.abs(a[key] - b[key]) < 1e-4, `${key} at ${local}`);
    }
  }
  for (const key of ["x", "y", "scale", "bank", "weight"] as const) {
    assert.ok(Math.abs(pose(1 - 1e-7)[key] - pose(1e-7)[key]) < 1e-6);
  }
});
