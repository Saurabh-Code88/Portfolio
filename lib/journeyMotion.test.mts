import test from "node:test";
import assert from "node:assert/strict";
import { arrivalExpansion, fluidRevealStyle, JOURNEY_SCROLL_FACTOR, smoothJourneyPosition } from "./journeyMotion.ts";
import { createScrollOrbitSample, sampleScrollOrbit } from "./scrollOrbit.ts";

test("desktop pacing reduces distance per wheel input; easing is bounded and reversible", () => {
  assert.ok(JOURNEY_SCROLL_FACTOR >= 2.5);
  let x = 0;
  for (let i = 0; i < 240; i++) {
    const next = smoothJourneyPosition(x, 1280, 1 / 60);
    assert.ok(next >= x && next <= 1280);
    x = next;
  }
  assert.equal(x, 1280);
  assert.ok(smoothJourneyPosition(x, 0, 1 / 60) < x);
  assert.equal(smoothJourneyPosition(300, 300, .05), 300);
  assert.equal(smoothJourneyPosition(0, 100, 0), 0);
});
test("journey damping is stable across frame rates", () => {
  let slow = 0, fast = 0;
  for (let i = 0; i < 30; i++) slow = smoothJourneyPosition(slow, 1280, 1 / 60);
  for (let i = 0; i < 60; i++) fast = smoothJourneyPosition(fast, 1280, 1 / 120);
  assert.ok(Math.abs(slow - fast) < 1e-9);
});
test("content unfolds only after the full orbit, then reaches a readable endpoint", () => {
  assert.equal(arrivalExpansion(.82), 0);
  assert.equal(arrivalExpansion(1), 1);
  const bounds = { left: .05, right: .8, centerX: .425, centerY: .5, radiusX: .38, radiusY: .32 };
  const sample = createScrollOrbitSample();
  for (let local = 0; local <= 1; local += .001) {
    sampleScrollOrbit(local, bounds, .9, .5, .58, .9, .5, sample);
    if (sample.phase === "orbit" || sample.phase === "travel") assert.equal(sample.arrival, 0);
    assert.ok(sample.arrival >= 0 && sample.arrival <= 1);
  }
  for (let index = 0; index < 10; index++) {
    assert.deepEqual(fluidRevealStyle(1, index), { opacity: 1, x: 1, y: 1, skew: 0 });
    assert.equal(fluidRevealStyle(0, index).opacity, 0);
  }
  assert.ok(fluidRevealStyle(.4, 0).x > fluidRevealStyle(.4, 4).x);
});
