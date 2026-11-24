import assert from "node:assert/strict";
import test from "node:test";
import { sampleManualFlight, type ManualFlightSample } from "./manualFlight.ts";

const stops = [0, 0.2, 0.4, 0.6, 0.8, 1];
function pose(p: number) {
  return sampleManualFlight(p, stops, 0.9, 0.5, 0.58, 0.028, 0.18, 0.18, {} as ManualFlightSample);
}
test("manual journey docks at hero and parks exactly at every section stop", () => {
  assert.equal(pose(0).departure, 0);
  for (const stop of stops.slice(1)) {
    const sample = pose(stop);
    assert.ok(Math.abs(sample.x - 0.9) < 1e-12);
    assert.ok(Math.abs(sample.y - 0.5) < 1e-12);
    assert.ok(Math.abs(sample.scale - 0.58) < 1e-12);
    assert.ok(Math.abs(sample.bank) < 1e-12);
    assert.equal(sample.departure, 1);
  }
});
test("position, rotation inputs and scale are continuous at section boundaries", () => {
  for (const stop of stops.slice(1, -1)) {
    const left = pose(stop - 1e-6), right = pose(stop + 1e-6);
    for (const key of ["x", "y", "scale", "bank", "pitch", "departure"] as const) {
      assert.ok(Math.abs(left[key] - right[key]) < 1e-6, `${stop}: ${key}`);
    }
  }
});
test("forward approach travels clockwise through the upper-right margin without a full orbit", () => {
  const departure = pose(0.25), approach = pose(0.35);
  assert.ok(departure.x < 0.9);
  assert.ok(approach.x > 0.9);
  assert.ok(departure.y < 0.5 && approach.y < 0.5);
});
test("stopping and reversing resample the same pose without a clock or direction state", () => {
  const forward = Array.from({ length: 501 }, (_, i) => pose(i / 500));
  for (let i = 500; i >= 0; i -= 1) {
    assert.deepEqual(pose(i / 500), forward[i]);
    assert.ok(forward[i].x >= 0.872 && forward[i].x <= 0.928);
    assert.ok(forward[i].y >= 0.32 && forward[i].y <= 0.5);
    assert.ok(Number.isFinite(forward[i].bank));
  }
  assert.notEqual(pose(0.27).y, pose(0.3).y);
  assert.deepEqual(pose(-1), pose(0));
  assert.deepEqual(pose(2), pose(1));
});
