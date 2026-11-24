"use client";

import { Html, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import {
  AdditiveBlending,
  Box3,
  CanvasTexture,
  Color,
  DoubleSide,
  Material,
  Mesh,
  Object3D,
  PointLight,
  SRGBColorSpace,
  Texture,
} from "three";
import { useFrame } from "@react-three/fiber";
import { forwardSign, nozzleOffsets, scale } from "@/lib/ship.config";

function cloneTexturedScene(source: Object3D) {
  const clone = source.clone(true);
  clone.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry = object.geometry.clone();
    const cloneMaterial = (material: Material) => {
      const copy = material.clone() as Material & Record<string, unknown>;
      for (const [key, value] of Object.entries(copy)) {
        if (value instanceof Texture) {
          copy[key] = value.clone();
        }
      }
      return copy;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial)
      : cloneMaterial(object.material);
  });
  return clone;
}

function disposeTexturedScene(scene: Object3D) {
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
      material.dispose();
    });
  });
}

function useEngineGlow() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "rgba(255, 243, 207, 1)");
      gradient.addColorStop(0.2, "rgba(255, 166, 63, .85)");
      gradient.addColorStop(0.55, "rgba(255, 91, 25, .35)");
      gradient.addColorStop(1, "rgba(255, 64, 12, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function EngineEffects({ position, power }: { position: readonly [number, number, number]; power: MutableRefObject<number> }) {
  const glow = useEngineGlow();
  const group = useRef<Object3D>(null);
  const light = useRef<PointLight>(null);
  useFrame(() => {
    const intensity = Math.max(0.1, power.current);
    group.current?.scale.setScalar(intensity);
    if (light.current) light.current.intensity = 1.5 * intensity;
  });
  return (
    <group position={position as [number, number, number]}>
      <group ref={group}>
        <sprite scale={[0.34, 0.34, 1]}>
        <spriteMaterial map={glow} color={new Color("#ffb55d")} transparent opacity={0.86} blending={AdditiveBlending} depthWrite={false} />
        </sprite>
        <mesh position={[0, 0, -0.16 * forwardSign]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.075, 0.3, 12, 1, true]} />
          <meshBasicMaterial color="#ff9d3b" transparent opacity={0.34} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
        </mesh>
        <pointLight ref={light} position={[0, 0, -0.1 * forwardSign]} color="#ff9d3b" intensity={1.5} distance={1.4} decay={2} />
      </group>
    </group>
  );
}

export function ShipModel({
  onClick,
  onLoad,
  onBounds,
  labels = true,
  enginePower,
}: {
  onClick?: () => void;
  onLoad?: () => void;
  onBounds?: (bounds: { nose: number }) => void;
  labels?: boolean;
  enginePower?: MutableRefObject<number>;
}) {
  const gltf = useGLTF("/models/ship.glb");
  const model = useMemo(() => cloneTexturedScene(gltf.scene), [gltf.scene]);
  const modelBounds = useMemo(() => new Box3().setFromObject(model), [model]);
  const defaultEnginePower = useRef(1);
  const sharedEnginePower = enginePower ?? defaultEnginePower;
  const modelRotation = forwardSign < 0 ? Math.PI : 0;
  useEffect(() => onLoad?.(), [onLoad]);
  useEffect(() => onBounds?.({ nose: Math.max(0, modelBounds.max.z) }), [modelBounds, onBounds]);
  useEffect(() => () => disposeTexturedScene(model), [model]);
  const nozzles = nozzleOffsets.map(([x, y, z]) => [x, y, z] as const);

  return (
    <group scale={scale} rotation={[0, modelRotation, 0]} onClick={(event) => { event.stopPropagation(); onClick?.(); }}>
      <primitive object={model} />
      {nozzles.map((position, index) => <EngineEffects key={index} position={position} power={sharedEnginePower} />)}
      {labels && <Html position={[0, 0, 1.15]} center distanceFactor={5}><span className="ship-end-label">+Z</span></Html>}
      {labels && <Html position={[0, 0, -1.15]} center distanceFactor={5}><span className="ship-end-label">-Z</span></Html>}
    </group>
  );
}

useGLTF.preload("/models/ship.glb");
