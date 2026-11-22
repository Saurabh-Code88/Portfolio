"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Box3, CanvasTexture, Color, Group, Material, Mesh, MeshBasicMaterial, PointLight, SRGBColorSpace, Texture, Vector3 } from "three";
import { DOCK_POINT, STATION_DIAMETER, STATION_DOCK_LIGHT_OFFSET, STATION_POD_GLOW_OFFSETS, STATION_SCALE } from "@/lib/station.config";

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

export function StationModel({ preview = false, onSlowFrame, onBounds }: { preview?: boolean; onSlowFrame?: () => void; onBounds?: (size: readonly [number, number, number]) => void }) {
  const { scene } = useGLTF("/models/station.glb");
  const model = useMemo(() => cloneTexturedScene(scene), [scene]);
  const group = useRef<Group>(null);
  const dockLight = useRef<PointLight>(null);
  const dockSprite = useRef<Group>(null);
  const dockBeamMaterial = useRef<MeshBasicMaterial>(null);
  const frameWindow = useRef({ elapsed: 0, count: 0, hidden: false });
  const glow = useMemo(makeGlowTexture, []);
  const bounds = useMemo(() => new Box3().setFromObject(model), [model]);
  const center = useMemo(() => bounds.getCenter(new Vector3()), [bounds]);
  const size = useMemo(() => bounds.getSize(new Vector3()), [bounds]);
  const normalizeScale = STATION_DIAMETER / Math.max(size.x, size.z, 0.001) * STATION_SCALE;

  useEffect(() => {
    if (preview) onBounds?.([size.x, size.y, size.z]);
  }, [onBounds, preview, size]);

  useEffect(() => () => {
    glow.dispose();
    disposeScene(model);
  }, [glow, model]);

  useFrame((state, delta) => {
    if (preview || !group.current) return;
    frameWindow.current.elapsed += delta;
    frameWindow.current.count += 1;
    if (frameWindow.current.elapsed >= 1.5) {
      if (frameWindow.current.count / frameWindow.current.elapsed < 30 && !frameWindow.current.hidden) {
        frameWindow.current.hidden = true;
        onSlowFrame?.();
      }
      frameWindow.current.elapsed = 0;
      frameWindow.current.count = 0;
    }
    const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 2.2) * 0.5;
    if (dockLight.current) dockLight.current.intensity = 0.65 + pulse * 0.7;
    if (dockSprite.current) dockSprite.current.scale.setScalar(0.86 + pulse * 0.22);
    if (dockBeamMaterial.current) dockBeamMaterial.current.opacity = 0.12 + pulse * 0.18;
  });

  return (
    <group ref={group}>
      <group scale={normalizeScale}>
        <primitive object={model} position={[-center.x, -center.y, -center.z]} dispose={null} />
      </group>
      {STATION_POD_GLOW_OFFSETS.map((offset, index) => (
        <group key={index} position={offset as [number, number, number]}>
          <sprite scale={[0.34, 0.34, 1]}>
            <spriteMaterial map={glow} color={new Color("#6cb8ff")} transparent opacity={0.75} blending={AdditiveBlending} depthWrite={false} />
          </sprite>
          {!preview && <pointLight color="#6cb8ff" intensity={0.55} distance={1.1} decay={2} />}
        </group>
      ))}
      <group position={STATION_DOCK_LIGHT_OFFSET as [number, number, number]} ref={dockSprite}>
        <sprite scale={[0.22, 0.22, 1]}>
          <spriteMaterial map={glow} color="#d7efff" transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} />
        </sprite>
        {!preview && <pointLight ref={dockLight} color="#6cb8ff" intensity={1} distance={1.2} decay={2} />}
      </group>
      {!preview && <mesh position={[DOCK_POINT[0], DOCK_POINT[1] + 0.3, DOCK_POINT[2]]}>
        <cylinderGeometry args={[0.025, 0.06, 0.6, 12, 1, true]} />
        <meshBasicMaterial ref={dockBeamMaterial} color="#6cb8ff" transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} />
      </mesh>}
    </group>
  );
}

export function StationPreviewObject({ onBounds }: { onBounds?: (size: readonly [number, number, number]) => void }) {
  return <StationModel preview onBounds={onBounds} />;
}
