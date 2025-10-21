import * as THREE from 'three';

export function fixBounds(root: THREE.Object3D) {
  let fixed = 0;
  root.traverse((o: any) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry as THREE.BufferGeometry;
    if (!g.boundingBox) {
      g.computeBoundingBox();
      fixed++;
    }
    if (!g.boundingSphere) {
      g.computeBoundingSphere();
      fixed++;
    }
  });
  console.log(`✅ Fixed ${fixed} bounding volumes`);
}

export function disableFrustumCulling(root: THREE.Object3D, meshNamePattern?: RegExp) {
  let disabled = 0;
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    if (meshNamePattern && !meshNamePattern.test(o.name || '')) return;
    o.frustumCulled = false;
    disabled++;
  });
  console.log(`✅ Disabled frustum culling on ${disabled} meshes`);
}
