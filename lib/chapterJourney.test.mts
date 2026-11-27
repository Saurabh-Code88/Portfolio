import test from "node:test";
import assert from "node:assert/strict";
import { Quaternion, Vector3 } from "three";
import { chapters, engineeringGroups } from "../content/expedition.ts";
import { toolkitCopy } from "../content/toolkit.ts";
import { chapterNeighbors, cinematicChapters } from "./chapterNavigation.ts";
import {
  advanceStationReturn,
  cancelStationReturn,
  canStartStationReturn,
  createStationReturn,
  returnDeparture,
  stationApproach,
  sampleStationApproach,
  stationReturnStatus,
  RETURN_TIMING,
} from "./stationReturn.ts";
import {
  createCinematicPose,
  sampleCinematicSegment,
} from "./cinematicFlight.ts";
import { createShipIdle, applyShipIdle } from "./shipStaging.ts";
import { createHomeComposition } from "./homeComposition.ts";
test("chapter neighbors preserve real section order and supported technologies", () => {
  assert.deepEqual(
    chapters.map((c) => c.id),
    ["hero", "toolkit", "projects", "research", "experience", "contact"],
  );
  chapters.forEach((c, i) => {
    const n = chapterNeighbors(c.id);
    assert.equal(n.previous?.id, chapters[i - 1]?.id);
    assert.equal(n.next?.id, chapters[i + 1]?.id);
  });
  const supported = new Set(toolkitCopy.groups.flatMap((g) => [...g.tools]));
  for (const group of engineeringGroups)
    for (const tool of group.tools) assert.ok(supported.has(tool));
});
test("chapter introduction and cinematic return share a desktop-only capability gate", () => {
  assert.equal(cinematicChapters(1280, false, true, true), true);
  for (const args of [
    [768, false, true, true],
    [375, false, true, true],
    [1280, true, true, true],
    [1280, false, false, true],
    [1280, false, true, false],
  ] as const)
    assert.equal(cinematicChapters(args[0], args[1], args[2], args[3]), false);
});
test("return phases conceal reset, wait for readiness and use a bounded timeout", () => {
  const s = createStationReturn();
  s.phase = "departing";
  assert.equal(advanceStationReturn(s, 699, false), "departing");
  assert.equal(advanceStationReturn(s, 700, false), "hyperspace");
  assert.equal(advanceStationReturn(s, 1350, false), "preparing");
  assert.equal(advanceStationReturn(s, 1500, true), "preparing");
  assert.equal(advanceStationReturn(s, 1600, true), "approach");
  assert.equal(advanceStationReturn(s, 3400, true), "idle");
  s.phase = "preparing";
  s.started = 0;
  assert.equal(
    advanceStationReturn(s, RETURN_TIMING.maximumPrepare - 1, false),
    "preparing",
  );
  assert.equal(
    advanceStationReturn(s, RETURN_TIMING.maximumPrepare, false),
    "approach",
  );
});
test("return repeated requests, interruption, skip and phase cleanup are deterministic", () => {
  const s = createStationReturn();
  assert.ok(canStartStationReturn(s.phase, "contact"));
  for (const phase of [
    "departing",
    "hyperspace",
    "preparing",
    "approach",
  ] as const) {
    s.phase = phase;
    s.reset = true;
    assert.equal(canStartStationReturn(s.phase, "contact"), false);
    cancelStationReturn(s);
    assert.deepEqual(s, createStationReturn());
  }
  let edges = 0;
  const stop = stationReturnStatus.subscribe(() => edges++);
  stationReturnStatus.publish("departing");
  stationReturnStatus.publish("departing");
  stationReturnStatus.publish("idle");
  stop();
  assert.equal(edges, 2);
});
test("signature return starts at the displayed quaternion and ends at the fitted Home pose", () => {
  const home = createHomeComposition(1280, 800).ship,
    from = {
      position: new Vector3(-2, 0, -1),
      quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 2.7),
      scale: 1.37,
    },
    out = createCinematicPose();
  sampleCinematicSegment(returnDeparture(from), 0, out);
  assert.ok(out.quaternion.angleTo(from.quaternion) < 1e-6);
  assert.ok(out.position.equals(from.position));
  const path = stationApproach(home);
  sampleStationApproach(path, 1, out);
  assert.ok(out.position.distanceTo(home.position) < 1e-9);
  assert.ok(out.quaternion.angleTo(home.quaternion) < 1e-6);
  const positions = [0, 0.25, 0.55, 0.8, 1].map(
    (t) => sampleStationApproach(path, t, createCinematicPose()).position,
  );
  for (const axis of ["x", "y", "z"] as const)
    assert.ok(
      Math.max(...positions.map((p) => p[axis])) -
        Math.min(...positions.map((p) => p[axis])) >
        1,
    );
  sampleStationApproach(path, 0.55 - 1e-7, out);
  const before = out.position.clone();
  sampleStationApproach(path, 0.55 + 1e-7, out);
  assert.ok(out.position.distanceTo(before) < 1e-5);
});
test("Home rotates around local +Z in 44 seconds without changing docking position or nose", () => {
  const state = createShipIdle(),
    home = createHomeComposition(1280, 800).ship,
    out = createCinematicPose(),
    q = new Quaternion();
  for (let i = 0; i < 44 * 60; i++) {
    out.position.copy(home.position);
    out.quaternion.copy(home.quaternion);
    applyShipIdle(state, 0, 1 / 60, out, q);
    assert.ok(out.position.equals(home.position));
    assert.ok(
      new Vector3(0, 0, 1)
        .applyQuaternion(out.quaternion)
        .distanceTo(new Vector3(0, 0, 1).applyQuaternion(home.quaternion)) <
        1e-6,
    );
  }
  assert.ok(Math.abs(state.angle - 2 * Math.PI) < 1e-8);
});
