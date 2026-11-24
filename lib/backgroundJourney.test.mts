import assert from "node:assert/strict";
import test from "node:test";
import { backgroundBlend, canUseBackgroundJourney } from "./backgroundJourney.ts";

test("planet holds through departure start; nebula completes at configured boundary", () => {
  assert.equal(backgroundBlend(0, 0, 1280), 0);
  assert.equal(backgroundBlend(1280 * .08, 0, 1280), 0);
  assert.equal(backgroundBlend(1280 * .98, 0, 1280), 1);
  assert.equal(backgroundBlend(1280 * 5, 0, 1280), 1);
  assert.ok(Math.abs(backgroundBlend(1280 * .53, 0, 1280) - .5) < 1e-12);
});
test("blend is reversible, stable on stop, and invariant to viewport/offset", () => {
  const forward = Array.from({ length: 101 }, (_, i) => backgroundBlend(i / 100 * 1280, 0, 1280));
  for (let i = 100; i >= 0; i--) assert.equal(backgroundBlend(i / 100 * 1280, 0, 1280), forward[i]);
  for (const width of [1024, 1280, 1440, 1920]) {
    assert.ok(Math.abs(backgroundBlend(17 + width * .53, 17, 17 + width) - .5) < 1e-12);
  }
  assert.equal(backgroundBlend(1, 0, 0), 0);
  assert.equal(backgroundBlend(1, 0, 1, .5, .5), 0);
});
test("crossfade endpoints have continuous slopes", () => {
  for (const x of [.08, .98]) {
    assert.ok(Math.abs(backgroundBlend(x + 1e-6, 0, 1) - backgroundBlend(x - 1e-6, 0, 1)) < 1e-9);
  }
});
test("eligibility depends on the desktop journey and preferences, never WebGL", () => {
  assert.equal(canUseBackgroundJourney(true, 1024, false, false, false, true), true);
  assert.equal(canUseBackgroundJourney(false, 1920, false, false, false, true), false);
  for (const width of [375, 768, 1023]) assert.equal(canUseBackgroundJourney(true, width, false, false, false, true), false);
  assert.equal(canUseBackgroundJourney(true, 1280, true, false, false, true), false);
  assert.equal(canUseBackgroundJourney(true, 1280, false, true, false, true), false);
  assert.equal(canUseBackgroundJourney(true, 1280, false, false, true, true), false);
  assert.equal(canUseBackgroundJourney(true, 1280, false, false, false, false), false);
});
