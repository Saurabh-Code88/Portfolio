/** Reconstruct commit 3d3bfa2's nominal Home framing; compare the same source AABBs. */
import fs from "node:fs";
import { Box3, Vector3, Quaternion, Euler } from "three";
import { HOME_COMPOSITION, projectedBounds } from "../lib/homeComposition.ts";
import { restingPose } from "../lib/shipStaging.ts";
const root = "docs/validation/refinement/";
const input = JSON.parse(
  fs.readFileSync(root + "home-validation.json", "utf8"),
);
const box = (str: string) => {
  const [a, b] = str.split(";").map((x) => x.split(",").map(Number));
  return new Box3(new Vector3(...a), new Vector3(...b));
};
const home = [];
for (const d of input.poses) {
  const width = Number(d.viewportWidth),
    height = 800,
    ship = box(d.shipHull),
    station = box(d.stationHull);
  const half = 8.35 * Math.tan((48 * Math.PI) / 360),
    fw = (half * 2 * width) / height,
    fh = half * 2;
  const stationScale = (fw * 0.44) / 4.6,
    hover = Math.min(1.2, 1.2 * 0.78 + 0.12),
    offset = 0.76 * stationScale;
  const targetNose = fh / 2 - ((68 + height * 0.035) / height) * fh;
  const desiredY = targetNose - (ship.max.z + 0.06) * 1.2 - hover - offset;
  const sh = fw * 0.44 * (0.35 / 1.19),
    margin = fw * 0.005;
  const y = Math.max(
    -fh / 2 + sh / 2 + margin,
    Math.min(fh / 2 - sh / 2 - margin, desiredY),
  );
  const oldQ = new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0));
  const newQ = oldQ
    .clone()
    .multiply(
      new Quaternion().setFromAxisAngle(
        new Vector3(0, 0, 1),
        HOME_COMPOSITION.shipAxialAngle,
      ),
    );
  const stationQ = new Quaternion().setFromEuler(
    new Euler(HOME_COMPOSITION.stationPitch, HOME_COMPOSITION.stationYaw, 0),
  );
  const oldShip = projectedBounds(
    ship,
    {
      position: new Vector3(0, y + offset + hover, -0.35),
      quaternion: oldQ,
      scale: 1.2,
    },
    width,
    height,
  );
  const oldStation = projectedBounds(
    station,
    {
      position: new Vector3(0, y, -0.35),
      quaternion: new Quaternion(),
      scale: stationScale,
    },
    width,
    height,
  );
  const newShip = projectedBounds(
    ship,
    {
      position: new Vector3(+d.x, +d.y, +d.z),
      quaternion: newQ,
      scale: +d.scale,
    },
    width,
    height,
  );
  const newStation = projectedBounds(
    station,
    {
      position: new Vector3(0, +d.homeStationY, -0.35),
      quaternion: stationQ,
      scale: +d.homeStationScale,
    },
    width,
    height,
  );
  home.push({
    width,
    height,
    oldShip,
    newShip,
    oldStation,
    newStation,
    shipAreaRatio:
      (newShip.width * newShip.height) / (oldShip.width * oldShip.height),
    stationWidthRatio: newStation.width / oldStation.width,
  });
}
const ship = box(input.poses[0].shipHull),
  destinations = [];
for (let i = 1; i < 6; i++) {
  const next = restingPose(i, 1.6, 48),
    previous = { ...next, scale: (next.scale * 0.98) / 1.37 };
  destinations.push({
    id: ["hero", "toolkit", "projects", "research", "experience", "contact"][i],
    width: 1280,
    height: 800,
    previous: projectedBounds(ship, previous, 1280, 800),
    next: projectedBounds(ship, next, 1280, 800),
  });
}
const report = {
  method:
    "Perspective projections of identical runtime source AABBs; conservative empty corners included. Home uses nominal ambient yaw zero, before/after configuration orientations. Separate fitted full-yaw geometry envelopes are recorded by browser diagnostics. Original Home math reconstructed from commit 3d3bfa2; destination comparisons use canonical pre-idle orientation.",
  home,
  destinations,
};
fs.writeFileSync(root + "sizes.json", JSON.stringify(report, null, 2));
console.log(
  home.map((r) => ({
    width: r.width,
    ship: [
      r.oldShip.width,
      r.oldShip.height,
      r.newShip.width,
      r.newShip.height,
    ].map(Math.round),
    station: [r.oldStation.width, r.newStation.width].map(Math.round),
    areaRatio: r.shipAreaRatio.toFixed(2),
  })),
);
console.log(
  destinations.map((r) => ({
    id: r.id,
    old: Math.round(Math.max(r.previous.width, r.previous.height)),
    next: Math.round(Math.max(r.next.width, r.next.height)),
  })),
);
