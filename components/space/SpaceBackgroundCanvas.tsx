"use client";

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Sparkles, Stars } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
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
  Raycaster,
  Vector2,
  Vector3,
} from "three";
import { ShipModel } from "@/components/ship/ShipModel";
import { StationModel } from "@/components/station/StationModel";
import { FLIGHT_SECTION_IDS, flightCurve, flightProgressStore, getFlightSectionId, getSectionStops, sampleFlight } from "@/lib/flightPath";
import {
  HERO_SHIP_BREAKPOINT_OVERRIDES,
  HERO_SHIP_CAMERA_TARGET_Y,
  HERO_SHIP_HEADER_HEIGHT,
  HERO_SHIP_NOSE_OFFSET,
  HERO_SHIP_POSITION,
  HERO_SHIP_TOP_RESERVE,
  HERO_SHIP_TOP_CLEARANCE,
  HERO_BOB_AMPLITUDE,
  HERO_BOB_SPEED,
  LOW_POWER_CORE_THRESHOLD,
  PARK_DEPTH,
  PARK_HOVER_AMPLITUDE,
  PARK_SCALE,
  PARK_X,
  PARK_Y,
  READOUT_FLIGHT_DURATION_MS,
} from "@/lib/ship.config";
import {
  DOCK_HOVER_HEIGHT,
  DOCK_ENGINE_CLEARANCE,
  STATION_BREAKPOINT_OVERRIDES,
  STATION_DIAMETER,
  STATION_HEIGHT_RATIO,
  STATION_HERO_CAMERA_FOV,
  STATION_SCALE,
  STATION_POSITION,
  STATION_YAW_DRIFT,
} from "@/lib/station.config";
import {
  MODEL_DRAG_SENSITIVITY,
  MODEL_ROTATION_IDLE_RESET_SECONDS,
  MODEL_ROTATION_INERTIA_DAMPING,
} from "@/lib/rotation.config";

type ModelKey = "ship" | "station";
class StationErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[station] failed to load or render /models/station.glb", error);
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

type RotationMotion = {
  pointerId: number | null;
  previous: { x: number; y: number; time: number } | null;
  velocity: Vector3;
  lastInteraction: number;
  moved: boolean;
};

function createRotationMotion(): RotationMotion {
  return { pointerId: null, previous: null, velocity: new Vector3(), lastInteraction: 0, moved: false };
}

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
  const shipUserGroup = useRef<Group>(null);
  const stationGroup = useRef<Group>(null);
  const stationUserGroup = useRef<Group>(null);
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const heroCameraZ = useRef(camera.position.z);
  const shipNoseOffset = useRef(HERO_SHIP_NOSE_OFFSET);
  const [stationReady, setStationReady] = useState(false);
  const [stationEnabled, setStationEnabled] = useState(true);
  const trail = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const rollStart = useRef<number | null>(null);
  const lastRoll = useRef(0);
  const displayedProgress = useRef(0);
  const progressInitialized = useRef(false);
  const navFlight = useRef<{ from: number; to: number; sectionId: (typeof FLIGHT_SECTION_IDS)[number]; startedAt: number; duration: number } | null>(null);
  const expectedScroll = useRef<number | null>(null);
  const rotationMotion = useRef<Record<ModelKey, RotationMotion>>({ ship: createRotationMotion(), station: createRotationMotion() });
  const suppressNextClick = useRef(false);
  const raycaster = useMemo(() => new Raycaster(), []);
  const normalizedPointer = useMemo(() => new Vector2(), []);
  const rotationAxisX = useMemo(() => new Vector3(1, 0, 0), []);
  const rotationAxisY = useMemo(() => new Vector3(0, 1, 0), []);
  const dragYaw = useMemo(() => new Quaternion(), []);
  const dragPitch = useMemo(() => new Quaternion(), []);
  const dragDelta = useMemo(() => new Quaternion(), []);
  const inertiaAxis = useMemo(() => new Vector3(), []);
  const inertiaDelta = useMemo(() => new Quaternion(), []);
  const identityRotation = useMemo(() => new Quaternion(), []);
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
  const parkLocalPosition = useMemo(() => new Vector3(), []);

  // ── Hero dwell state: when scroll is near top, park in the hero's right half ──
  const heroQuat = useMemo(() => new Quaternion(), []);
  const dockQuat = useMemo(() => new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0)), []);
  const idleSpinRotation = useMemo(() => new Quaternion(), []);
  const idleSpinAngle = useRef(0);
  const modelLoaded = useCallback(() => { ready.current = true; setStationReady(true); }, [ready]);
  const modelMeasured = useCallback((bounds: { nose: number }) => {
    if (Number.isFinite(bounds.nose) && bounds.nose > 0) shipNoseOffset.current = bounds.nose;
  }, []);

  useEffect(() => {
    const roots = (): { key: ModelKey; root: Group }[] => [
      ...(shipUserGroup.current ? [{ key: "ship" as const, root: shipUserGroup.current }] : []),
      ...(stationUserGroup.current ? [{ key: "station" as const, root: stationUserGroup.current }] : []),
    ];
    const hitModel = (event: PointerEvent): ModelKey | null => {
      const bounds = gl.domElement.getBoundingClientRect();
      if (!bounds.width || !bounds.height || event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return null;
      normalizedPointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      camera.updateMatrixWorld();
      raycaster.setFromCamera(normalizedPointer, camera);
      for (const { key, root } of roots()) {
        if (!root.visible || (key === "station" && !stationGroup.current?.visible)) continue;
        root.updateWorldMatrix(true, true);
        if (raycaster.intersectObject(root, true).length > 0) return key;
      }
      return null;
    };
    const setCursor = (cursor: "" | "model-grab-hover" | "model-grab-active") => {
      document.documentElement.classList.remove("model-grab-hover", "model-grab-active");
      if (cursor) document.documentElement.classList.add(cursor);
    };
    const isUiTarget = (target: EventTarget | null) => target instanceof Element
      && Boolean(target.closest("a, button:not(.hero-ship-trigger), input, textarea, select, [role='button']"));
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const states = rotationMotion.current;
      const draggingKey = (Object.keys(states) as ModelKey[]).find((key) => states[key].pointerId === event.pointerId);
      if (draggingKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const motion = states[draggingKey];
        const previous = motion.previous;
        if (!previous) return;
        const now = performance.now();
        const dx = event.clientX - previous.x;
        const dy = event.clientY - previous.y;
        if (Math.hypot(dx, dy) > 0.25) motion.moved = true;
        const dt = Math.max(0.008, (now - previous.time) / 1000);
        const userGroup = draggingKey === "ship" ? shipUserGroup.current : stationUserGroup.current;
        if (userGroup) {
          dragYaw.setFromAxisAngle(rotationAxisY, dx * MODEL_DRAG_SENSITIVITY);
          dragPitch.setFromAxisAngle(rotationAxisX, dy * MODEL_DRAG_SENSITIVITY);
          dragDelta.copy(dragYaw).multiply(dragPitch);
          userGroup.quaternion.multiply(dragDelta).normalize();
        }
        motion.velocity.set(dy * MODEL_DRAG_SENSITIVITY / dt, dx * MODEL_DRAG_SENSITIVITY / dt, 0);
        motion.previous = { x: event.clientX, y: event.clientY, time: now };
        motion.lastInteraction = now;
        setCursor("model-grab-active");
        return;
      }
      if (isUiTarget(event.target)) {
        setCursor("");
        return;
      }
      setCursor(hitModel(event) ? "model-grab-hover" : "");
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch" || event.button !== 0 || isUiTarget(event.target)) return;
      const key = hitModel(event);
      if (!key) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const now = performance.now();
      const motion = rotationMotion.current[key];
      motion.pointerId = event.pointerId;
      motion.previous = { x: event.clientX, y: event.clientY, time: now };
      motion.velocity.set(0, 0, 0);
      motion.lastInteraction = now;
      motion.moved = false;
      setCursor("model-grab-active");
    };
    const onPointerUp = (event: PointerEvent) => {
      const motion = (Object.keys(rotationMotion.current) as ModelKey[])
        .map((key) => rotationMotion.current[key])
        .find((state) => state.pointerId === event.pointerId);
      if (!motion) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressNextClick.current = motion.moved;
      if (motion.moved) window.setTimeout(() => { suppressNextClick.current = false; }, 500);
      motion.pointerId = null;
      motion.previous = null;
      motion.lastInteraction = performance.now();
      setCursor("");
    };
    const onPointerCancel = (event: PointerEvent) => {
      onPointerUp(event);
      suppressNextClick.current = false;
    };
    const onClick = (event: MouseEvent) => {
      if (!suppressNextClick.current) return;
      suppressNextClick.current = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
    window.addEventListener("pointerdown", onPointerDown, { capture: true, passive: false });
    window.addEventListener("pointerup", onPointerUp, { capture: true, passive: false });
    window.addEventListener("pointercancel", onPointerCancel, { capture: true, passive: false });
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerCancel, true);
      window.removeEventListener("click", onClick, true);
      setCursor("");
    };
  }, [camera, dragDelta, dragPitch, dragYaw, gl, normalizedPointer, raycaster, rotationAxisX, rotationAxisY]);

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
      const targetProgress = stops.current[sectionIndex] ?? 0;
      if (Math.abs(displayedProgress.current - targetProgress) < 0.002) {
        navFlight.current = null;
        return;
      }
      navFlight.current = {
        from: displayedProgress.current,
        to: targetProgress,
        sectionId: sectionId as (typeof FLIGHT_SECTION_IDS)[number],
        startedAt: performance.now(),
        duration: READOUT_FLIGHT_DURATION_MS,
      };
    };
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
      const isHomeReturn = link.classList.contains("site-brand") && window.location.pathname === "/" && window.scrollY > 0 && !url.hash;
      const sectionId = url.hash ? decodeURIComponent(url.hash.slice(1)) : isHomeReturn ? "hero" : "";
      if (!FLIGHT_SECTION_IDS.includes(sectionId as (typeof FLIGHT_SECTION_IDS)[number])) return;
      const section = document.getElementById(sectionId);
      if (!section) return;
      event.preventDefault();
      event.stopPropagation();
      if (window.location.hash !== url.hash) window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
      requestFlight(sectionId);
    };
    const cancelFlight = () => {
      navFlight.current = null;
      expectedScroll.current = null;
    };
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
    const now = performance.now();
    const interactiveRoots: Record<ModelKey, Group | null> = {
      ship: shipUserGroup.current,
      station: stationUserGroup.current,
    };
    for (const key of ["ship", "station"] as const) {
      const motion = rotationMotion.current[key];
      const root = interactiveRoots[key];
      if (!root || motion.pointerId !== null) continue;
      const speed = motion.velocity.length();
      if (speed > 0.01) {
        inertiaAxis.copy(motion.velocity).normalize();
        inertiaDelta.setFromAxisAngle(inertiaAxis, speed * delta);
        root.quaternion.multiply(inertiaDelta).normalize();
        motion.velocity.multiplyScalar(Math.exp(-MODEL_ROTATION_INERTIA_DAMPING * delta));
      } else {
        motion.velocity.set(0, 0, 0);
      }
      if (now - motion.lastInteraction >= MODEL_ROTATION_IDLE_RESET_SECONDS * 1000) {
        root.quaternion.slerp(identityRotation, 1 - Math.exp(-delta * 2.2));
      }
    }
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
    // Hero dwell: keep the station and docked ship centred in the composition.
    const heroDwellEnd = stops.current[1] ?? 0.1; // end of hero → start of toolkit
    const heroBlend = MathUtils.clamp(p / Math.max(0.001, heroDwellEnd * 0.5), 0, 1);

    const stationPreset = state.size.width >= STATION_BREAKPOINT_OVERRIDES.desktop.minWidth
      ? STATION_BREAKPOINT_OVERRIDES.desktop
      : STATION_BREAKPOINT_OVERRIDES.tablet;
    const shipPreset = state.size.width >= HERO_SHIP_BREAKPOINT_OVERRIDES.desktop.minWidth
      ? HERO_SHIP_BREAKPOINT_OVERRIDES.desktop
      : HERO_SHIP_BREAKPOINT_OVERRIDES.tablet;
    const aspect = Number.isFinite(state.viewport.aspect) ? Math.max(0.1, state.viewport.aspect) : 1;
    const cameraDistance = Math.max(0.1, (Number.isFinite(heroCameraZ.current) ? heroCameraZ.current : 8) - stationPreset.position[2]);
    const frustumHeight = 2 * cameraDistance * Math.tan(STATION_HERO_CAMERA_FOV * Math.PI / 360);
    const frustumWidth = frustumHeight * aspect;
    const desiredWidth = Math.min(
      frustumWidth * stationPreset.widthFraction * STATION_SCALE * stationPreset.scale,
      frustumWidth * 0.47,
    );
    const stationWorldScale = desiredWidth / (STATION_DIAMETER * STATION_SCALE);
    const horizontalRadius = desiredWidth / 2;
    const margin = frustumWidth * 0.005;
    const stationX = MathUtils.clamp(
      frustumWidth * stationPreset.position[0],
      -frustumWidth / 2 + horizontalRadius + margin,
      frustumWidth / 2 - horizontalRadius - margin,
    );
    const stationHeight = desiredWidth * STATION_HEIGHT_RATIO;
    const heroAspectScale = Math.max(1, aspect / 1.6);
    const dockScale = Math.min(DOCK_HOVER_HEIGHT, shipPreset.scale * heroAspectScale);
    const dockedHoverOffset = Math.min(
      DOCK_HOVER_HEIGHT,
      dockScale * 0.78 + DOCK_ENGINE_CLEARANCE,
    );
    dockLocal.set(...stationPreset.dockPoint);
    stationEuler.set(
      stationPreset.rotation[0],
      stationPreset.rotation[1] + state.clock.elapsedTime * STATION_YAW_DRIFT,
      stationPreset.rotation[2],
    );
    dockOffset.copy(dockLocal).applyEuler(stationEuler).multiplyScalar(stationWorldScale);
    const headerAndGap = HERO_SHIP_HEADER_HEIGHT + state.size.height * HERO_SHIP_TOP_CLEARANCE;
    const targetShipNoseY = frustumHeight / 2
      - (headerAndGap / Math.max(1, state.size.height)) * frustumHeight;
    const desiredStationY = targetShipNoseY
      - (shipNoseOffset.current + HERO_SHIP_TOP_RESERVE) * dockScale
      - dockedHoverOffset
      - dockOffset.y
      + frustumHeight * (stationPreset.position[1] - STATION_POSITION[1]);
    const stationY = MathUtils.clamp(
      desiredStationY,
      -frustumHeight / 2 + stationHeight / 2 + margin,
      frustumHeight / 2 - stationHeight / 2 - margin,
    );
    stationPosition.set(stationX, stationY, stationPreset.position[2]);
    if (stationGroup.current) {
      stationGroup.current.visible = true;
      stationGroup.current.position.copy(stationPosition);
      stationGroup.current.rotation.copy(stationEuler);
      stationGroup.current.scale.setScalar(stationWorldScale);
    }

    flightProgressStore.publish({
      sectionId: getFlightSectionId(p, stops.current),
      progress: p,
      isFlying: Boolean(flight),
      isParked: !flight && heroBlend >= 1,
    });

    if (heroBlend < 1 && (!flight || flight.sectionId === "hero")) {
      // ── Hero parking position with idle bob ──
      const bobY = Math.sin(state.clock.elapsedTime * HERO_BOB_SPEED) * HERO_BOB_AMPLITUDE;
      dockedPosition.set(
        stationPosition.x + dockOffset.x,
        stationPosition.y + dockOffset.y + dockedHoverOffset + bobY * 0.35,
        stationPosition.z + dockOffset.z,
      );
      freePosition.set(
        HERO_SHIP_POSITION[0] * heroAspectScale + pointer.current.x * -0.06,
        HERO_SHIP_POSITION[1] + bobY + pointer.current.y * -0.04,
        HERO_SHIP_POSITION[2],
      );
      shipTarget.lerpVectors(dockedPosition, freePosition, heroBlend);
      group.current.position.lerp(shipTarget, 1 - Math.exp(-delta * 3.5));
      const heroScale = MathUtils.lerp(1, shipPreset.scale * heroAspectScale, 1 - heroBlend);
      const activeShipScale = MathUtils.lerp(dockScale, heroScale, heroBlend);
      group.current.scale.setScalar(MathUtils.damp(group.current.scale.x, activeShipScale, 4, delta));

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

      const shipMotion = rotationMotion.current.ship;
      if (heroBlend < 0.001 && shipMotion.pointerId === null
        && now - shipMotion.lastInteraction >= MODEL_ROTATION_IDLE_RESET_SECONDS * 1000) {
        idleSpinAngle.current += shipPreset.idleSpin * delta;
      }
      idleSpinRotation.setFromAxisAngle(rotationAxisY, idleSpinAngle.current * (1 - heroBlend));
      orientation.copy(dockQuat).slerp(heroQuat, heroBlend).premultiply(idleSpinRotation).multiply(pointerRotation).multiply(rollRotation);
      group.current.quaternion.slerp(orientation, 1 - Math.exp(-delta * 5));
      enginePower.current = MathUtils.damp(enginePower.current, 1 + flare, 5, delta);
      warp.current = MathUtils.damp(warp.current, 0, 5, delta);

      if (trail.current) {
        trail.current.visible = false;
      }

      // Camera stays centred
      const camera = state.camera;
      cameraTarget.set(0, HERO_SHIP_CAMERA_TARGET_Y, 8);
      camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 1.55));
      cameraLookAt.set(0, 0, 0);
      camera.lookAt(cameraLookAt);
      if (camera instanceof PerspectiveCamera) {
        camera.fov = MathUtils.damp(camera.fov, 48, 3.4, delta);
        camera.updateProjectionMatrix();
      }
      return;
    }

    // ── Flight or fixed viewport parking ──
    const sample = sampleFlight(p, stops.current);
    const camera = state.camera;
    let flare = 0;
    if (flight) {
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
      flare = sample.warp * 0.8;
      warp.current = MathUtils.damp(warp.current, sample.warp, 5, delta);
      if (trail.current) {
        trail.current.visible = warp.current > 0.08;
        trail.current.scale.setScalar(Math.max(0.001, warp.current));
      }
    } else {
      // Keep the ship at a stable screen coordinate while the camera tracks
      // the active section. Position is derived from the live camera frustum.
      const perspectiveCamera = camera instanceof PerspectiveCamera ? camera : null;
      if (perspectiveCamera) {
        perspectiveCamera.updateMatrixWorld();
        const depth = PARK_DEPTH;
        const halfHeight = depth * Math.tan(perspectiveCamera.fov * Math.PI / 360);
        parkLocalPosition.set(
          (PARK_X * 2 - 1) * halfHeight * perspectiveCamera.aspect,
          (1 - PARK_Y * 2) * halfHeight,
          -depth,
        );
        shipTarget.copy(parkLocalPosition).applyMatrix4(perspectiveCamera.matrixWorld);
      } else {
        shipTarget.set(PARK_X * 8 - 4, 0, 0);
      }
      shipTarget.y += Math.sin(state.clock.elapsedTime * 0.7) * PARK_HOVER_AMPLITUDE;
      group.current.position.lerp(shipTarget, 1 - Math.exp(-delta * 4.2));
      group.current.scale.setScalar(MathUtils.damp(group.current.scale.x, PARK_SCALE, 4, delta));
      orientation.copy(dockQuat);
      pointerEuler.set(0, 0, 0);
      pointerRotation.setFromEuler(pointerEuler);
      warp.current = MathUtils.damp(warp.current, 0, 5, delta);
      if (trail.current) trail.current.visible = false;
    }

    const roll = rollStart.current;
    if (roll !== null) {
      const rollProgress = Math.min(1, (performance.now() - roll) / 780);
      rollRotation.setFromAxisAngle(localForward, Math.PI * 2 * rollProgress);
      flare += Math.sin(Math.PI * rollProgress) * 2.4;
      if (rollProgress >= 1) rollStart.current = null;
    } else {
      rollRotation.identity();
    }
    if (flight) orientation.multiply(bankRotation).multiply(pointerRotation).multiply(rollRotation);
    else orientation.multiply(pointerRotation).multiply(rollRotation);
    group.current.quaternion.slerp(orientation, 1 - Math.exp(-delta * 5));
    enginePower.current = MathUtils.damp(enginePower.current, flight ? 1 + flare : 0.45, 5, delta);

    cameraTarget.set(sample.position.x * 0.3, sample.position.y * 0.24 + 0.55, 8 + sample.position.z * 0.2);
    camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 1.55));
    cameraLookAt.set(sample.position.x * 0.18, sample.position.y * 0.14, 0);
    camera.lookAt(cameraLookAt);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = MathUtils.damp(camera.fov, 48 + sample.warp * 11, 3.4, delta);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      if (!flight) {
        const halfHeight = PARK_DEPTH * Math.tan(camera.fov * Math.PI / 360);
        parkLocalPosition.set(
          (PARK_X * 2 - 1) * halfHeight * camera.aspect,
          (1 - PARK_Y * 2) * halfHeight,
          -PARK_DEPTH,
        );
        group.current.position.copy(parkLocalPosition).applyMatrix4(camera.matrixWorld);
        group.current.position.y += Math.sin(state.clock.elapsedTime * 0.7) * PARK_HOVER_AMPLITUDE;
      }
    }
  });

  return (
    <>
      <group ref={stationGroup}>
        <group ref={stationUserGroup}>
          {stationReady && stationEnabled && (
            <StationErrorBoundary>
              <Suspense fallback={null}>
                <StationModel onSlowFrame={() => setStationEnabled(false)} />
              </Suspense>
            </StationErrorBoundary>
          )}
        </group>
      </group>
      <group ref={group}>
        <group ref={shipUserGroup}>
          <Suspense fallback={null}>
            <ShipModel labels={false} onLoad={modelLoaded} onBounds={modelMeasured} enginePower={enginePower} />
          </Suspense>
          <group ref={trail} position={[0, 0, -0.5]} visible={false}>
            <Sparkles count={24} scale={[0.35, 0.35, 0.9]} size={2} speed={0.55} color="#6cb8ff" opacity={0.82} />
          </group>
        </group>
      </group>
    </>
  );
}

function BackgroundScene({ progress }: { progress: MotionValue<number> }) {
  const gl = useThree((state) => state.gl);
  const [bloomEnabled, setBloomEnabled] = useState(false);
  const loaded = useRef(false);
  const warp = useRef(0);
  const farStars = useRef<Group>(null);
  const nearStars = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const canvas = gl.domElement;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      console.error("[station] WebGL context lost");
    };
    const onContextRestored = () => console.info("[station] WebGL context restored");
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }, [gl]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, []);

  useEffect(() => {
    const lowPower = typeof navigator.hardwareConcurrency === "number"
      && navigator.hardwareConcurrency <= LOW_POWER_CORE_THRESHOLD;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setBloomEnabled(!lowPower && !reducedMotion);
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
      {bloomEnabled && (
        <EffectComposer>
          <Bloom luminanceThreshold={1} luminanceSmoothing={0.08} intensity={0.8} mipmapBlur />
        </EffectComposer>
      )}
    </>
  );
}

export default function SpaceBackgroundCanvas({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: STATION_HERO_CAMERA_FOV, near: 0.1, far: 120 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <BackgroundScene progress={scrollProgress} />
    </Canvas>
  );
}
