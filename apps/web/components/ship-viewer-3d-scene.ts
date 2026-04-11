import * as THREE from "three";

const TARGET_MODEL_SIZE = 4;

/** Cinematic hull material — metallic brushed steel with a clearcoat shell.
 *  The clearcoat gives the ship that polished-metal look you get on real
 *  studio renders, even without textures. Environment HDRI drives the
 *  reflections; directional lights carve the panel lines. */
const HULL_MATERIAL = new THREE.MeshPhysicalMaterial({
  color: 0x9ea3bb, // soft platinum — slightly cooler than pure grey
  metalness: 0.85,
  roughness: 0.35,
  clearcoat: 0.75,
  clearcoatRoughness: 0.15,
  envMapIntensity: 1.15,
  side: THREE.FrontSide,
});

export interface NormalizedShipScene {
  root: THREE.Group;
  maxDimension: number;
}

export function normalizeShipScene(scene: THREE.Group): NormalizedShipScene {
  const clone = scene.clone(true);
  clone.updateMatrixWorld(true);

  const sourceBounds = new THREE.Box3().setFromObject(clone);
  const sourceCenter = sourceBounds.getCenter(new THREE.Vector3());
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const maxDimension = Math.max(sourceSize.x, sourceSize.y, sourceSize.z, 0.001);
  const scale = TARGET_MODEL_SIZE / maxDimension;

  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    // Compute vertex normals from geometry — these GLBs ship without them.
    const geo = child.geometry;
    if (geo instanceof THREE.BufferGeometry) {
      if (!geo.getAttribute("normal")) {
        geo.computeVertexNormals();
      }
      // Merge doubled vertices doesn't run here; we trust the source winding.
    }

    // Always override: we never have proper textures, and a consistent
    // clearcoated hull reads better than whatever the GLB shipped with.
    child.material = HULL_MATERIAL;

    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;
  });

  // Center at origin and lift slightly so the ContactShadows pick up
  // a clean silhouette beneath the ship.
  clone.position.sub(sourceCenter);
  clone.scale.setScalar(scale);
  clone.position.multiplyScalar(scale);

  const root = new THREE.Group();
  root.add(clone);
  root.updateMatrixWorld(true);

  return { root, maxDimension };
}
