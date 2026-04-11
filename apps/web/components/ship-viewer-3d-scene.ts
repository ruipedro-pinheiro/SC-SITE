import * as THREE from "three";

const TARGET_MODEL_SIZE = 4;

export interface NormalizedShipScene {
  root: THREE.Group;
  maxDimension: number;
}

/** Normalize a StarBreaker GLB for Three.js rendering.
 *
 *  StarBreaker ship GLBs embed 200+ lights (interior fixtures, thruster
 *  glows, navlights). Three.js compiles each material's shader with all
 *  N scene lights as uniforms — 225 lights × ~5 uniforms each blows past
 *  WebGL's 1024 fragment-uniform cap on Intel UHD GPUs and causes a
 *  black/broken render. Fix: strip all embedded lights, then render with
 *  our own minimal 2-light scene rig. With lights stripped, each PBR
 *  shader uses ~62 uniforms — well under the 1024 cap — so we can use
 *  the GLB's original materials and textures intact. */
export function normalizeShipScene(scene: THREE.Group): NormalizedShipScene {
  const clone = scene.clone(true);
  clone.updateMatrixWorld(true);

  const sourceBounds = new THREE.Box3().setFromObject(clone);
  const sourceCenter = sourceBounds.getCenter(new THREE.Vector3());
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());
  const maxDimension = Math.max(sourceSize.x, sourceSize.y, sourceSize.z, 0.001);
  const scale = TARGET_MODEL_SIZE / maxDimension;

  // Strip all embedded lights — the root cause of the uniform overflow.
  const lightsToRemove: THREE.Light[] = [];
  clone.traverse((child) => {
    if ((child as THREE.Light).isLight) lightsToRemove.push(child as THREE.Light);
  });
  for (const light of lightsToRemove) {
    light.parent?.remove(light);
  }

  // Two-pass: collect skinned meshes to replace, then mutate after traverse.
  const toReplace: { skinned: THREE.SkinnedMesh; replacement: THREE.Mesh }[] = [];

  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const geo = child.geometry;
    if (geo instanceof THREE.BufferGeometry && !geo.getAttribute("normal")) {
      geo.computeVertexNormals();
    }

    child.frustumCulled = false;

    if (child instanceof THREE.SkinnedMesh) {
      // Bake skin into a static Mesh — kills bone-matrix uniforms.
      // Keep the original material so textures are preserved.
      const plain = new THREE.Mesh(geo, child.material);
      plain.name = child.name;
      plain.position.copy(child.position);
      plain.quaternion.copy(child.quaternion);
      plain.scale.copy(child.scale);
      plain.frustumCulled = false;
      toReplace.push({ skinned: child, replacement: plain });
    }
  });

  for (const { skinned, replacement } of toReplace) {
    const parent = skinned.parent;
    if (parent) {
      parent.add(replacement);
      parent.remove(skinned);
    }
  }

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
