import * as THREE from 'three';

export interface ShadowDepthMaterialOptions {
  polygonOffsetFactor?: number;
  polygonOffsetUnits?: number;
  normalNudge?: number;
}

export function createShadowDepthMaterial(options: ShadowDepthMaterialOptions = {}): THREE.MeshDepthMaterial {
  const {
    polygonOffsetFactor = 1,
    polygonOffsetUnits = 2,
    normalNudge = 0.0008,
  } = options;

  const material = new THREE.MeshDepthMaterial();
  material.depthPacking = THREE.RGBADepthPacking;
  material.polygonOffset = true;
  material.polygonOffsetFactor = polygonOffsetFactor;
  material.polygonOffsetUnits = polygonOffsetUnits;

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      #ifdef USE_SHADOWMAP
        transformed += normal * ${normalNudge.toFixed(6)};
      #endif
      `
    );
  };

  return material;
}

let sharedDepthMaterial: THREE.MeshDepthMaterial | null = null;

export function getSharedShadowDepthMaterial(options?: ShadowDepthMaterialOptions): THREE.MeshDepthMaterial {
  if (!sharedDepthMaterial || options) {
    sharedDepthMaterial = createShadowDepthMaterial(options);
  }
  return sharedDepthMaterial;
}

export function updateSharedDepthMaterial(options: ShadowDepthMaterialOptions): void {
  sharedDepthMaterial = createShadowDepthMaterial(options);
}
