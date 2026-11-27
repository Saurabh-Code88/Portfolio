export type ReturnPhase =
  "idle" | "departing" | "hyperspace" | "preparing" | "approach";
let phase: ReturnPhase = "idle";
const listeners = new Set<() => void>();
/** Phase edges only; UI does not import Three.js or render per-frame progress. */
export const stationReturnStatus = {
  getSnapshot: () => phase,
  getServerSnapshot: (): ReturnPhase => "idle",
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  publish(next: ReturnPhase) {
    if (phase === next) return;
    phase = next;
    listeners.forEach((listener) => listener());
  },
};
