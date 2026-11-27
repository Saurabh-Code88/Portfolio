"use client";

import { modelHull } from "@/lib/modelHull";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Box3, Group, Material, Mesh, Object3D, Quaternion, Texture, Vector3 } from "three";
import {
  STATION_DIAMETER,
  STATION_SCALE,
} from "@/lib/station.config";

function cloneTexturedScene(source: Group) {
  const clone = source.clone(true);
  clone.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry = object.geometry.clone();
    const cloneMaterial = (material: Material) => {
      const copy = material.clone() as Material & Record<string, unknown>;
      for (const [key, value] of Object.entries(copy)) if (value instanceof Texture) copy[key] = value.clone();
      return copy;
    };
    object.material = Array.isArray(object.material) ? object.material.map(cloneMaterial) : cloneMaterial(object.material);
  });
  return clone;
}

function disposeScene(model: Group) {
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
      material.dispose();
    });
  });
}

export type StationRenderQuality = "normal" | "reduced";

const FPS_SAMPLE_WINDOW_SECONDS = 1.5;
const FPS_LOW_THRESHOLD = 30;
const FPS_RECOVERY_THRESHOLD = 45;
const FPS_LOW_WINDOWS_TO_REDUCE = 2;
const FPS_RECOVERY_WINDOWS_TO_RESTORE = 3;
const FPS_QUALITY_COOLDOWN_SECONDS = 3;
const DEV_LOW_FPS_SIMULATION_SECONDS = 8;

export function StationModel({
  preview = false,
  scale = STATION_SCALE,
  onQualityChange,
  onBounds,
  onHull,
}: {
  onHull?: (points: Vector3[]) => void;
  preview?: boolean;
  scale?: number;
  onQualityChange?: (quality: StationRenderQuality) => void;
  onBounds?: (size: readonly [number, number, number]) => void;
}) {
  const { scene } = useGLTF("/models/station.glb", true, true);
  const model = useMemo(() => cloneTexturedScene(scene), [scene]);
  const group = useRef<Group>(null);
  const frameWindow = useRef({ elapsed: 0, count: 0, lowWindows: 0, recoveryWindows: 0, quality: "normal" as StationRenderQuality, lastQualityChangeAt: Number.NEGATIVE_INFINITY });
  const lowFpsSimulation = useRef({ enabled: false, startedAt: 0 });
  const monitorStartedAt = useRef(0);
  const hasLoggedMount = useRef(false);
  const lifecycleLogTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deferredDisposals = useRef(new Map<Group, ReturnType<typeof setTimeout>>());
  const diagnosticElapsed = useRef(0);
  const previousSnapshot = useRef<Map<string, { position: number[]; quaternion: number[]; scale: number[]; visible: boolean }> | null>(null);
  const diagnosticWarnings = useRef(new Set<string>());
  const normalizedModel = useRef<Group>(null);
  const bounds = useMemo(() => new Box3().setFromObject(model), [model]);
  const center = useMemo(() => bounds.getCenter(new Vector3()), [bounds]);
  const size = useMemo(() => bounds.getSize(new Vector3()), [bounds]);
  const normalizeScale = STATION_DIAMETER / Math.max(size.x, size.z, 0.001) * scale;

  const hull = useMemo(() => onHull ? modelHull(model,center,normalizeScale,bounds) : null,[onHull,model,center,normalizeScale,bounds]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.info("[station] source bounds", {
      size: [size.x, size.y, size.z],
      center: [center.x, center.y, center.z],
    });
  }, [center, size]);

  useEffect(() => {
    monitorStartedAt.current = performance.now();
    if (process.env.NODE_ENV === "development") {
      if (lifecycleLogTimer.current) clearTimeout(lifecycleLogTimer.current);
      lifecycleLogTimer.current = null;
      if (!hasLoggedMount.current) console.info("[station] mounted");
      hasLoggedMount.current = true;
      if (!lowFpsSimulation.current.enabled && new URLSearchParams(window.location.search).get("stationFpsTest") === "1") {
        lowFpsSimulation.current.enabled = true;
        lowFpsSimulation.current.startedAt = performance.now();
        console.info(`[station] low-FPS simulation enabled; ${DEV_LOW_FPS_SIMULATION_SECONDS}s low, then recovery`);
      }
    }
    return () => {
      if (process.env.NODE_ENV === "development") {
        lifecycleLogTimer.current = setTimeout(() => {
          console.info("[station] unmounted");
          lifecycleLogTimer.current = null;
        }, 0);
      }
    };
  }, []);

  useEffect(() => {
    if(hull) onHull?.(hull);
  }, [onHull,hull]);

  useEffect(() => {
    onBounds?.([size.x, size.y, size.z]);
  }, [onBounds, preview, size]);

  useEffect(() => {
    const disposalTimers = deferredDisposals.current;
    const existingTimer = disposalTimers.get(model);
    if (existingTimer) {
      clearTimeout(existingTimer);
      disposalTimers.delete(model);
    }
    return () => {
      const timer = setTimeout(() => {
        disposeScene(model);
        disposalTimers.delete(model);
      }, 0);
      disposalTimers.set(model, timer);
    };
  }, [model]);

  useEffect(() => {
    normalizedModel.current?.updateWorldMatrix(true, true);
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.frustumCulled = false;
      object.geometry.computeBoundingSphere();
    });
  }, [model, normalizeScale]);

  useFrame((state, delta) => {
    if (!group.current) return;
    const simulateLowFps = process.env.NODE_ENV === "development" && lowFpsSimulation.current.enabled;
    if (!preview && document.visibilityState !== "visible" && !simulateLowFps) {
      frameWindow.current.elapsed = 0;
      frameWindow.current.count = 0;
      frameWindow.current.lowWindows = 0;
      frameWindow.current.recoveryWindows = 0;
    } else if (!preview && performance.now() - monitorStartedAt.current >= 2000) {
      frameWindow.current.elapsed += delta;
      frameWindow.current.count += 1;
      if (frameWindow.current.elapsed >= FPS_SAMPLE_WINDOW_SECONDS) {
        const now = performance.now() / 1000;
        const simulationElapsed = (performance.now() - lowFpsSimulation.current.startedAt) / 1000;
        const simulatedLowFps = lowFpsSimulation.current.enabled && simulationElapsed < DEV_LOW_FPS_SIMULATION_SECONDS;
        const measuredFps = lowFpsSimulation.current.enabled
          ? simulatedLowFps ? 20 : 60
          : frameWindow.current.count / frameWindow.current.elapsed;
        const windowState = frameWindow.current;

        if (windowState.quality === "normal") {
          windowState.lowWindows = measuredFps < FPS_LOW_THRESHOLD ? windowState.lowWindows + 1 : 0;
          windowState.recoveryWindows = 0;
          if (windowState.lowWindows >= FPS_LOW_WINDOWS_TO_REDUCE && now - windowState.lastQualityChangeAt >= FPS_QUALITY_COOLDOWN_SECONDS) {
            windowState.quality = "reduced";
            windowState.lastQualityChangeAt = now;
            windowState.lowWindows = 0;
            onQualityChange?.("reduced");
            if (process.env.NODE_ENV === "development") {
              console.info(`[station] quality reduced after sustained low FPS (${measuredFps.toFixed(1)} FPS); station remains mounted`, {
                userRotation: group.current?.parent?.quaternion.toArray(),
              });
            }
          }
        } else {
          windowState.recoveryWindows = measuredFps >= FPS_RECOVERY_THRESHOLD ? windowState.recoveryWindows + 1 : 0;
          windowState.lowWindows = 0;
          if (windowState.recoveryWindows >= FPS_RECOVERY_WINDOWS_TO_RESTORE && now - windowState.lastQualityChangeAt >= FPS_QUALITY_COOLDOWN_SECONDS) {
            windowState.quality = "normal";
            windowState.lastQualityChangeAt = now;
            windowState.recoveryWindows = 0;
            onQualityChange?.("normal");
            if (process.env.NODE_ENV === "development") {
              console.info(`[station] quality restored after sustained recovery (${measuredFps.toFixed(1)} FPS); station remains mounted`, {
                userRotation: group.current?.parent?.quaternion.toArray(),
              });
            }
          }
        }
        frameWindow.current.elapsed = 0;
        frameWindow.current.count = 0;
      }
    }
    if (!preview && process.env.NODE_ENV === "development" && performance.now() - monitorStartedAt.current >= 2000) {
      diagnosticElapsed.current += delta;
      if (diagnosticElapsed.current >= 0.5) {
        diagnosticElapsed.current = 0;
        const currentGroup = group.current;
        if (currentGroup) {
          currentGroup.updateWorldMatrix(true, false);
          const snapshot = new Map<string, { position: number[]; quaternion: number[]; scale: number[]; visible: boolean }>();
          let current: Object3D | null = currentGroup;
          let depth = 0;
          while (current && current !== state.scene && depth < 6) {
            const position = current.getWorldPosition(new Vector3()).toArray();
            const quaternion = current.getWorldQuaternion(new Quaternion()).toArray();
            const scale = current.getWorldScale(new Vector3()).toArray();
            const label = depth === 0 ? "station" : `parent-${depth}`;
            snapshot.set(label, { position, quaternion, scale, visible: current.visible });
            const finite = [...position, ...quaternion, ...scale].every(Number.isFinite);
            const quaternionLength = Math.hypot(...quaternion);
            if ((!finite || quaternionLength < 0.95 || quaternionLength > 1.05 || scale.some((value) => Math.abs(value) < 0.0001))
              && !diagnosticWarnings.current.has(`invalid-${label}`)) {
              diagnosticWarnings.current.add(`invalid-${label}`);
              console.error(`[station] non-finite or degenerate transform at ${label}`, { position, quaternion, scale });
            }
            current = current.parent;
            depth += 1;
          }
          const previous = previousSnapshot.current;
          for (const [label, currentTransform] of snapshot) {
            const prior = previous?.get(label);
            if (prior && currentTransform.visible !== prior.visible) {
              console.warn(`[station] ${label} visibility changed`, { from: prior.visible, to: currentTransform.visible });
            }
            if (!currentTransform.visible && !diagnosticWarnings.current.has(`hidden-${label}`)) {
              diagnosticWarnings.current.add(`hidden-${label}`);
              console.warn(`[station] ${label} became hidden while the station is mounted`);
            }
            if (prior) {
              const positionDelta = Math.hypot(...currentTransform.position.map((value, index) => value - prior.position[index]));
              const scaleDelta = Math.hypot(...currentTransform.scale.map((value, index) => value - prior.scale[index]));
              if ((positionDelta > 0.08 || scaleDelta > 0.08) && !diagnosticWarnings.current.has(`transform-${label}`)) {
                diagnosticWarnings.current.add(`transform-${label}`);
                console.warn(`[station] ${label} position or scale changed between diagnostic samples`, {
                  from: { position: prior.position, scale: prior.scale },
                  to: { position: currentTransform.position, scale: currentTransform.scale },
                });
              }
            }
          }
          const opacity: number[] = [];
          model.traverse((object) => {
            if (!(object instanceof Mesh)) return;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => opacity.push(material.opacity));
          });
          if (opacity.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
            && !diagnosticWarnings.current.has("opacity")) {
            diagnosticWarnings.current.add("opacity");
            console.error("[station] invalid material opacity", { opacity });
          }
          previousSnapshot.current = snapshot;
        }
      }
    }
  });

  return (
    <group ref={group}>
      <group ref={normalizedModel} scale={normalizeScale}>
        <primitive object={model} position={[-center.x, -center.y, -center.z]} dispose={null} />
      </group>
    </group>
  );
}

export function StationPreviewObject({
  scale = STATION_SCALE,
  onBounds,
}: {
  scale?: number;
  onBounds?: (size: readonly [number, number, number]) => void;
}) {
  return <StationModel preview scale={scale} onBounds={onBounds} />;
}
