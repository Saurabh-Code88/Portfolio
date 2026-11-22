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
  HERO_SHIP_SCALE,
  HERO_BOB_AMPLITUDE,
  HERO_BOB_SPEED,
} from "@/lib/ship.config";
import {
  DOCK_HOVER_HEIGHT,
  STATION_BREAKPOINT_OVERRIDES,
  STATION_DIAMETER,
  STATION_HEIGHT_RATIO,
  STATION_SCALE,
  STATION_YAW_DRIFT,
} from "@/lib/station.config";

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
  const displayedProgress = useRef(0);
  const progressInitialized = useRef(false);
  const navFlight = useRef<{ from: number; to: number; startedAt: number; duration: number } | null>(null);
  const expectedScroll = useRef<number | null>(null);
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
  const stationPosition = useMemo(() => new Vector3(), []);
  const dockLocal = useMemo(() => new Vector3(), []);
  const dockOffset = useMemo(() => new Vector3(), []);
  const stationEuler = useMemo(() => new Euler(), []);
  const freePosition = useMemo(() => new Vector3(), []);
  const dockingPulse = useRef<Group>(null);

  // ── Hero dwell state: when scroll is near top, park in the hero's right half ──
  const heroQuat = useMemo(() => new Quaternion(), []);
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
    const requestFlight = (sectionId: string) => {
      const sectionIndex = FLIGHT_SECTION_IDS.indexOf(sectionId as (typeof FLIGHT_SECTION_IDS)[number]);
      if (sectionIndex < 0) return;
      navFlight.current = {
        from: displayedProgress.current,
        to: stops.current[sectionIndex] ?? 0,
        startedAt: performance.now(),
        duration: 1500,
      };
    };
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      const sectionId = decodeURIComponent(url.hash.slice(1));
      if (!FLIGHT_SECTION_IDS.includes(sectionId as (typeof FLIGHT_SECTION_IDS)[number])) return;
      const section = document.getElementById(sectionId);
      if (!section) return;
      event.preventDefault();
      event.stopPropagation();
      if (window.location.hash !== url.hash) window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
      requestFlight(sectionId);
    };
    const cancelFlight = () => { navFlight.current = null; };
    const handleScroll = () => {
      const expected = expectedScroll.current;
      if (navFlight.current && expected !== null && Math.abs(window.scrollY - expected) > 80) cancelFlight();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) cancelFlight();
    };
    document.addEventListener("click", handleClick, true);
    window.addEventListener("wheel", cancelFlight, { passive: true });
    window.addEventListener("touchstart", cancelFlight, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("wheel", cancelFlight);
      window.removeEventListener("touchstart", cancelFlight);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
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
  }, [ready]);

  useFrame((state, delta) => {
    if (!group.current) return;
    if (!progressInitialized.current) {
      displayedProgress.current = progress.get();
      progressInitialized.current = true;
    }
    let requestedProgress = progress.get();
    const flight = navFlight.current;
    let flightElapsed = 1;
    if (flight) {
      flightElapsed = Math.min(1, (performance.now() - flight.startedAt) / flight.duration);
      const eased = flightElapsed < 0.5 ? 4 * flightElapsed * flightElapsed * flightElapsed : 1 - Math.pow(-2 * flightElapsed + 2, 3) / 2;
      requestedProgress = MathUtils.lerp(flight.from, flight.to, eased);
      // The click path already has a cubic ease; use that exact value for both
      // scroll and the ship so their movement stays in lockstep.
      displayedProgress.current = requestedProgress;
    } else {
      displayedProgress.current = MathUtils.damp(displayedProgress.current, requestedProgress, 12, delta);
    }
    const p = displayedProgress.current;
    if (flight) {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      expectedScroll.current = p * maxScroll;
      window.scrollTo({ top: expectedScroll.current, behavior: "instant" });
      if (flightElapsed >= 1) {
        navFlight.current = null;
        expectedScroll.current = null;
      }
    } else {
      expectedScroll.current = null;
    }
    // Hero dwell: when near top of page, park in hero right half
    const heroDwellEnd = stops.current[1] ?? 0.1; // end of hero → start of toolkit
    const heroBlend = MathUtils.clamp(p / Math.max(0.001, heroDwellEnd * 0.5), 0, 1);

    if (heroBlend < 1) {
      // ── Hero parking position with idle bob ──
      const heroAspectScale = state.viewport.aspect / 1.6;
      const bobY = Math.sin(state.clock.elapsedTime * HERO_BOB_SPEED) * HERO_BOB_AMPLITUDE;
      const stationPreset = state.size.width >= STATION_BREAKPOINT_OVERRIDES.desktop.minWidth
        ? STATION_BREAKPOINT_OVERRIDES.desktop
        : STATION_BREAKPOINT_OVERRIDES.tablet;
      const fitCamera = state.camera as PerspectiveCamera;
      const cameraDistance = Math.max(0.1, fitCamera.position.z - stationPreset.position[2]);
      const frustumHeight = 2 * cameraDistance * Math.tan(fitCamera.fov * Math.PI / 360);
      const frustumWidth = frustumHeight * state.viewport.aspect;
      const desiredWidth = Math.min(
        frustumWidth * stationPreset.widthFraction * STATION_SCALE * stationPreset.scale,
        frustumWidth * 0.47,
      );
      const stationWorldScale = desiredWidth / (STATION_DIAMETER * STATION_SCALE);
      const horizontalRadius = desiredWidth / 2;
      const margin = frustumWidth * 0.005;
      const stationX = MathUtils.clamp(
        frustumWidth * stationPreset.position[0],
        horizontalRadius + margin,
        frustumWidth / 2 - horizontalRadius - margin,
      );
      const stationHeight = desiredWidth * STATION_HEIGHT_RATIO;
      const stationY = MathUtils.clamp(
        frustumHeight * stationPreset.position[1],
        -frustumHeight / 2 + stationHeight / 2 + margin,
        frustumHeight / 2 - stationHeight / 2 - margin,
      );
      stationPosition.set(stationX, stationY, stationPreset.position[2]);
      dockLocal.set(...stationPreset.dockPoint);
      stationEuler.set(
        stationPreset.rotation[0],
        stationPreset.rotation[1] + state.clock.elapsedTime * STATION_YAW_DRIFT,
        stationPreset.rotation[2],
      );
      dockOffset.copy(dockLocal).applyEuler(stationEuler).multiplyScalar(stationWorldScale);
      dockedPosition.set(
        stationPosition.x + dockOffset.x,
        stationPosition.y + dockOffset.y + DOCK_HOVER_HEIGHT + bobY * 0.35,
        stationPosition.z + dockOffset.z,
      );
      freePosition.set(
        HERO_SHIP_POSITION[0] * heroAspectScale + pointer.current.x * -0.06,
        HERO_SHIP_POSITION[1] + bobY + pointer.current.y * -0.04,
        HERO_SHIP_POSITION[2],
      );
      shipTarget.lerpVectors(dockedPosition, freePosition, heroBlend);
      group.current.position.lerp(shipTarget, 1 - Math.exp(-delta * 3.5));
      const heroScale = MathUtils.lerp(1, HERO_SHIP_SCALE * heroAspectScale, 1 - heroBlend);
      const dockScale = Math.min(DOCK_HOVER_HEIGHT, HERO_SHIP_SCALE * heroAspectScale);
      const activeShipScale = MathUtils.lerp(dockScale, heroScale, heroBlend);
      group.current.scale.setScalar(MathUtils.damp(group.current.scale.x, activeShipScale, 4, delta));

      if (stationGroup.current) {
        stationGroup.current.visible = heroBlend < 0.995;
        stationGroup.current.position.set(stationX + heroBlend * 1.6, stationY + heroBlend * 3.2, stationPreset.position[2]);
        stationGroup.current.rotation.copy(stationEuler);
        stationGroup.current.scale.setScalar(stationWorldScale * MathUtils.lerp(1, 0.86, heroBlend));
      }

      // Three-quarter view orientation + pointer tilt
      direction.copy(flightCurve.getTangent(0)).normalize();
      heroQuat.setFromUnitVectors(localForward, direction);
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
    const sample = sampleFlight(p, stops.current);
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
      <group ref={stationGroup}>
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
