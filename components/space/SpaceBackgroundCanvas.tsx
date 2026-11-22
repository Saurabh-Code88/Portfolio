"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles, Stars } from "@react-three/drei";
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
import { StationModel } from "@/components/station/StationModel";
import { FLIGHT_SECTION_IDS, flightCurve, getSectionStops, sampleFlight } from "@/lib/flightPath";
import {
  HERO_SHIP_POSITION,
  HERO_SHIP_ROTATION,
  HERO_SHIP_SCALE,
  HERO_BOB_AMPLITUDE,
  HERO_BOB_SPEED,
} from "@/lib/ship.config";
import { DOCK_POINT, STATION_POSITION, STATION_ROTATION } from "@/lib/station.config";

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
  const stationGroup = useRef<Group>(null);
  const [stationReady, setStationReady] = useState(false);
  const [stationEnabled, setStationEnabled] = useState(true);
  const trail = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const rollStart = useRef<number | null>(null);
  const lastRoll = useRef(0);
  const skipFlight = useRef(false);
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
  const dockedPosition = useMemo(() => new Vector3(), []);
  const dockOffset = useMemo(() => new Vector3(...DOCK_POINT).applyEuler(new Euler(...STATION_ROTATION)), []);
  const freePosition = useMemo(() => new Vector3(), []);
  const dockingPulse = useRef<Group>(null);

  // ── Hero dwell state: when scroll is near top, park in the hero's right half ──
  const heroQuat = useMemo(() => {
    const q = new Quaternion();
    const e = new Euler(HERO_SHIP_ROTATION[0], HERO_SHIP_ROTATION[1], HERO_SHIP_ROTATION[2]);
    q.setFromEuler(e);
    return q;
  }, []);
  const dockQuat = useMemo(() => new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0)), []);
  const modelLoaded = useCallback(() => { ready.current = true; setStationReady(true); }, [ready]);

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
    const handleSkip = () => {
      skipFlight.current = true;
      ready.current = true;
      rollStart.current = null;
    };
    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("portfolio:ship-roll", handleRoll);
    window.addEventListener("portfolio:skip-flight", handleSkip);
    return () => {
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("portfolio:ship-roll", handleRoll);
      window.removeEventListener("portfolio:skip-flight", handleSkip);
    };
  }, [ready]);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (skipFlight.current) {
      group.current.visible = false;
      if (stationGroup.current) stationGroup.current.visible = false;
      if (trail.current) trail.current.visible = false;
      warp.current = 0;
      enginePower.current = 1;
      if (state.camera instanceof PerspectiveCamera) {
        state.camera.fov = MathUtils.damp(state.camera.fov, 48, 3.4, delta);
        state.camera.updateProjectionMatrix();
      }
      return;
    }

    const p = progress.get();

    // Hero dwell: when near top of page, park in hero right half
    const heroDwellEnd = stops.current[1] ?? 0.1; // end of hero → start of toolkit
    const heroBlend = MathUtils.clamp(p / Math.max(0.001, heroDwellEnd * 0.5), 0, 1);

    if (heroBlend < 1) {
      // ── Hero parking position with idle bob ──
      const heroAspectScale = state.viewport.aspect / 1.6;
      const bobY = Math.sin(state.clock.elapsedTime * HERO_BOB_SPEED) * HERO_BOB_AMPLITUDE;
      const stationX = STATION_POSITION[0] * heroAspectScale;
      const stationY = STATION_POSITION[1];
      dockedPosition.set(
        stationX + dockOffset.x,
        stationY + dockOffset.y + 1.65 * heroAspectScale + bobY * 0.35,
        STATION_POSITION[2] + dockOffset.z,
      );
      freePosition.set(
        HERO_SHIP_POSITION[0] * heroAspectScale + pointer.current.x * -0.06,
        HERO_SHIP_POSITION[1] + bobY + pointer.current.y * -0.04,
        HERO_SHIP_POSITION[2],
      );
      shipTarget.lerpVectors(dockedPosition, freePosition, heroBlend);
      group.current.position.lerp(shipTarget, 1 - Math.exp(-delta * 3.5));
      const heroScale = MathUtils.lerp(1, HERO_SHIP_SCALE * heroAspectScale, 1 - heroBlend);
      const dockScale = Math.min(1.65 * heroAspectScale, HERO_SHIP_SCALE * heroAspectScale);
      const activeShipScale = MathUtils.lerp(dockScale, heroScale, heroBlend);
      group.current.scale.setScalar(MathUtils.damp(group.current.scale.x, activeShipScale, 4, delta));

      if (stationGroup.current) {
        stationGroup.current.visible = heroBlend < 0.995;
        stationGroup.current.position.set(stationX + heroBlend * 1.6, stationY + heroBlend * 3.2, STATION_POSITION[2]);
        stationGroup.current.rotation.set(STATION_ROTATION[0], STATION_ROTATION[1] + state.clock.elapsedTime * 0.00012, STATION_ROTATION[2]);
        stationGroup.current.scale.setScalar(MathUtils.lerp(1, 0.86, heroBlend));
      }

      // Three-quarter view orientation + pointer tilt
      pointerEuler.set(pointer.current.y * 0.06, pointer.current.x * 0.08, 0);
      pointerRotation.setFromEuler(pointerEuler);

      // Barrel roll
      let flare = 0;
      const roll = rollStart.current;
      if (roll !== null) {
        const rollProgress = Math.min(1, (performance.now() - roll) / 780);
        rollRotation.setFromAxisAngle(localForward, Math.PI * 2 * rollProgress);
        flare = Math.sin(Math.PI * rollProgress) * 2.4;
        if (rollProgress >= 1) rollStart.current = null;
      } else {
        rollRotation.identity();
      }

      orientation.copy(dockQuat).slerp(heroQuat, heroBlend).multiply(pointerRotation).multiply(rollRotation);
      group.current.quaternion.slerp(orientation, 1 - Math.exp(-delta * 5));
      enginePower.current = MathUtils.damp(enginePower.current, 1 + flare, 5, delta);
      if (dockingPulse.current) dockingPulse.current.scale.setScalar(0.85 + (0.5 + Math.sin(state.clock.elapsedTime * 2.2) * 0.5) * 0.2);
      warp.current = MathUtils.damp(warp.current, 0, 5, delta);

      if (trail.current) {
        trail.current.visible = false;
      }

      // Camera stays centred
      const camera = state.camera;
      cameraTarget.set(0, 0.55, 8);
      camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 1.55));
      cameraLookAt.set(0, 0, 0);
      camera.lookAt(cameraLookAt);
      if (camera instanceof PerspectiveCamera) {
        camera.fov = MathUtils.damp(camera.fov, 48, 3.4, delta);
        camera.updateProjectionMatrix();
      }
      return;
    }

    // ── Scroll flight (existing path) ──
    const sample = sampleFlight(progress.get(), stops.current);
    group.current.scale.setScalar(MathUtils.damp(group.current.scale.x, 1, 4, delta));
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
    <>
      <group ref={stationGroup} position={STATION_POSITION as [number, number, number]} rotation={STATION_ROTATION as [number, number, number]}>
        {stationReady && stationEnabled && <Suspense fallback={null}><StationModel onSlowFrame={() => setStationEnabled(false)} /></Suspense>}
      </group>
      <group ref={group}>
        <Suspense fallback={null}>
          <ShipModel labels={false} onLoad={modelLoaded} enginePower={enginePower} />
        </Suspense>
        <group ref={dockingPulse} position={[0, 0, -0.62]}>
          <pointLight color="#6cb8ff" intensity={0.5} distance={1.1} decay={2} />
          <mesh>
            <sphereGeometry args={[0.035, 12, 10]} />
            <meshBasicMaterial color="#d9f2ff" />
          </mesh>
        </group>
        <group ref={trail} position={[0, 0, -0.5]} visible={false}>
          <Sparkles count={24} scale={[0.35, 0.35, 0.9]} size={2} speed={0.55} color="#6cb8ff" opacity={0.82} />
        </group>
      </group>
    </>
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
      <ambientLight intensity={0.24} />
      <directionalLight position={[-2, 3, -4]} intensity={2.1} color="#e8a045" />
      <pointLight position={[3, 1.5, -4]} intensity={1.25} color="#6cb8ff" distance={14} />
      <Environment resolution={128} background={false}>
        <Lightformer form="rect" intensity={0.7} color="#fff0d9" position={[0, 4, 1]} scale={[6, 1.4, 1]} />
        <Lightformer form="rect" intensity={1.15} color="#6cb8ff" position={[4, 1, -3]} scale={[1.2, 4, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#e8a045" position={[-4, 0, -3]} scale={[1.4, 3, 1]} />
      </Environment>
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
