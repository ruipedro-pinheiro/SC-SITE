"use client";

import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { Bloom, EffectComposer, SMAA, ToneMapping } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
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
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        shadows
      >
        {/* Fill + key lights — even with Environment, these carve detail */}
        <ambientLight intensity={0.15} />
        <directionalLight
          position={[8, 10, 6]}
          intensity={1.4}
          color="#ffffff"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.1}
          shadow-camera-far={30}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        <directionalLight position={[-6, 3, -4]} intensity={0.6} color="#89b4fa" />
        <directionalLight position={[2, -3, 7]} intensity={0.35} color="#fab387" />

        {/* HDRI environment — gives us real reflections on the metallic hull */}
        <Environment preset="warehouse" background={false} environmentIntensity={0.85} />

        {/* Contact shadow to ground the ship visually */}
        <ContactShadows
          position={[0, -2.2, 0]}
          opacity={0.55}
          scale={12}
          blur={2.5}
          far={4}
          resolution={1024}
          color="#11111b"
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

        <EffectComposer multisampling={0}>
          <SMAA />
          <Bloom
            intensity={0.45}
            luminanceThreshold={0.8}
            luminanceSmoothing={0.3}
            mipmapBlur
          />
          <ToneMapping
            mode={ToneMappingMode.ACES_FILMIC}
            blendFunction={BlendFunction.NORMAL}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
