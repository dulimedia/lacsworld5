import * as THREE from 'three';

export function setFaceDebug(root: THREE.Object3D, enabled: boolean) {
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m: THREE.Material & any) => {
      if (!m) return;
      if (enabled) {
        m._prev = { 
          side: m.side, 
          wireframe: m.wireframe, 
          transparent: m.transparent, 
          depthWrite: m.depthWrite 
        };
        m.side = THREE.DoubleSide;
        m.wireframe = true;
        if (m.transparent) m.depthWrite = true;
        m.needsUpdate = true;
      } else if (m._prev) {
        m.side = m._prev.side;
        m.wireframe = m._prev.wireframe;
        m.transparent = m._prev.transparent;
        m.depthWrite = m._prev.depthWrite;
        delete m._prev;
        m.needsUpdate = true;
      }
    });
  });
}

export function backfaceDebug(mat: THREE.Material & any, enabled: boolean) {
  if (!enabled) {
    if (mat._src) {
      Object.assign(mat, mat._src);
      mat._src = null;
      mat.needsUpdate = true;
    }
    return;
  }
  if (!mat._src) mat._src = { ...mat };
  mat.onBeforeCompile = (shader: any) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <output_fragment>',
      `#include <output_fragment>
       if (!gl_FrontFacing) {
         gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.0, 0.6), 0.8);
       }`
    );
  };
  mat.needsUpdate = true;
}
