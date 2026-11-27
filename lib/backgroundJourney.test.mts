import assert from "node:assert/strict";
import test from "node:test";
import { canUseBackgroundJourney, stationDeparture, videoParallax } from "./backgroundJourney.ts";

test("video requires desktop journey and normal motion/data/power, independently of canvas", () => {
  for (const width of [1024,1280,1440,1920]) assert.equal(canUseBackgroundJourney(true,width,false,false,false,true),true);
  for (const width of [375,768,1023]) assert.equal(canUseBackgroundJourney(true,width,false,false,false,true),false);
  assert.equal(canUseBackgroundJourney(false,1280,false,false,false,true),false);
  assert.equal(canUseBackgroundJourney(true,1280,true,false,false,true),false);
  assert.equal(canUseBackgroundJourney(true,1280,false,true,false,true),false);
  assert.equal(canUseBackgroundJourney(true,1280,false,false,true,true),false);
  assert.equal(canUseBackgroundJourney(true,1280,false,false,false,false),false);
});
test("video parallax is bounded, reversible and independent of section edges", () => {
  for (const width of [1024,1280,1440,1920]) {
    const outbound=Array.from({length:101},(_,i)=>videoParallax(i*64,6400,width));
    for(let i=100;i>=0;i--) assert.equal(videoParallax(i*64,6400,width),outbound[i]);
    assert.equal(videoParallax(-100,6400,width),0);
    assert.equal(videoParallax(10000,6400,width),-width*.012);
    assert.equal(videoParallax(3200,6400,width),-width*.006);
  }
  assert.ok(Number.isFinite(videoParallax(0,0,1280)));
});
test("station departs before Toolkit and restores exactly at Home", () => {
  assert.equal(stationDeparture(0,0,1280),0);
  assert.equal(stationDeparture(1280*.82,0,1280),1);
  assert.equal(stationDeparture(6400,0,1280),1);
  assert.equal(stationDeparture(1,1,1),0);
  const outbound=Array.from({length:101},(_,i)=>stationDeparture(i*12.8,0,1280));
  for(let i=100;i>=0;i--) assert.equal(stationDeparture(i*12.8,0,1280),outbound[i]);
});
