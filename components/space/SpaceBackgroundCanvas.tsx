"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Stars } from "@react-three/drei";
import type { MotionValue } from "framer-motion";
import {
  BufferAttribute,
  BufferGeometry,
  Euler,
  Group,
  LineBasicMaterial,
  MathUtils,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from "three";
import { ShipModel } from "@/components/ship/ShipModel";
import { FLIGHT_SECTION_IDS, flightCurve, getSectionStops, sampleFlight } from "@/lib/flightPath";

function HyperspaceStreaks({ ready, warp }: { ready: MutableRefObject<boolean>; warp: MutableRefObject<number> }) {
  const bootIntensity = useRef(1);
  const geometry = useMemo(() => {
    const count = 72;
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i += 1) {
      const x = (Math.random() - 0.5) * 24;
      const y = (Math.random() - 0.5) * 14;
      const z = -18 + Math.random() * 19;
      const offset = i * 6;
      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = z;
      positions[offset + 3] = x;
      positions[offset + 4] = y;
      positions[offset + 5] = z - 0.45;
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new BufferAttribute(positions, 3));
    return result;
  }, []);
  const material = useMemo(() => new LineBasicMaterial({ color: "#6cb8ff", transparent: true, opacity: 0 }), []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((_, delta) => {
    bootIntensity.current = MathUtils.damp(bootIntensity.current, ready.current ? 0 : 1, ready.current ? 1.8 : 8, delta);
    const intensity = Math.max(bootIntensity.current, warp.current * 0.92);
    const position = geometry.getAttribute("position");
    const speed = 15 * intensity;
    for (let i = 0; i < position.count; i += 2) {
      let z = position.getZ(i) + speed * delta;
      if (z > 2) z = -18;
      position.setZ(i, z);
      position.setZ(i + 1, z - (0.08 + 0.9 * intensity));
    }
    position.needsUpdate = true;
    material.opacity = 0.72 * intensity;
  });

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}

function FlightShip({
  ready,
  progress,
  warp,
}: {
  ready: MutableRefObject<boolean>;
  progress: MotionValue<number>;
  warp: MutableRefObject<number>;
}) {
  const group = useRef<Group>(null);
  const trail = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const rollStart = useRef<number | null>(null);
  const lastRoll = useRef(0);
  const enginePower = useRef(1);
  const stops = useRef(FLIGHT_SECTION_IDS.map((_, index) => index / (FLIGHT_SECTION_IDS.length - 1)));
  const orientation = useMemo(() => new Quaternion(), []);
  const direction = useMemo(() => new Vector3(), []);
  const before = useMemo(() => new Vector3(), []);
  const after = useMemo(() => new Vector3(), []);
  const localForward = useMemo(() => new Vector3(0, 0, 1), []);
  const bankRotation = useMemo(() => new Quaternion(), []);
  const pointerRotation = useMemo(() => new Quaternion(), []);
  const rollRotation = useMemo(() => new Quaternion(), []);
  const pointerEuler = useMemo(() => new Euler(), []);
  const cameraTarget = useMemo(() => new Vector3(), []);
  const cameraLookAt = useMemo(() => new Vector3(), []);
  const shipTarget = useMemo(() => new Vector3(), []);
  const modelLoaded = useCallback(() => { ready.current = true; }, [ready]);

  useEffect(() => {
    const updateStops = () => {
      stops.current = getSectionStops(document.documentElement.scrollHeight, window.innerHeight);
    };
    const root = document.querySelector("main");
    updateStops();
    window.addEventListener("resize", updateStops, { passive: true });
    const observer = root && typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateStops) : null;
    if (root) observer?.observe(root);
    return () => {
      window.removeEventListener("resize", updateStops);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    const handlePointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    const handleRoll = () => {
      const now = performance.now();
      if (now - lastRoll.current < 2600) return;
      lastRoll.current = now;
      rollStart.current = now;
    };
    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("portfolio:ship-roll", handleRoll);
    return () => {
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("portfolio:ship-roll", handleRoll);
    };
  }, []);

  useFrame((state, delta) => {
    if (!group.current) return;
    const sample = sampleFlight(progress.get(), stops.current);
    shipTarget.copy(sample.position);
    shipTarget.y += Math.sin(state.clock.elapsedTime * 0.7) * 0.035 + pointer.current.y * -0.04;
    group.current.position.lerp(shipTarget, 1 - Math.exp(-delta * 4.2));
    direction.copy(sample.tangent).normalize();
    before.copy(flightCurve.getTangent(Math.max(0, sample.curveProgress - 0.012)));
    after.copy(flightCurve.getTangent(Math.min(1, sample.curveProgress + 0.012)));
    const curvature = before.x * after.y - before.y * after.x;
    const bank = MathUtils.clamp(-curvature * 3.5, -0.34, 0.34);
    orientation.setFromUnitVectors(localForward, direction);
    bankRotation.setFromAxisAngle(localForward, bank);
    pointerEuler.set(pointer.current.y * 0.08, pointer.current.x * 0.1, 0);
    pointerRotation.setFromEuler(pointerEuler);

    let flare = sample.warp * 0.8;
    const roll = rollStart.current;
    if (roll !== null) {
      const rollProgress = Math.min(1, (performance.now() - roll) / 780);
      rollRotation.setFromAxisAngle(localForward, Math.PI * 2 * rollProgress);
      flare += Math.sin(Math.PI * rollProgress) * 2.4;
      if (rollProgress >= 1) rollStart.current = null;
    } else {
      rollRotation.identity();
    }
    orientation.multiply(bankRotation).multiply(pointerRotation).multiply(rollRotation);
    group.current.quaternion.slerp(orientation, 1 - Math.exp(-delta * 5));
    enginePower.current = MathUtils.damp(enginePower.current, 1 + flare, 5, delta);
    warp.current = MathUtils.damp(warp.current, sample.warp, 5, delta);
    if (trail.current) {
      trail.current.visible = warp.current > 0.08;
      trail.current.scale.setScalar(Math.max(0.001, warp.current));
    }

    const camera = state.camera;
    cameraTarget.set(sample.position.x * 0.3, sample.position.y * 0.24 + 0.55, 8 + sample.position.z * 0.2);
    camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 1.55));
    cameraLookAt.set(sample.position.x * 0.18, sample.position.y * 0.14, 0);
    camera.lookAt(cameraLookAt);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = MathUtils.damp(camera.fov, 48 + sample.warp * 11, 3.4, delta);
      camera.updateProjectionMatrix();
    }
  });

  return (
    <group ref={group}>
      <Suspense fallback={null}>
        <ShipModel labels={false} onLoad={modelLoaded} enginePower={enginePower} />
      </Suspense>
      <group ref={trail} position={[0, 0, -0.5]} visible={false}>
        <Sparkles count={24} scale={[0.35, 0.35, 0.9]} size={2} speed={0.55} color="#6cb8ff" opacity={0.82} />
      </group>
    </group>
  );
}

function BackgroundScene({ progress }: { progress: MotionValue<number> }) {
  const loaded = useRef(false);
  const warp = useRef(0);
  const farStars = useRef<Group>(null);
  const nearStars = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, []);

  useFrame((_, delta) => {
    if (farStars.current) {
      farStars.current.rotation.x = MathUtils.damp(farStars.current.rotation.x, pointer.current.y * 0.012, 1.5, delta);
      farStars.current.rotation.y = MathUtils.damp(farStars.current.rotation.y, pointer.current.x * 0.012, 1.5, delta);
    }
    if (nearStars.current) {
      nearStars.current.rotation.x = MathUtils.damp(nearStars.current.rotation.x, pointer.current.y * 0.03, 1.5, delta);
      nearStars.current.rotation.y = MathUtils.damp(nearStars.current.rotation.y, pointer.current.x * 0.03, 1.5, delta);
    }
  });

  return (
    <>
      <ambientLight intensity={0.62} />
      <directionalLight position={[4, 5, 3]} intensity={1.65} color="#fff0dd" />
      <pointLight position={[-4, 2, -1]} intensity={0.8} color="#6cb8ff" distance={16} />
      <group ref={farStars}>
        <Stars radius={34} depth={36} count={480} factor={2.1} saturation={0.18} fade speed={0.04} />
      </group>
      <group ref={nearStars}>
        <Stars radius={23} depth={20} count={130} factor={3.2} saturation={0.34} fade speed={0.09} />
      </group>
      <HyperspaceStreaks ready={loaded} warp={warp} />
      <FlightShip ready={loaded} progress={progress} warp={warp} />
    </>
  );
}

export default function SpaceBackgroundCanvas({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 48, near: 0.1, far: 120 }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <BackgroundScene progress={scrollProgress} />
    </Canvas>
  );
}
