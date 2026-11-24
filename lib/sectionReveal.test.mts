import assert from "node:assert/strict";
import test from "node:test";
import { sectionArrivalProgress, sectionRevealStyle } from "./sectionReveal.ts";

test("reveal follows destination visibility and finishes during approach", () => {
  assert.equal(sectionArrivalProgress(0, 1280, 1280), 0);
  assert.equal(sectionArrivalProgress(1280 * 0.8, 1280, 1280), 1);
  assert.equal(sectionArrivalProgress(1280, 1280, 1280), 1);
  const halfway = sectionArrivalProgress(1280 * 0.5, 1280, 1280);
  assert.ok(halfway > 0 && halfway < 1);
  assert.equal(sectionArrivalProgress(1280 * 0.5, 1280, 1280), halfway);
});
test("partial reveal reverses continuously without a timer", () => {
  const sample = (x: number) => sectionRevealStyle(sectionArrivalProgress(x, 1280, 1280), 2, false);
  const forward = Array.from({ length: 101 }, (_, i) => sample(i * 12.8));
  for (let i = 100; i >= 0; i--) assert.deepEqual(sample(i * 12.8), forward[i]);
  assert.ok(Math.abs(sample(640).y - sample(640.01).y) < 0.01);
});
test("headings scale subtly, cards stagger, all remain readable and finish together", () => {
  assert.deepEqual(sectionRevealStyle(0, 0, true), { opacity: 0.55, scale: 0.9, y: 0 });
  assert.equal(sectionRevealStyle(0, 1, false).y, 24);
  assert.ok(sectionRevealStyle(0.5, 1, false).opacity > sectionRevealStyle(0.5, 4, false).opacity);
  for (let i = 0; i < 20; i++) {
    assert.deepEqual(sectionRevealStyle(1, i, false), { opacity: 1, scale: 1, y: 0 });
  }
});
