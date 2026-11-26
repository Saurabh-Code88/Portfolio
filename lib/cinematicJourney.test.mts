import assert from "node:assert/strict";
import test from "node:test";
import { Quaternion, Vector3 } from "three";
import {
  CINEMATIC_ANCHORS,
  cinematicCoordinate,
  cinematicVideoTime,
  cinematicTransitProgress,
  cinematicTransitArrived,
} from "./cinematicTimeline.ts";
import {
  createCinematicFlight,
  createCinematicPose,
  createCinematicTransit,
  sampleCinematicFlight,
  sampleCinematicSegment,
  blendCinematicHandoff,
} from "./cinematicFlight.ts";
import { LatestVideoSeek, clampSeekTime } from "./videoScrub.ts";
const panels = CINEMATIC_ANCHORS.map((a, i) => ({
  id: a.id,
  offset: [0, 1100, 2500, 3600, 5000, 6500][i],
}));
test("measured section moments map chronologically from Home to the last decodable frame", () => {
  panels.forEach((p, i) => {
    assert.equal(cinematicCoordinate(p.offset, panels), i);
    assert.ok(
      Math.abs(
        cinematicVideoTime(i, 20) - CINEMATIC_ANCHORS[i].video * (20 - 1 / 120),
      ) < 1e-10,
    );
  });
  assert.equal(cinematicVideoTime(0, 20), 0);
  assert.equal(cinematicVideoTime(5, 20), 20 - 1 / 120);
  assert.equal(cinematicVideoTime(2, NaN), 0);
  let previous = -1;
  const forward = Array.from({ length: 1001 }, (_, i) =>
    cinematicVideoTime(cinematicCoordinate(i * 6.5, panels), 20),
  );
  forward.forEach((t) => {
    assert.ok(t >= previous);
    previous = t;
  });
  for (let i = 1000; i >= 0; i--)
    assert.equal(
      cinematicVideoTime(cinematicCoordinate(i * 6.5, panels), 20),
      forward[i],
    );
  for (let i = 1; i < 5; i++)
    assert.ok(
      Math.abs(
        cinematicVideoTime(i - 1e-7, 20) - cinematicVideoTime(i + 1e-7, 20),
      ) < 1e-5,
    );
});
test("seek scheduling has one in-flight request, overwrites obsolete targets, and bounds seekable ranges", () => {
  const queue = new LatestVideoSeek();
  queue.offer(4);
  assert.equal(queue.begin(0, false, [[0, 20]]), null);
  assert.equal(queue.begin(0, true, []), null);
  assert.equal(queue.begin(0, true, [[0, 20]]), 4);
  for (let i = 0; i < 1000; i++) {
    queue.offer(i / 100);
    assert.equal(queue.begin(0, true, [[0, 20]]), null);
  }
  queue.complete();
  assert.equal(queue.begin(4, true, [[0, 20]]), 9.99);
  queue.complete();
  queue.offer(2);
  assert.equal(queue.begin(9.99, true, [[0, 20]]), 2);
  queue.complete();
  assert.equal(queue.begin(2, true, [[0, 20]]), null);
  assert.equal(
    clampSeekTime(8, [
      [0, 4],
      [10, 20],
    ]),
    10,
  );
  assert.equal(clampSeekTime(30, [[0, 20]]), 20);
  assert.ok(queue.coalesced > 900);
  queue.offer(NaN);
  assert.equal(queue.target, 2);
});
const home = {
  position: new Vector3(0, 0.5, -0.35),
  quaternion: new Quaternion().setFromAxisAngle(
    new Vector3(1, 0, 0),
    -Math.PI / 2,
  ),
  scale: 1.2,
};
test("3D splines have continuous world position/quaternions and real depth at every viewport", () => {
  for (const width of [1024, 1280, 1440, 1920]) {
    const path = createCinematicFlight(width / 800, 48, home),
      a = createCinematicPose(),
      b = createCinematicPose();
    let minZ = Infinity,
      maxZ = -Infinity;
    for (let i = 0; i <= 1000; i++) {
      sampleCinematicFlight(path, i / 200, a);
      minZ = Math.min(minZ, a.position.z);
      maxZ = Math.max(maxZ, a.position.z);
      assert.ok(Math.abs(a.quaternion.length() - 1) < 1e-10);
      if (i) {
        assert.ok(a.position.distanceTo(b.position) < 0.5);
        assert.ok(a.quaternion.angleTo(b.quaternion) < 0.3);
      }
      b.position.copy(a.position);
      b.quaternion.copy(a.quaternion);
    }
    assert.ok(maxZ - minZ > 8, "depth must be world-space movement");
    for (let i = 1; i < 5; i++) {
      sampleCinematicFlight(path, i - 1e-7, a);
      sampleCinematicFlight(path, i + 1e-7, b);
      assert.ok(a.position.distanceTo(b.position) < 1e-5);
      assert.ok(a.quaternion.angleTo(b.quaternion) < 1e-5);
    }
    sampleCinematicFlight(path, 0, a);
    assert.ok(a.position.equals(home.position));
    assert.ok(a.quaternion.angleTo(home.quaternion) < 1e-6);
    for (const c of [0.1, 0.45, 1.3, 2.7, 3.5, 4.8]) {
      sampleCinematicFlight(path, c, a);
      sampleCinematicFlight(path, c, b);
      assert.ok(a.position.equals(b.position));
      assert.equal(a.quaternion.angleTo(b.quaternion) < 1e-6, true);
    }
  }
});
test("long-distance transit, rapid retarget and manual handoff preserve the visible transform", () => {
  const path = createCinematicFlight(1.6, 48, home),
    target = createCinematicPose(),
    current = createCinematicPose(),
    out = createCinematicPose();
  sampleCinematicFlight(path, 5, target);
  const transit = createCinematicTransit(home, target);
  sampleCinematicSegment(transit, 0.43, current);
  const retarget = createCinematicTransit(current, path.anchors[2]);
  sampleCinematicSegment(retarget, 0, out);
  assert.ok(current.position.equals(out.position));
  assert.ok(current.quaternion.angleTo(out.quaternion) < 1e-6);
  sampleCinematicSegment(retarget, 1, out);
  assert.ok(out.position.distanceTo(path.anchors[2].position) < 1e-8);
  sampleCinematicFlight(path, 2.2, target);
  blendCinematicHandoff(current, target, 0, out);
  assert.ok(current.position.equals(out.position));
  assert.ok(current.quaternion.angleTo(out.quaternion) < 1e-6);
  const wanted = target.quaternion.clone();
  blendCinematicHandoff(current, target, 1, target);
  assert.ok(target.quaternion.angleTo(wanted) < 1e-6);
  assert.equal(cinematicTransitProgress(0.4, 0.4, 1), 0);
  assert.equal(cinematicTransitProgress(0.1, 0.8, 0.1), 1);
});

test("HUD arrival releases ownership despite native scroll rounding",()=>{
  assert.equal(cinematicTransitArrived(.40001,.4,6400),true);
  assert.equal(cinematicTransitArrived(.4002,.4,6400),false);
  assert.equal(cinematicTransitArrived(1,1,6400),true);
});
