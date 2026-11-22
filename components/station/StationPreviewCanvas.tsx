"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Grid, Lightformer, OrbitControls } from "@react-three/drei";
import { StationPreviewObject } from "@/components/station/StationModel";
import { DOCK_POINT, STATION_POSITION, STATION_ROTATION } from "@/lib/station.config";

function PreviewScene({ onBounds }: { onBounds: (size: readonly [number, number, number]) => void }) {
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
      <axesHelper args={[1.5]} />
      <Suspense fallback={null}>
        <group position={STATION_POSITION as [number, number, number]} rotation={STATION_ROTATION as [number, number, number]}>
          <StationPreviewObject onBounds={onBounds} />
          <mesh position={DOCK_POINT as [number, number, number]}>
            <sphereGeometry args={[0.055, 16, 12]} />
            <meshBasicMaterial color="#ffb44b" />
          </mesh>
        </group>
      </Suspense>
      <OrbitControls makeDefault target={STATION_POSITION as [number, number, number]} minDistance={2} maxDistance={12} />
    </>
  );
}

export default function StationPreviewCanvas({ onBounds }: { onBounds: (size: readonly [number, number, number]) => void }) {
  return <Canvas camera={{ position: [3.8, 2.9, 4.8], fov: 42, near: 0.1, far: 100 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}><PreviewScene onBounds={onBounds} /></Canvas>;
}
