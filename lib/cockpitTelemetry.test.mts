import assert from "node:assert/strict";
import test from "node:test";
import { flightReadout, journeyCompletion } from "./cockpitTelemetry.ts";

test("journey readout follows measured travel, clamps and reverses", () => {
  assert.equal(journeyCompletion(200, 200, 5200), 0);
  assert.equal(journeyCompletion(2700, 200, 5200), 50);
  assert.equal(journeyCompletion(5200, 200, 5200), 100);
  assert.equal(journeyCompletion(2700, 200, 5200), 50);
  assert.equal(journeyCompletion(-10, 200, 5200), 0);
  assert.equal(journeyCompletion(6000, 200, 5200), 100);
  assert.equal(journeyCompletion(10, 0, 0), 0);
  assert.equal(journeyCompletion(NaN, 0, 1), 0);
});

test("flight labels follow navigation phases and manual parking state", () => {
  for (const phase of ["undock", "travel"]) assert.equal(flightReadout(phase, false, true), "transit");
  for (const phase of ["approach", "orbit"]) assert.equal(flightReadout(phase, false, false), "approach");
  assert.equal(flightReadout("settle", false, false), "arrived");
  assert.equal(flightReadout("idle", false, true), "docked");
  assert.equal(flightReadout("idle", false, false), "transit");
  assert.equal(flightReadout("idle", true, false), "arrived");
});
