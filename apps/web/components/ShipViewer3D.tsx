"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { type JSX, Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { normalizeShipScene } from "./ship-viewer-3d-scene";

const CAMERA_POSITION: [number, number, number] = [6.5, 2.4, 6.5];

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
        camera={{ position: CAMERA_POSITION, fov: 34 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.5} />
        <hemisphereLight args={["#cdd6f4", "#181825", 0.6]} />
        <directionalLight position={[8, 10, 6]} intensity={2.8} color="#cdd6f4" />
        <directionalLight position={[-7, 4, -4]} intensity={0.6} color="#a6adc8" />
        <directionalLight position={[1, -2, 8]} intensity={0.4} color="#bac2de" />
        <directionalLight position={[0, -6, -3]} intensity={0.3} color="#585b70" />

        <Suspense fallback={null}>
          <ShipModel url={glbUrl} onReady={() => setIsReady(true)} />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          autoRotate
          autoRotateSpeed={0.45}
          minDistance={3.5}
          maxDistance={10}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
