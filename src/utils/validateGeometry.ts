import * as THREE from 'three';

export function validateGeometry(root: THREE.Object3D) {
  let bad = 0;
  const badMeshes: string[] = [];
  
  root.traverse((o: any) => {
    if (!o.isMesh || !o.geometry) return;
    const pos = o.geometry.attributes.position;
    if (!pos) return;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i++) {
      if (!Number.isFinite(arr[i])) {
        bad++;
        badMeshes.push(o.name || 'unnamed');
        break;
      }
    }
  });
  
  if (bad) {
    console.error(`❌ Found ${bad} meshes with NaN/Infinity positions:`, badMeshes);
  } else {
    console.log(`✅ All geometry validated (no NaN positions)`);
  }
  return bad === 0;
}
