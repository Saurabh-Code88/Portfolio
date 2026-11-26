import assert from "node:assert/strict";
import test from "node:test";
import { backgroundBlend, canUseBackgroundJourney, ENVIRONMENTS, environmentComposition, stationDeparture } from "./backgroundJourney.ts";

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

const panels = ENVIRONMENTS.map((e, i) => ({ id: e.sectionId, offset: i * 1280 }));
const decoded = ENVIRONMENTS.map(() => true);
test("each measured destination maps to its environment", () => {
  panels.forEach((panel, i) => {
    const weights = environmentComposition(panel.offset, panels, decoded);
    assert.equal(weights[i], 1);
    assert.equal(weights.reduce((a,b) => a+b, 0), 1);
  });
});
test("spatial composition is continuous, reversible and stable halfway", () => {
  const positions = Array.from({length: 501}, (_, i) => i * 12.8);
  const forward = positions.map(x => environmentComposition(x, panels, decoded));
  positions.reverse().forEach((x, i) => assert.deepEqual(environmentComposition(x, panels, decoded), forward[500-i]));
  for (let x = 0; x <= 6400; x += 64) {
    const a = environmentComposition(x, panels, decoded);
    const b = environmentComposition(x + .001, panels, decoded);
    assert.ok(Math.abs(a.reduce((sum,w) => sum+w,0)-1) < 1e-10);
    a.forEach((w,i) => assert.ok(Math.abs(w-b[i]) < .00001));
  }
});
test("failed assets retain a decoded environment in either direction", () => {
  const ready = [true, true, false, false, false, false];
  assert.equal(environmentComposition(6400, panels, ready)[1], 1);
  assert.equal(environmentComposition(0, panels, ready)[0], 1);
  assert.equal(environmentComposition(6400, panels, [true,false,false,false,false,false])[0],1);
});
test("station departs before Toolkit and restores exactly at Home", () => {
  assert.equal(stationDeparture(0,0,1280),0);
  assert.equal(stationDeparture(1280*.82,0,1280),1);
  assert.equal(stationDeparture(6400,0,1280),1);
  const outbound = Array.from({length:101},(_,i)=>stationDeparture(i*12.8,0,1280));
  for(let i=100;i>=0;i--) assert.equal(stationDeparture(i*12.8,0,1280),outbound[i]);
});
