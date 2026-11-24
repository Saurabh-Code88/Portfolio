import assert from "node:assert/strict";
import test from "node:test";
import { selectActiveSection } from "./activeSection.ts";

test("horizontal forward/reverse travel and large navigation jumps", () => {
  const starts = [0, 1280, 2560, 3840, 5120, 6400];
  assert.equal(selectActiveSection(starts, 640), 0);
  assert.equal(selectActiveSection(starts, 1920, 0), 1);
  assert.equal(selectActiveSection(starts, 7040, 1), 5);
  assert.equal(selectActiveSection(starts, 640, 5), 0);
});

test("boundary jitter stays stable in both directions, then changes outside deadband", () => {
  const starts = [0, 1280, 2560];
  assert.equal(selectActiveSection(starts, 1285, 0), 0);
  assert.equal(selectActiveSection(starts, 1293, 0), 1);
  assert.equal(selectActiveSection(starts, 1275, 1), 1);
  assert.equal(selectActiveSection(starts, 1267, 1), 0);
});

test("vertical reading line preserves long sections; fresh geometry resets stale selection", () => {
  const starts = [0, 720, 1400, 3900];
  assert.equal(selectActiveSection(starts, 3000, 2), 2);
  assert.equal(selectActiveSection(starts, 725), 1);
  assert.equal(selectActiveSection([], 0), -1);
  assert.equal(selectActiveSection([0], 900), 0);
});
