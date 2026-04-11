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

    const mats = Array.isArray(child.material) ? child.material : [child.material];

    // Cap emissive glow from thruster/engine textures. The GLB bakes
    // full-brightness orange thruster maps meant for dark in-game shots;
    // in the viewer they overpower the hull. 0.15 keeps warmth, kills flash.
    for (const m of mats) {
      if (m instanceof THREE.MeshStandardMaterial && m.emissiveIntensity > 0.15) {
        m.emissiveIntensity = 0.15;
      }
    }

    // Cockpit glass transparency. Canopy/glass meshes get semi-transparent
    // treatment so the cockpit interior is visible through the windshield.
    const nameLower = child.name.toLowerCase();
    const isGlass = nameLower === "glass" || nameLower === "canopy" ||
      nameLower.includes("cockpit_glass") || nameLower.includes("windshield");
    if (isGlass) {
      for (const m of mats) {
        if (m instanceof THREE.MeshStandardMaterial) {
          m.transparent = true;
          m.opacity = nameLower === "glass" ? 0.22 : 0.4;
          m.roughness = Math.min(m.roughness, 0.08);
          m.metalness = 0.0;
          m.depthWrite = false;
        }
      }
    }

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
