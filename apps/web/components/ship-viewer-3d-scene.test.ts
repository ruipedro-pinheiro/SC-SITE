import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import { normalizeShipScene } from "./ship-viewer-3d-scene";

function buildFixtureScene(): {
  scene: THREE.Group;
  hull: THREE.Mesh;
} {
  const scene = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(12, 4, 28),
    new THREE.MeshStandardMaterial({ color: 0x89b4fa, metalness: 0.2, roughness: 0.7 }),
  );
  hull.position.set(30, -5, 12);
  scene.add(hull);
  return { scene, hull };
}

describe("normalizeShipScene", () => {
  test("clones and recenters the GLTF scene without mutating the cached original", () => {
    const { scene, hull } = buildFixtureScene();
    const originalHullPosition = hull.position.clone();
    const originalMaterial = hull.material;

    const prepared = normalizeShipScene(scene);

    expect(prepared.root).not.toBe(scene);
    expect(prepared.root.children[0]).not.toBe(scene.children[0]);
    expect(hull.position.equals(originalHullPosition)).toBe(true);
    expect(hull.material).toBe(originalMaterial);
    expect(prepared.maxDimension).toBeGreaterThan(0);

    const centeredBox = new THREE.Box3().setFromObject(prepared.root);
    const centered = centeredBox.getCenter(new THREE.Vector3());
    expect(centered.length()).toBeLessThan(0.001);
  });
});
