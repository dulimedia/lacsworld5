import * as THREE from 'three';

export function fixMirrors(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  let flippedCount = 0;
  
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    
    if (o.matrixWorld.determinant() < 0) {
      console.warn(`🔄 Mirrored mesh detected: ${o.name || 'unnamed'} - fixing by flipping geometry`);
      
      const g = o.geometry as THREE.BufferGeometry;
      if (g) {
        g.scale(-1, 1, 1);
        g.computeVertexNormals();
        flippedCount++;
      }
    }
    
    const g = o.geometry as THREE.BufferGeometry;
    if (g && !g.attributes.normal) {
      console.warn(`⚠️ Missing normals on: ${o.name || 'unnamed'}, computing...`);
      g.computeVertexNormals();
    }
    
    if (g && g.attributes.normal) {
      const normals = g.attributes.normal;
      let zeroNormals = 0;
      let averageNormalLength = 0;
      
      for (let i = 0; i < normals.count; i++) {
        const x = normals.getX(i);
        const y = normals.getY(i);
        const z = normals.getZ(i);
        const length = Math.sqrt(x * x + y * y + z * z);
        averageNormalLength += length;
        if (length < 0.01) zeroNormals++;
      }
      
      averageNormalLength /= normals.count;
      
      if (zeroNormals > 0) {
        console.warn(`⚠️ ${o.name || 'unnamed'} has ${zeroNormals} zero/tiny normals - recomputing`);
        g.computeVertexNormals();
      }
      
      if (Math.abs(averageNormalLength - 1.0) > 0.1) {
        console.warn(`⚠️ ${o.name || 'unnamed'} has non-normalized normals (avg length: ${averageNormalLength.toFixed(3)}) - fixing`);
        g.normalizeNormals();
      }
    }
  });
  
  if (flippedCount > 0) {
    console.log(`✅ Fixed ${flippedCount} mirrored geometries by flipping`);
  }
}

export function fixMirrorsPermanent(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    
    if (o.matrixWorld.determinant() < 0) {
      console.warn(`🔄 Permanently fixing mirrored geometry: ${o.name || 'unnamed'}`);
      const g = o.geometry as THREE.BufferGeometry;
      if (g) {
        g.scale(-1, 1, 1);
        g.computeVertexNormals();
      }
      
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m: any) => {
        if (m) {
          m.side = THREE.FrontSide;
          m.needsUpdate = true;
        }
      });
    }
  });
}
