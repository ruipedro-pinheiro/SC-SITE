"use client";

import { Environment, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { type JSX, Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { normalizeShipScene } from "./ship-viewer-3d-scene";

const CAMERA_POSITION: [number, number, number] = [5.5, 2.2, 6.5];

function ShipModel({
  url,
  onReady,
}: {
  url: string;
  onReady: () => void;
}): JSX.Element {
  const { scene } = useLoader(GLTFLoader, url) as { scene: THREE.Group };
  const preparedScene = useMemo(() => normalizeShipScene(scene).root, [scene]);

  useEffect(() => {
    onReady();
  }, [onReady]);

  return <primitive object={preparedScene} />;
}

export function ShipViewer3D({
  glbUrl,
  className,
}: { glbUrl: string; className?: string }): JSX.Element {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);
    useLoader.preload(GLTFLoader, glbUrl);
  }, [glbUrl]);

  return (
    <div className={className ?? "w-full h-full relative"}>
      {!isReady ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="px-3 py-1.5 rounded-sm border border-surface0/70 bg-mantle/85 text-10 tracking-label text-overlay1 uppercase backdrop-blur-sm">
            loading hull geometry
          </div>
        </div>
      ) : null}

      <Canvas
        camera={{ position: CAMERA_POSITION, fov: 32 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        {/* "studio" env map gives sharp metallic reflections without warm
            color bias — our scene lights provide the Catppuccin Mocha palette. */}
        <Environment preset="studio" />
        {/* Key: cool starlight blue from upper-right.
            Fill: lavender nebula tint from lower-left to wrap shadow side. */}
        <ambientLight intensity={0.25} color="#1a2040" />
        <directionalLight position={[6, 8, 5]} intensity={1.6} color="#b8d4ff" />
        <directionalLight position={[-5, -1, -4]} intensity={0.55} color="#9b7fd4" />

        {/* Deep-space starfield */}
        <Stars
          radius={80}
          depth={40}
          count={4000}
          factor={3.5}
          saturation={0}
          fade
          speed={0.3}
        />

        <Suspense fallback={null}>
          <ShipModel url={glbUrl} onReady={() => setIsReady(true)} />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          autoRotate
          autoRotateSpeed={0.5}
          minDistance={4}
          maxDistance={12}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.75}
          target={[0, 0, 0]}
        />

      </Canvas>
    </div>
  );
}
