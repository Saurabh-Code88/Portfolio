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
import {
  DESTINATION_STAGES,
  restingPose,
  stageWorldPoint,
  createShipIdle,
  applyShipIdle,
} from "./shipStaging.ts";

test("destination stages project into reserved viewports and preserve intended nose direction", () => {
  for (const width of [1024, 1280, 1440, 1920])
    for (let i = 1; i < 6; i++) {
      const stage = DESTINATION_STAGES[i],
        pose = restingPose(i, width / 800, 48);
      const depth = 8 - pose.position.z,
        half = depth * Math.tan((48 * Math.PI) / 360);
      assert.ok(
        Math.abs(
          (pose.position.x / ((half * width) / 800) + 1) / 2 - stage.anchor[0],
        ) < 1e-10,
      );
      assert.ok(
        Math.abs((1 - pose.position.y / half) / 2 - stage.anchor[1]) < 1e-10,
      );
      const nose = new Vector3(0, 0, 1).applyQuaternion(pose.quaternion);
      assert.ok(nose.dot(new Vector3(...stage.nose).normalize()) > 0.999999);
      assert.ok(pose.scale >= 0.93 && pose.scale <= 0.98);
      assert.ok(
        stage.anchor[0] > 0.1 &&
          stage.anchor[0] < 0.9 &&
          stage.anchor[1] < 0.85,
      );
      assert.ok(
        stage.content[0] < stage.content[2] &&
          stage.content[1] < stage.content[3],
      );
      assert.ok(
        stageWorldPoint(stage.entry, width / 800, 48).z < pose.position.z ||
          i === 4,
      );
      // Conservative decoded-asset hull bounds, including all axial orientations and levitation.
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const q = pose.quaternion
          .clone()
          .multiply(
            new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), angle),
          );
        for (const x of [-0.26, 0.26])
          for (const y of [-0.21, 0.21])
            for (const z of [-1.01, 1.01]) {
              const p = new Vector3(x, y, z)
                .multiplyScalar(pose.scale)
                .applyQuaternion(q)
                .add(pose.position);
              const h = (8 - p.z) * Math.tan((48 * Math.PI) / 360);
              const sx = (p.x / ((h * width) / 800) + 1) / 2,
                sy = (1 - p.y / h) / 2;
              assert.ok(
                sx > 0.025 && sx < 0.975 && sy > 0.12 && sy < 0.92,
                "rotating hull must clear viewport/HUD",
              );
            }
      }
    }
});
test("approach headings agree with each destination's resting nose", () => {
  for (const stage of DESTINATION_STAGES.slice(1)) {
    const dx = stage.anchor[0] - stage.entry[0],
      dy = stage.entry[1] - stage.anchor[1];
    const alignment =
      (dx * stage.nose[0] + dy * stage.nose[1]) /
      (Math.hypot(dx, dy) * Math.hypot(stage.nose[0], stage.nose[1]));
    assert.ok(
      alignment > 0.7,
      stage.id + " should arrive along its intended screen heading",
    );
  }
});
test("idle composes local axial rotation, fades in, excludes Home and holds no travel clock", () => {
  const state = createShipIdle(),
    rotation = new Quaternion();
  const base = restingPose(1, 1.6, 48),
    pose = createCinematicPose();
  const previous = base.quaternion.clone();
  for (let frame = 0; frame < 2400; frame++) {
    pose.position.copy(base.position);
    pose.quaternion.copy(base.quaternion);
    pose.scale = base.scale;
    applyShipIdle(state, 1, 1 / 60, pose, rotation);
    assert.ok(
      Math.abs(pose.position.y - base.position.y) <=
        DESTINATION_STAGES[1].levitation + 1e-12,
    );
    assert.ok(pose.quaternion.angleTo(previous) < 0.01);
    assert.ok(
      new Vector3(0, 0, 1)
        .applyQuaternion(pose.quaternion)
        .distanceTo(new Vector3(0, 0, 1).applyQuaternion(base.quaternion)) <
        1e-6,
    );
    previous.copy(pose.quaternion);
  }
  // Departure must accept the exact displayed quaternion, including arbitrary idle roll.
  const transit = createCinematicTransit(pose, restingPose(2, 1.6, 48)),
    out = createCinematicPose();
  sampleCinematicSegment(transit, 0, out);
  assert.ok(out.quaternion.angleTo(pose.quaternion) < 1e-6);
  applyShipIdle(state, -1, 1 / 60, pose, rotation);
  assert.equal(state.weight, 0);
  applyShipIdle(state, 0, 1 / 60, pose, rotation);
  assert.equal(state.angle, 0);
});
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

test("HUD arrival releases ownership despite native scroll rounding", () => {
  assert.equal(cinematicTransitArrived(0.40001, 0.4, 6400), true);
  assert.equal(cinematicTransitArrived(0.4002, 0.4, 6400), false);
  assert.equal(cinematicTransitArrived(1, 1, 6400), true);
});
