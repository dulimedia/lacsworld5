import * as THREE from 'three';

export function setVisiblePolygonOffset(
  root: THREE.Object3D, 
  match: (m: THREE.Mesh) => boolean, 
  factor = -1, 
  units = -2
) {
  root.traverse(o => {
    if ((o as any).isMesh) {
      const mesh = o as THREE.Mesh;
      if (!match(mesh)) return;
      
      const apply = (mat: any) => {
        if (!mat) return;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = factor;
        mat.polygonOffsetUnits = units;
      };
      
      Array.isArray(mesh.material) 
        ? mesh.material.forEach(apply) 
        : apply(mesh.material);
    }
  });
}

export function hardenMaterials(root: THREE.Object3D) {
  root.traverse(o => {
    if ((o as any).isMesh) {
      const mesh = o as THREE.Mesh;
      const mats = Array.isArray(mesh.material) 
        ? mesh.material 
        : [mesh.material];
      
      for (const m of mats) {
        if (!m) continue;
        m.shadowSide = THREE.FrontSide;
      }
    }
  });
}
