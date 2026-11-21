"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Grid, Html, Lightformer, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { ShipModel } from "@/components/ship/ShipModel";

function PreviewScene() {
  return (
    <>
      <color attach="background" args={["#05070a"]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 2]} intensity={1.4} color="#f4e6d3" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3.2} color="#fff0d9" position={[0, 4, 1]} scale={[7, 2, 1]} />
        <Lightformer form="rect" intensity={2.5} color="#6cb8ff" position={[-4, 0, -2]} scale={[2, 5, 1]} />
        <Lightformer form="rect" intensity={2.8} color="#e8a045" position={[4, -1, 2]} scale={[2, 4, 1]} />
      </Environment>
      <Grid args={[16, 16]} position={[0, -0.42, 0]} cellSize={0.25} sectionSize={1} fadeDistance={12} infiniteGrid />
      <axesHelper args={[1.5]} />
      <Suspense fallback={<Html center className="ship-preview__loading">Loading model…</Html>}>
        <ShipModel />
      </Suspense>
      <OrbitControls makeDefault target={[0, 0, 0]} minDistance={1.5} maxDistance={8} />
      <EffectComposer multisampling={2}>
        <Bloom luminanceThreshold={0.74} intensity={0.42} mipmapBlur />
      </EffectComposer>
    </>
  );
}

export default function ShipPreviewCanvas() {
  return (
    <Canvas
      camera={{ position: [2.8, 1.7, 2.8], fov: 42, near: 0.1, far: 100 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    >
      <PreviewScene />
    </Canvas>
  );
}
