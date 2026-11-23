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
import { StationModel, type StationRenderQuality } from "@/components/station/StationModel";
import { getHorizontalJourneyProjectedRect } from "@/lib/horizontalJourney";
import { FLIGHT_SECTION_IDS, flightCurve, flightProgressStore, getFlightSectionId, getSectionStops, sampleCubicBezier, sampleCubicBezier3, sampleFlight, sampleOrbit, smoothstep, type FlightPhase, type FlightSectionId } from "@/lib/flightPath";
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
  ORBIT_DURATION,
  ORBIT_RADIUS_X,
  ORBIT_RADIUS_Y,
  ORBIT_RADIUS_INSET,
  ORBIT_RATE_VARIATION,
  ORBIT_SCALE_AMPLITUDE,
  ORBIT_SCALE_BASE,
  ORBIT_TILT,
  ORBIT_TURNS,
  PARK_DEPTH,
  PARK_HOVER_AMPLITUDE,
  PARK_SCALE,
  PARK_X,
  PARK_Y,
  SETTLE_DURATION,
  TRAVEL_DURATION,
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
type OrbitFlight = {
  from: number;
  to: number;
  sectionId: FlightSectionId;
  startedAt: number;
  travelDuration: number;
  orbitDuration: number;
  settleDuration: number;
  scrollFrom: number;
  scrollTo: number;
  speed: number;
  fromScreen: Vector2;
  fromVelocity: Vector2;
  fromWorld: Vector3;
  fromDepth: number;
  fromQuaternion: Quaternion;
  fromScale: number;
  fromScrollVelocity: number;
  lastScrollTop: number;
  lastScrollAt: number;
};
type OrbitBounds = { left: number; right: number; centerX: number; centerY: number; radiusX: number; radiusY: number };

function getOrbitBounds(sectionId: FlightSectionId, targetScroll: number, width: number, height: number): OrbitBounds {
  const section = document.getElementById(sectionId);
  const journeyRect = section ? getHorizontalJourneyProjectedRect(section, targetScroll) : null;
  const rect = section && (journeyRect ?? section.getBoundingClientRect());
  if (!rect) return { left: width * 0.18, right: width * 0.82, centerX: width / 2, centerY: height / 2, radiusX: width * 0.32, radiusY: height * 0.28 };
  const projectedTop = journeyRect ? rect.top : rect.top + window.scrollY - targetScroll;
  const projectedBottom = projectedTop + rect.height;
  const headerBottom = document.querySelector<HTMLElement>(".site-header")?.getBoundingClientRect().bottom ?? 0;
  const top = Math.max(headerBottom + 12, projectedTop, 0);
  const bottom = Math.min(height - 24, projectedBottom, height);
  const left = Math.max(24, rect.left);
  const right = Math.min(width - 24, rect.right);
  const centerX = (left + right) / 2;
  const centerY = (top + Math.max(top + 1, bottom)) / 2;
  return {
    left,
    right,
    centerX,
    centerY,
    radiusX: Math.max(36, Math.min((right - left) * ORBIT_RADIUS_X, centerX - 40, width - centerX - 40)),
    radiusY: Math.max(36, Math.min((bottom - top) * ORBIT_RADIUS_Y, centerY - headerBottom - 28, height - centerY - 32)),
  };
}

function screenToWorld(camera: PerspectiveCamera, x: number, y: number, depth: number, width: number, height: number, target: Vector3) {
  const halfHeight = depth * Math.tan(camera.fov * Math.PI / 360);
  target.set(
    (x / Math.max(1, width) * 2 - 1) * halfHeight * camera.aspect,
    (1 - y / Math.max(1, height) * 2) * halfHeight,
    -depth,
  );
  camera.updateMatrixWorld();
  return target.applyMatrix4(camera.matrixWorld);
}

function worldToScreen(camera: PerspectiveCamera, position: Vector3, width: number, height: number, target: Vector2) {
  camera.updateMatrixWorld();
  const projected = position.clone().project(camera);
  return target.set((projected.x + 1) * width / 2, (1 - projected.y) * height / 2);
}
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
  onStationQualityChange,
}: {
  ready: MutableRefObject<boolean>;
  progress: MotionValue<number>;
  warp: MutableRefObject<number>;
  onStationQualityChange: (quality: StationRenderQuality) => void;
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
  const trail = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const rollStart = useRef<number | null>(null);
  const lastRoll = useRef(0);
  const displayedProgress = useRef(0);
  const progressInitialized = useRef(false);
  const navFlight = useRef<OrbitFlight | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const flightScreenVelocity = useMemo(() => new Vector2(), []);
  const scrollVelocity = useRef(0);
  const returnToPark = useRef<{
    startedAt: number;
    duration: number;
    fromScreen: Vector2;
    fromVelocity: Vector2;
    fromDepth: number;
    fromQuaternion: Quaternion;
    bounds: Pick<OrbitBounds, "left" | "right">;
  } | null>(null);
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
  const flightWorld = useMemo(() => new Vector3(), []);
  const flightAhead = useMemo(() => new Vector3(), []);
  const dockApproach = useMemo(() => new Vector3(), []);
  const heroStart = useMemo(() => new Vector3(), []);
  const heroControl1 = useMemo(() => new Vector3(), []);
  const heroControl2 = useMemo(() => new Vector3(), []);
  const flightTangent = useMemo(() => new Vector3(), []);
  const flightScreen = useMemo(() => new Vector2(), []);
  const flightScreenTangent = useMemo(() => new Vector2(), []);
  const orbitSamplePosition = useMemo(() => new Vector2(), []);
  const orbitSampleTangent = useMemo(() => new Vector2(), []);
  const orbitSample = useMemo(() => ({ angle: 0, angleRate: 0, radiusScale: 1, scale: ORBIT_SCALE_BASE }), []);
  const bezierStart = useMemo(() => new Vector2(), []);
  const bezierControl1 = useMemo(() => new Vector2(), []);
  const bezierControl2 = useMemo(() => new Vector2(), []);
  const bezierEnd = useMemo(() => new Vector2(), []);
  const flightOrientation = useMemo(() => new Quaternion(), []);

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
    const clearFlightLayer = () => {
      document.body.classList.remove("orbit-flight-active", "orbit-flight-behind");
    };
    const requestFlight = (sectionId: string, speed = 1) => {
      const sectionIndex = FLIGHT_SECTION_IDS.indexOf(sectionId as (typeof FLIGHT_SECTION_IDS)[number]);
      if (sectionIndex < 0) return;
      const targetProgress = stops.current[sectionIndex] ?? 0;
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
      returnToPark.current = null;
      const viewportWidth = Math.max(1, window.innerWidth);
      const viewportHeight = Math.max(1, window.innerHeight);
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
      const currentPosition = group.current?.position.clone() ?? screenToWorld(camera as PerspectiveCamera, PARK_X * viewportWidth, PARK_Y * viewportHeight, PARK_DEPTH, viewportWidth, viewportHeight, new Vector3());
      const currentRotation = group.current?.quaternion.clone() ?? dockQuat.clone();
      const fromScreen = worldToScreen(camera as PerspectiveCamera, currentPosition, viewportWidth, viewportHeight, new Vector2());
      const fromDepth = Math.max(0.1, -camera.worldToLocal(currentPosition.clone()).z);
      const from = displayedProgress.current;
      const sectionSpan = sectionIndex > 0
        ? Math.max(0.001, stops.current[sectionIndex] - stops.current[sectionIndex - 1])
        : Math.max(0.001, stops.current[1] ?? 0.15);
      const distanceRatio = Math.max(0.35, Math.min(1, Math.abs(targetProgress - from) / sectionSpan));
      const travelDuration = TRAVEL_DURATION * distanceRatio / Math.max(0.4, speed);
      const isHero = sectionId === "hero";
      const now = performance.now();
      navFlight.current = {
        from,
        to: targetProgress,
        sectionId: sectionId as (typeof FLIGHT_SECTION_IDS)[number],
        startedAt: now,
        travelDuration,
        orbitDuration: isHero ? 0 : ORBIT_DURATION / Math.max(0.4, speed),
        settleDuration: SETTLE_DURATION / Math.max(0.4, speed),
        scrollFrom: window.scrollY,
        scrollTo: targetProgress * maxScroll,
        speed,
        fromScreen,
        fromVelocity: flightScreenVelocity.clone(),
        fromWorld: currentPosition,
        fromDepth,
        fromQuaternion: currentRotation,
        fromScale: group.current?.scale.x ?? PARK_SCALE,
        fromScrollVelocity: scrollVelocity.current,
        lastScrollTop: window.scrollY,
        lastScrollAt: now,
      };
      document.body.classList.add("orbit-flight-active");
      document.body.classList.remove("orbit-flight-behind");
      const scrollTick = (now: number) => {
        const current = navFlight.current;
        if (!current) return;
        const phaseProgress = Math.min(1, (now - current.startedAt) / current.travelDuration);
        const t = phaseProgress;
        const inverse = 1 - t;
        const travelSeconds = current.travelDuration / 1000;
        const control1 = current.scrollFrom + current.fromScrollVelocity * travelSeconds / 3;
        const scrollTop = inverse * inverse * inverse * current.scrollFrom
          + 3 * inverse * inverse * t * control1
          + 3 * inverse * t * t * current.scrollTo
          + t * t * t * current.scrollTo;
        const frameSeconds = Math.max(0.001, (now - current.lastScrollAt) / 1000);
        scrollVelocity.current = (scrollTop - current.lastScrollTop) / frameSeconds;
        current.lastScrollTop = scrollTop;
        current.lastScrollAt = now;
        displayedProgress.current = MathUtils.clamp(scrollTop / maxScroll, 0, 1);
        window.scrollTo({ top: scrollTop, behavior: "instant" });
        if (phaseProgress < 1) scrollFrame.current = requestAnimationFrame(scrollTick);
        else {
          scrollFrame.current = null;
        }
      };
      scrollFrame.current = requestAnimationFrame(scrollTick);
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
    const handleProgrammaticFlight = (event: Event) => {
      const detail = (event as CustomEvent<{ sectionId?: string; speed?: number }>).detail;
      if (detail?.sectionId) requestFlight(detail.sectionId, detail.speed ?? 1);
    };
    const handlePopState = () => {
      const sectionId = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "hero";
      if (FLIGHT_SECTION_IDS.includes(sectionId as (typeof FLIGHT_SECTION_IDS)[number])) requestFlight(sectionId);
    };
    const cancelFlight = () => {
      if (navFlight.current && group.current) {
        const perspectiveCamera = camera instanceof PerspectiveCamera ? camera : null;
        const position = group.current.position.clone();
        if (perspectiveCamera) {
          const flight = navFlight.current;
          const fromScreen = worldToScreen(perspectiveCamera, position, window.innerWidth, window.innerHeight, new Vector2());
          const bounds = getOrbitBounds(flight.sectionId, flight.scrollTo, window.innerWidth, window.innerHeight);
          returnToPark.current = {
            startedAt: performance.now(),
            duration: 420,
            fromScreen,
            fromVelocity: flightScreenVelocity.clone(),
            fromDepth: Math.max(0.1, -perspectiveCamera.worldToLocal(position.clone()).z),
            fromQuaternion: group.current.quaternion.clone(),
            bounds,
          };
          document.body.classList.add("orbit-flight-active");
          document.body.classList.toggle("orbit-flight-behind", fromScreen.x < bounds.left || fromScreen.x > bounds.right);
        } else {
          returnToPark.current = null;
          clearFlightLayer();
        }
      }
      navFlight.current = null;
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
      scrollVelocity.current = 0;
    };
    const handleScrollbarPointer = (event: PointerEvent) => {
      if (event.clientX >= window.innerWidth - 18) cancelFlight();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) cancelFlight();
    };
    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("portfolio:flight-to", handleProgrammaticFlight);
    window.addEventListener("wheel", cancelFlight, { passive: true });
    window.addEventListener("touchstart", cancelFlight, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handleScrollbarPointer, { capture: true, passive: true });
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("portfolio:flight-to", handleProgrammaticFlight);
      window.removeEventListener("wheel", cancelFlight);
      window.removeEventListener("touchstart", cancelFlight);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handleScrollbarPointer, true);
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
      clearFlightLayer();
      flightProgressStore.publish({
        sectionId: getFlightSectionId(displayedProgress.current, stops.current),
        targetSectionId: null,
        progress: displayedProgress.current,
        isFlying: false,
        isParked: false,
        phase: "idle",
      });
    };
  }, [camera, dockQuat, flightScreenVelocity, group]);

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
    const flight = navFlight.current;
    let phase: FlightPhase = "idle";
    let flightCompletes = false;
    if (flight) {
      const elapsed = Math.max(0, performance.now() - flight.startedAt);
      const undockDuration = Math.min(140, flight.travelDuration * 0.12);
      const approachStart = flight.travelDuration * 0.82;
      if (elapsed < undockDuration) phase = "undock";
      else if (elapsed < approachStart) phase = "travel";
      else if (elapsed < flight.travelDuration) phase = "approach";
      else if (flight.sectionId !== "hero" && elapsed < flight.travelDuration + flight.orbitDuration) phase = "orbit";
      else if (elapsed < flight.travelDuration + flight.orbitDuration + flight.settleDuration) phase = "settle";
      else {
        phase = "settle";
        flightCompletes = true;
      }
    } else {
      displayedProgress.current = MathUtils.damp(displayedProgress.current, progress.get(), 12, delta);
    }
    const p = displayedProgress.current;
    const activeFlight = phase === "idle" ? null : flight;
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
      targetSectionId: activeFlight?.sectionId ?? null,
      progress: p,
      isFlying: Boolean(activeFlight),
      isParked: !activeFlight && heroBlend >= 1,
      phase,
    });

    if (activeFlight?.sectionId === "hero" || (heroBlend < 1 && !activeFlight)) {
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
      if (activeFlight?.sectionId === "hero") {
        const elapsed = Math.max(0, now - activeFlight.startedAt);
        const totalDuration = Math.max(1, activeFlight.travelDuration + activeFlight.settleDuration);
        const totalProgress = MathUtils.clamp(elapsed / totalDuration, 0, 1);
        const travelProgress = MathUtils.clamp(elapsed / activeFlight.travelDuration, 0, 1);
        const settleProgress = MathUtils.clamp(
          (elapsed - activeFlight.travelDuration) / Math.max(1, activeFlight.settleDuration),
          0,
          1,
        );
        dockApproach.copy(dockedPosition).sub(activeFlight.fromWorld).multiplyScalar(0.56).add(activeFlight.fromWorld);
        dockApproach.y += 0.18;
        flightTangent.copy(dockedPosition).sub(dockApproach).multiplyScalar(0.72 / Math.max(0.001, activeFlight.settleDuration / 1000));
        if (phase !== "settle") {
          heroStart.copy(activeFlight.fromWorld);
          heroControl1.copy(heroStart);
          heroControl2.copy(dockApproach).addScaledVector(flightTangent, -Math.max(0.001, activeFlight.travelDuration / 1000) / 3);
          sampleCubicBezier3(travelProgress, heroStart, heroControl1, heroControl2, dockApproach, flightWorld, flightTangent);
        } else {
          heroControl1.copy(dockApproach).addScaledVector(flightTangent, Math.max(0.001, activeFlight.settleDuration / 1000) / 3);
          heroControl2.copy(dockedPosition);
          sampleCubicBezier3(settleProgress, dockApproach, heroControl1, heroControl2, dockedPosition, flightWorld, flightTangent);
        }
        group.current.position.copy(flightWorld);
        group.current.scale.setScalar(MathUtils.lerp(activeFlight.fromScale, dockScale, smoothstep(totalProgress)));
        group.current.quaternion.copy(activeFlight.fromQuaternion).slerp(dockQuat, smoothstep(totalProgress));
        flightScreenVelocity.set(0, 0);
      } else {
        shipTarget.lerpVectors(dockedPosition, freePosition, heroBlend);
        group.current.position.lerp(shipTarget, 1 - Math.exp(-delta * 3.5));
        const heroScale = MathUtils.lerp(1, shipPreset.scale * heroAspectScale, 1 - heroBlend);
        const activeShipScale = MathUtils.lerp(dockScale, heroScale, heroBlend);
        group.current.scale.setScalar(MathUtils.damp(group.current.scale.x, activeShipScale, 4, delta));
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

      const shipMotion = rotationMotion.current.ship;
      if (heroBlend < 0.001 && shipMotion.pointerId === null
        && now - shipMotion.lastInteraction >= MODEL_ROTATION_IDLE_RESET_SECONDS * 1000) {
        idleSpinAngle.current += shipPreset.idleSpin * delta;
      }
      idleSpinRotation.setFromAxisAngle(rotationAxisY, idleSpinAngle.current * (1 - heroBlend));
      if (activeFlight?.sectionId !== "hero") {
        orientation.copy(dockQuat).slerp(heroQuat, heroBlend).premultiply(idleSpinRotation).multiply(pointerRotation).multiply(rollRotation);
        group.current.quaternion.slerp(orientation, 1 - Math.exp(-delta * 5));
      }
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
      if (flightCompletes) {
        displayedProgress.current = flight?.to ?? 0;
        navFlight.current = null;
        returnToPark.current = null;
        document.body.classList.remove("orbit-flight-active", "orbit-flight-behind");
      }
      return;
    }

    // ── Section orbit flight or fixed viewport parking ──
    const sample = sampleFlight(p, stops.current);
    const camera = state.camera;
    const perspectiveCamera = camera instanceof PerspectiveCamera ? camera : null;
    let flare = 0;
    let outsideContent = false;
    if (activeFlight && perspectiveCamera) {
      const elapsed = Math.max(0, now - activeFlight.startedAt);
      const bounds = getOrbitBounds(activeFlight.sectionId, activeFlight.scrollTo, state.size.width, state.size.height);
      const travelProgress = MathUtils.clamp(elapsed / activeFlight.travelDuration, 0, 1);
      const orbitProgress = MathUtils.clamp((elapsed - activeFlight.travelDuration) / Math.max(1, activeFlight.orbitDuration), 0, 1);
      const settleProgress = MathUtils.clamp((elapsed - activeFlight.travelDuration - activeFlight.orbitDuration) / Math.max(1, activeFlight.settleDuration), 0, 1);
      let depth = PARK_DEPTH;
      let scaleTarget = PARK_SCALE;
      let screenVelocityX = 0;
      let screenVelocityY = 0;
      let depthTangent = 0;
      const travelSeconds = Math.max(0.001, activeFlight.travelDuration / 1000);
      const orbitSeconds = Math.max(0.001, activeFlight.orbitDuration / 1000);
      const settleSeconds = Math.max(0.001, activeFlight.settleDuration / 1000);

      if (phase === "undock" || phase === "travel" || phase === "approach") {
        const entryX = bounds.centerX;
        const entryY = bounds.centerY - bounds.radiusY;
        const orbitStart = sampleOrbit(
          0, bounds.centerX, bounds.centerY, bounds.radiusX, bounds.radiusY, ORBIT_TURNS,
          orbitSamplePosition, orbitSampleTangent, orbitSample, ORBIT_RADIUS_INSET, ORBIT_RATE_VARIATION,
          ORBIT_SCALE_BASE, ORBIT_SCALE_AMPLITUDE,
        );
        bezierStart.copy(activeFlight.fromScreen);
        bezierEnd.set(entryX, entryY);
        bezierControl1.copy(bezierStart).addScaledVector(activeFlight.fromVelocity, travelSeconds / 3);
        bezierControl2.copy(bezierEnd).addScaledVector(orbitSampleTangent, -travelSeconds / (3 * orbitSeconds));
        sampleCubicBezier(travelProgress, bezierStart, bezierControl1, bezierControl2, bezierEnd, flightScreen, flightScreenTangent);
        screenVelocityX = flightScreenTangent.x / travelSeconds;
        screenVelocityY = flightScreenTangent.y / travelSeconds;
        scaleTarget = MathUtils.lerp(activeFlight.fromScale, orbitStart.scale, smoothstep(travelProgress));
        depth = MathUtils.lerp(activeFlight.fromDepth, PARK_DEPTH + 1.1, smoothstep(travelProgress));
        depthTangent = (PARK_DEPTH + 1.1 - activeFlight.fromDepth) * 6 * travelProgress * (1 - travelProgress);
      } else if (phase === "orbit") {
        const orbit = sampleOrbit(
          orbitProgress, bounds.centerX, bounds.centerY, bounds.radiusX, bounds.radiusY, ORBIT_TURNS,
          flightScreen, flightScreenTangent, orbitSample, ORBIT_RADIUS_INSET, ORBIT_RATE_VARIATION,
          ORBIT_SCALE_BASE, ORBIT_SCALE_AMPLITUDE,
        );
        screenVelocityX = flightScreenTangent.x / orbitSeconds;
        screenVelocityY = flightScreenTangent.y / orbitSeconds;
        depth = PARK_DEPTH - Math.sin(orbit.angle) * 1.1;
        depthTangent = -Math.cos(orbit.angle) * orbit.angleRate * 1.1;
        scaleTarget = orbit.scale;
        bankRotation.setFromAxisAngle(localForward, Math.cos(orbit.angle) * ORBIT_TILT);
        outsideContent = flightScreen.x < bounds.left || flightScreen.x > bounds.right;
      } else {
        const orbitEnd = sampleOrbit(
          1, bounds.centerX, bounds.centerY, bounds.radiusX, bounds.radiusY, ORBIT_TURNS,
          orbitSamplePosition, orbitSampleTangent, orbitSample, ORBIT_RADIUS_INSET, ORBIT_RATE_VARIATION,
          ORBIT_SCALE_BASE, ORBIT_SCALE_AMPLITUDE,
        );
        const parkX = state.size.width * PARK_X;
        const parkY = state.size.height * PARK_Y;
        bezierStart.copy(orbitSamplePosition);
        bezierEnd.set(parkX, parkY);
        bezierControl1.copy(bezierStart).addScaledVector(orbitSampleTangent, settleSeconds / (3 * orbitSeconds));
        bezierControl2.copy(bezierEnd);
        sampleCubicBezier(settleProgress, bezierStart, bezierControl1, bezierControl2, bezierEnd, flightScreen, flightScreenTangent);
        screenVelocityX = flightScreenTangent.x / settleSeconds;
        screenVelocityY = flightScreenTangent.y / settleSeconds;
        depth = MathUtils.lerp(PARK_DEPTH + 1.1, PARK_DEPTH, smoothstep(settleProgress));
        depthTangent = -1.1 * 6 * settleProgress * (1 - settleProgress);
        scaleTarget = MathUtils.lerp(orbitEnd.scale, PARK_SCALE, smoothstep(settleProgress));
        outsideContent = flightScreen.x < bounds.left || flightScreen.x > bounds.right;
      }

      flightScreenVelocity.set(screenVelocityX, screenVelocityY);
      group.current.scale.setScalar(scaleTarget);
      screenToWorld(perspectiveCamera, flightScreen.x, flightScreen.y, depth, state.size.width, state.size.height, flightWorld);
      screenToWorld(
        perspectiveCamera,
        flightScreen.x + flightScreenTangent.x * 0.001,
        flightScreen.y + flightScreenTangent.y * 0.001,
        depth + depthTangent * 0.001,
        state.size.width,
        state.size.height,
        flightAhead,
      );
      group.current.position.copy(flightWorld);
      flightTangent.copy(flightAhead).sub(flightWorld);
      if (flightTangent.lengthSq() > 0.00001) {
        direction.copy(flightTangent).normalize();
        orientation.setFromUnitVectors(localForward, direction);
      } else {
        orientation.copy(activeFlight.fromQuaternion);
      }
      if (phase === "travel") {
        flightOrientation.copy(activeFlight.fromQuaternion).slerp(orientation, smoothstep(travelProgress));
      } else if (phase === "settle") {
        flightOrientation.copy(orientation).slerp(dockQuat, smoothstep(settleProgress));
      } else {
        flightOrientation.copy(orientation);
        flightOrientation.multiply(bankRotation);
      }
      group.current.quaternion.slerp(flightOrientation, 1 - Math.exp(-delta * 12));
      const isTravelPhase = phase === "undock" || phase === "travel" || phase === "approach";
      document.body.classList.toggle("orbit-flight-behind", !isTravelPhase && outsideContent);
      warp.current = MathUtils.damp(warp.current, isTravelPhase ? 0.25 : phase === "orbit" ? 0.08 : 0, 5, delta);
      if (trail.current) trail.current.visible = false;
    } else {
      flightScreenVelocity.set(0, 0);
      if (!returnToPark.current) document.body.classList.remove("orbit-flight-behind");
      if (perspectiveCamera) {
        perspectiveCamera.updateMatrixWorld();
        screenToWorld(perspectiveCamera, state.size.width * PARK_X, state.size.height * PARK_Y, PARK_DEPTH, state.size.width, state.size.height, shipTarget);
      } else {
        shipTarget.set(PARK_X * 8 - 4, 0, 0);
      }
      shipTarget.y += Math.sin(state.clock.elapsedTime * 0.7) * PARK_HOVER_AMPLITUDE;
      group.current.position.lerp(shipTarget, 1 - Math.exp(-delta * 4.2));
      group.current.scale.setScalar(MathUtils.damp(group.current.scale.x, PARK_SCALE, 4, delta));
      orientation.copy(dockQuat);
      if (returnToPark.current && perspectiveCamera) {
        const interruption = returnToPark.current;
        const t = MathUtils.clamp((now - interruption.startedAt) / interruption.duration, 0, 1);
        const end = bezierEnd.set(state.size.width * PARK_X, state.size.height * PARK_Y);
        bezierStart.copy(interruption.fromScreen);
        bezierControl1.copy(bezierStart).addScaledVector(interruption.fromVelocity, interruption.duration / 3000);
        bezierControl2.copy(end);
        sampleCubicBezier(t, bezierStart, bezierControl1, bezierControl2, end, flightScreen, flightScreenTangent);
        const depth = MathUtils.lerp(interruption.fromDepth, PARK_DEPTH, smoothstep(t));
        screenToWorld(perspectiveCamera, flightScreen.x, flightScreen.y, depth, state.size.width, state.size.height, group.current.position);
        flightScreenVelocity.copy(flightScreenTangent).multiplyScalar(1000 / interruption.duration);
        group.current.quaternion.copy(interruption.fromQuaternion).slerp(dockQuat, smoothstep(t));
        document.body.classList.toggle("orbit-flight-behind", flightScreen.x < interruption.bounds.left || flightScreen.x > interruption.bounds.right);
        if (t >= 1) {
          returnToPark.current = null;
          document.body.classList.remove("orbit-flight-active", "orbit-flight-behind");
        }
      }
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
    if (!activeFlight) {
      orientation.multiply(pointerRotation).multiply(rollRotation);
      group.current.quaternion.slerp(orientation, 1 - Math.exp(-delta * 5));
      enginePower.current = MathUtils.damp(enginePower.current, 0.45, 5, delta);
    } else {
      const baseEnginePower = phase === "undock" || phase === "travel" || phase === "approach"
        ? 1.2
        : phase === "orbit" ? 1.05 : 0.45;
      enginePower.current = MathUtils.damp(enginePower.current, baseEnginePower + flare, 5, delta);
    }

    cameraTarget.set(sample.position.x * 0.3, sample.position.y * 0.24 + 0.55, 8 + sample.position.z * 0.2);
    camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 1.55));
    cameraLookAt.set(sample.position.x * 0.18, sample.position.y * 0.14, 0);
    camera.lookAt(cameraLookAt);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = MathUtils.damp(camera.fov, 48 + sample.warp * 11, 3.4, delta);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      if (!activeFlight && !returnToPark.current) {
        screenToWorld(camera, state.size.width * PARK_X, state.size.height * PARK_Y, PARK_DEPTH, state.size.width, state.size.height, group.current.position);
        group.current.position.y += Math.sin(state.clock.elapsedTime * 0.7) * PARK_HOVER_AMPLITUDE;
      }
    }
    if (flightCompletes) {
      displayedProgress.current = flight?.to ?? 0;
      if (flight?.sectionId !== "hero" && perspectiveCamera) {
        screenToWorld(perspectiveCamera, state.size.width * PARK_X, state.size.height * PARK_Y, PARK_DEPTH, state.size.width, state.size.height, group.current.position);
        group.current.scale.setScalar(PARK_SCALE);
      }
      navFlight.current = null;
      returnToPark.current = null;
      document.body.classList.remove("orbit-flight-active", "orbit-flight-behind");
    }
  });

  return (
    <>
      <group ref={stationGroup}>
        <group ref={stationUserGroup}>
          {stationReady && (
            <StationErrorBoundary>
              <Suspense fallback={null}>
                <StationModel onQualityChange={onStationQualityChange} />
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

function BackgroundScene({
  progress,
  onStationQualityChange,
}: {
  progress: MotionValue<number>;
  onStationQualityChange: (quality: StationRenderQuality) => void;
}) {
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
      <FlightShip ready={loaded} progress={progress} warp={warp} onStationQualityChange={onStationQualityChange} />
      {bloomEnabled && (
        <EffectComposer>
          <Bloom luminanceThreshold={1} luminanceSmoothing={0.08} intensity={0.8} mipmapBlur />
        </EffectComposer>
      )}
    </>
  );
}

export default function SpaceBackgroundCanvas({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const [stationQuality, setStationQuality] = useState<StationRenderQuality>("normal");

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: STATION_HERO_CAMERA_FOV, near: 0.1, far: 120 }}
      dpr={stationQuality === "reduced" ? 1 : [1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <BackgroundScene progress={scrollProgress} onStationQualityChange={setStationQuality} />
    </Canvas>
  );
}
