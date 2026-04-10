import * as THREE from "three";

const TARGET_MODEL_SIZE = 4;

/** Catppuccin Mocha hull material — solid opaque, front-face only
 *  to hide interior geometry bleeding through. */
const HULL_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0x7f849c, // overlay1 — neutral grey, lights add the color
  metalness: 0.3,
  roughness: 0.5,
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

    // Compute normals if missing — these GLBs are position-only vertex soup
    const geo = child.geometry;
    if (geo instanceof THREE.BufferGeometry && !geo.getAttribute("normal")) {
      geo.computeVertexNormals();
    }

    // Apply hull material when the mesh has no material or a default one
    if (!child.material || (child.material instanceof THREE.MeshBasicMaterial)) {
      child.material = HULL_MATERIAL;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;
  });

  clone.position.sub(sourceCenter);
  clone.scale.setScalar(scale);
  clone.position.multiplyScalar(scale);

  const root = new THREE.Group();
  root.add(clone);
  root.updateMatrixWorld(true);

  return { root, maxDimension };
}
