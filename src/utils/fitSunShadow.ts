import * as THREE from 'three';

export function fitSunShadow(
  light: THREE.DirectionalLight,
  objects: THREE.Object3D[],
  padding: number = 8
): void {
  if (!light.shadow || !light.shadow.camera) return;

  const box = new THREE.Box3();
  
  for (const obj of objects) {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geom = child.geometry;
        if (!geom.boundingBox) {
          geom.computeBoundingBox();
        }
        if (geom.boundingBox) {
          const clonedBox = geom.boundingBox.clone();
          clonedBox.applyMatrix4(child.matrixWorld);
          box.union(clonedBox);
        }
      }
    });
  }

  if (box.isEmpty()) {
    console.warn('fitSunShadow: No geometry found, using default frustum');
    return;
  }

  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const lightDir = light.position.clone().normalize();
  const lightDist = Math.max(size.x, size.y, size.z) * 1.5;
  
  const lightPosition = center.clone().add(lightDir.multiplyScalar(lightDist));
  light.position.copy(lightPosition);
  light.target.position.copy(center);
  light.target.updateMatrixWorld();

  const cam = light.shadow.camera as THREE.OrthographicCamera;
  
  const halfWidth = Math.max(size.x, size.z) / 2 + padding;
  const halfHeight = Math.max(size.y, size.z) / 2 + padding;
  
  cam.left = -halfWidth;
  cam.right = halfWidth;
  cam.top = halfHeight;
  cam.bottom = -halfHeight;
  cam.near = 0.5;
  cam.far = lightDist * 2 + size.length();
  
  cam.updateProjectionMatrix();
  
  console.log(`🔆 Shadow frustum fitted: [${cam.left.toFixed(1)}, ${cam.right.toFixed(1)}] × [${cam.bottom.toFixed(1)}, ${cam.top.toFixed(1)}], near=${cam.near}, far=${cam.far.toFixed(1)}`);
}
