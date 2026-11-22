"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Box3, CanvasTexture, Color, Group, Material, Mesh, MeshBasicMaterial, Object3D, PointLight, SRGBColorSpace, Texture, Vector3 } from "three";
import {
  DOCK_POINT,
  STATION_DIAMETER,
  STATION_DOCK_LIGHT_OFFSET,
  STATION_POD_GLOW_OFFSETS,
  STATION_SCALE,
} from "@/lib/station.config";

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(214,241,255,1)");
    gradient.addColorStop(0.18, "rgba(108,184,255,.75)");
    gradient.addColorStop(1, "rgba(108,184,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

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

export function StationModel({
  preview = false,
  scale = STATION_SCALE,
  onSlowFrame,
  onBounds,
}: {
  preview?: boolean;
  scale?: number;
  onSlowFrame?: () => void;
  onBounds?: (size: readonly [number, number, number]) => void;
}) {
  const { scene } = useGLTF("/models/station.glb", true, true);
  const model = useMemo(() => cloneTexturedScene(scene), [scene]);
  const group = useRef<Group>(null);
  const dockLight = useRef<PointLight>(null);
  const dockSprite = useRef<Group>(null);
  const dockBeamMaterial = useRef<MeshBasicMaterial>(null);
  const frameWindow = useRef({ elapsed: 0, count: 0, slowWindows: 0, hidden: false });
  const monitorStartedAt = useRef(0);
  const previousFrame = useRef<{ position: Vector3; scale: Vector3; visible: boolean; opacity: number[] } | null>(null);
  const anomalyLogged = useRef(false);
  const normalizedModel = useRef<Group>(null);
  const glow = useMemo(makeGlowTexture, []);
  const bounds = useMemo(() => new Box3().setFromObject(model), [model]);
  const center = useMemo(() => bounds.getCenter(new Vector3()), [bounds]);
  const size = useMemo(() => bounds.getSize(new Vector3()), [bounds]);
  const normalizeScale = STATION_DIAMETER / Math.max(size.x, size.z, 0.001) * scale;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.info("[station] source bounds", {
      size: [size.x, size.y, size.z],
      center: [center.x, center.y, center.z],
    });
  }, [center, size]);

  useEffect(() => {
    monitorStartedAt.current = performance.now();
    if (process.env.NODE_ENV === "development") console.info("[station] mounted");
    return () => {
      if (process.env.NODE_ENV === "development") console.info("[station] unmounted");
    };
  }, []);

  useEffect(() => {
    if (preview) onBounds?.([size.x, size.y, size.z]);
  }, [onBounds, preview, size]);

  useEffect(() => () => {
    glow.dispose();
    disposeScene(model);
  }, [glow, model]);

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
    if (!preview && document.visibilityState !== "visible") {
      frameWindow.current.elapsed = 0;
      frameWindow.current.count = 0;
      frameWindow.current.slowWindows = 0;
    } else if (!preview && performance.now() - monitorStartedAt.current >= 2000) {
      frameWindow.current.elapsed += delta;
      frameWindow.current.count += 1;
      if (frameWindow.current.elapsed >= 1.5) {
        const measuredFps = frameWindow.current.count / frameWindow.current.elapsed;
        frameWindow.current.slowWindows = measuredFps < 30 ? frameWindow.current.slowWindows + 1 : 0;
        if (frameWindow.current.slowWindows >= 2 && !frameWindow.current.hidden) {
          frameWindow.current.hidden = true;
          if (process.env.NODE_ENV === "development") {
            console.warn(`[station] hidden after sustained low frame rate (${measuredFps.toFixed(1)} FPS)`);
          }
          onSlowFrame?.();
        }
        frameWindow.current.elapsed = 0;
        frameWindow.current.count = 0;
      }
    }
    if (!preview && process.env.NODE_ENV === "development" && !anomalyLogged.current && performance.now() - monitorStartedAt.current >= 2000) {
      const currentGroup = group.current;
      if (currentGroup) {
        currentGroup.updateWorldMatrix(true, true);
        const position = currentGroup.getWorldPosition(new Vector3());
        const worldScale = currentGroup.getWorldScale(new Vector3());
        let visible = true;
        let parent: Object3D | null = currentGroup;
        while (parent) {
          visible = visible && parent.visible;
          parent = parent.parent;
        }
        const opacity: number[] = [];
        model.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => opacity.push(material.opacity));
        });
        const previous = previousFrame.current;
        const opacityChanged = previous
          ? previous.opacity.length !== opacity.length
            || previous.opacity.some((value, index) => !Number.isFinite(opacity[index]) || Math.abs(value - opacity[index]) > 0.25)
          : false;
        const unexpected = !visible || !position.toArray().every(Number.isFinite) || !worldScale.toArray().every(Number.isFinite)
          || opacity.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
          || Boolean(previous && (position.distanceTo(previous.position) > 0.08 || worldScale.distanceTo(previous.scale) > 0.08 || visible !== previous.visible || opacityChanged));
        if (unexpected) {
          anomalyLogged.current = true;
          console.error("[station] unexpected world transform, visibility, or material opacity", {
            position: position.toArray(), scale: worldScale.toArray(), visible, opacity,
          });
        }
        previousFrame.current = { position, scale: worldScale, visible, opacity };
      }
    }
    const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 2.2) * 0.5;
    if (dockLight.current) dockLight.current.intensity = 0.65 + pulse * 0.7;
    if (dockSprite.current) dockSprite.current.scale.setScalar(0.86 + pulse * 0.22);
    if (dockBeamMaterial.current) dockBeamMaterial.current.opacity = 0.12 + pulse * 0.18;
  });

  return (
    <group ref={group}>
      <group ref={normalizedModel} scale={normalizeScale}>
        <primitive object={model} position={[-center.x, -center.y, -center.z]} dispose={null} />
      </group>
      {STATION_POD_GLOW_OFFSETS.map((offset, index) => (
        <group key={index} position={offset as [number, number, number]}>
          <sprite scale={[0.34, 0.34, 1]}>
            <spriteMaterial map={glow} color={new Color("#6cb8ff")} transparent opacity={0.75} blending={AdditiveBlending} depthWrite={false} />
          </sprite>
        </group>
      ))}
      <group position={STATION_DOCK_LIGHT_OFFSET as [number, number, number]} ref={dockSprite}>
        <sprite scale={[0.22, 0.22, 1]}>
          <spriteMaterial map={glow} color="#d7efff" transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} />
        </sprite>
        {!preview && <pointLight ref={dockLight} color="#6cb8ff" intensity={1} distance={1.2} decay={2} />}
      </group>
      {!preview && <mesh position={[DOCK_POINT[0], DOCK_POINT[1] + 0.3, DOCK_POINT[2]]} frustumCulled={false}>
        <cylinderGeometry args={[0.025, 0.06, 0.6, 12, 1, true]} />
        <meshBasicMaterial ref={dockBeamMaterial} color="#6cb8ff" transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} />
      </mesh>}
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
