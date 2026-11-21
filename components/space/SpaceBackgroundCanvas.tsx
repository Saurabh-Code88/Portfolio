"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { BufferAttribute, BufferGeometry, Group, LineBasicMaterial, MathUtils } from "three";
import { ShipModel } from "@/components/ship/ShipModel";

function HyperspaceStreaks({ ready }: { ready: MutableRefObject<boolean> }) {
  const intensity = useRef(1);
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
    const position = geometry.getAttribute("position");
    intensity.current = MathUtils.damp(intensity.current, ready.current ? 0 : 1, ready.current ? 1.8 : 8, delta);
    const speed = 15 * intensity.current;
    for (let i = 0; i < position.count; i += 2) {
      let z = position.getZ(i) + speed * delta;
      if (z > 2) z = -18;
      const length = 0.08 + 0.9 * intensity.current;
      position.setZ(i, z);
      position.setZ(i + 1, z - length);
    }
    position.needsUpdate = true;
    material.opacity = 0.72 * intensity.current;
  });

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}

function SceneShip({ ready }: { ready: MutableRefObject<boolean> }) {
  const group = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const rollStart = useRef<number | null>(null);
  const lastRoll = useRef(0);
  const enginePower = useRef(1);
  const modelLoaded = useCallback(() => { ready.current = true; }, [ready]);

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
    const time = state.clock.elapsedTime;
    group.current.position.x = 2.15 + pointer.current.x * 0.12;
    group.current.position.y = -0.48 + Math.sin(time * 0.7) * 0.055 + pointer.current.y * -0.08;
    group.current.rotation.x = MathUtils.damp(group.current.rotation.x, pointer.current.y * 0.12, 3, delta);
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, -0.58 + pointer.current.x * 0.17, 3, delta);
    const roll = rollStart.current;
    let flare = 0;
    if (roll !== null) {
      const progress = Math.min(1, (performance.now() - roll) / 780);
      group.current.rotation.z = Math.PI * 2 * progress;
      flare = Math.sin(Math.PI * progress);
      if (progress >= 1) {
        group.current.rotation.z = 0;
        rollStart.current = null;
      }
    }
    enginePower.current = MathUtils.damp(enginePower.current, 1 + flare * 2.4, 6, delta);
  });

  return (
    <group ref={group}>
      <Suspense fallback={null}>
        <ShipModel labels={false} onLoad={modelLoaded} enginePower={enginePower} />
      </Suspense>
    </group>
  );
}

function BackgroundScene() {
  const loaded = useRef(false);
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
      <group ref={farStars}>
        <Stars radius={34} depth={36} count={480} factor={2.1} saturation={0.18} fade speed={0.04} />
      </group>
      <group ref={nearStars}>
        <Stars radius={23} depth={20} count={130} factor={3.2} saturation={0.34} fade speed={0.09} />
      </group>
      <HyperspaceStreaks ready={loaded} />
      <SceneShip ready={loaded} />
    </>
  );
}

export default function SpaceBackgroundCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 48, near: 0.1, far: 120 }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <BackgroundScene />
    </Canvas>
  );
}
