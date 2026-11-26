/** Mutable measurements, not another timeline or per-frame React state source. */
export const cinematicDiagnostics = {
  progress: 0,
  targetTime: 0,
  decodedTime: 0,
  seekLag: 0,
  seekMs: 0,
  seeks: 0,
  coalesced: 0,
  decodedBy: "poster",
  x: 0,
  y: 0,
  z: 0,
  cameraDistance: 0,
  phase: "idle",
  destination: "hero",
  fps: 0,
  stationVisible: true,
};
