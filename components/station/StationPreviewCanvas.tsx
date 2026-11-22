"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Grid, Lightformer, OrbitControls } from "@react-three/drei";
import type { Group } from "three";
import { StationPreviewObject } from "@/components/station/StationModel";
import { DOCK_POINT } from "@/lib/station.config";

type PreviewTransform = {
  scale: number;
  position: readonly [number, number, number];
  rotation: readonly [number, number, number];
};

function PreviewScene({ transform, onBounds }: { transform: PreviewTransform; onBounds: (size: readonly [number, number, number]) => void }) {
  const station = useRef<Group>(null);
  const viewport = useThree((state) => state.viewport);
  useFrame(() => {
    station.current?.position.set(viewport.width * transform.position[0], viewport.height * transform.position[1], transform.position[2]);
  });
  return (
    <>
      <color attach="background" args={["#05070a"]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[-3, 5, -4]} intensity={1.8} color="#e8a045" />
      <pointLight position={[3, 3, -3]} intensity={1.2} color="#6cb8ff" distance={12} />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} color="#fff0d9" position={[0, 5, 1]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={2} color="#6cb8ff" position={[4, 1, -4]} scale={[2, 4, 1]} />
      </Environment>
      <Grid args={[16, 16]} position={[0, -0.42, 0]} cellSize={0.25} sectionSize={1} fadeDistance={12} infiniteGrid />
      <Suspense fallback={null}>
        <group ref={station} rotation={transform.rotation as [number, number, number]}>
          <axesHelper args={[1.2]} position={[-3, 0, 0]} />
          <StationPreviewObject scale={transform.scale} onBounds={onBounds} />
          <mesh position={DOCK_POINT as [number, number, number]}>
            <sphereGeometry args={[0.055, 16, 12]} />
            <meshBasicMaterial color="#ffb44b" />
          </mesh>
        </group>
      </Suspense>
      <OrbitControls makeDefault target={[viewport.width * transform.position[0], viewport.height * transform.position[1], transform.position[2]]} minDistance={2} maxDistance={12} />
    </>
  );
}

export default function StationPreviewCanvas({ transform, onBounds }: { transform: PreviewTransform; onBounds: (size: readonly [number, number, number]) => void }) {
  return <Canvas camera={{ position: [3.8, 2.9, 4.8], fov: 42, near: 0.1, far: 100 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}><PreviewScene transform={transform} onBounds={onBounds} /></Canvas>;
}
