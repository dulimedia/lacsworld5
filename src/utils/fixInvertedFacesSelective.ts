import * as THREE from 'three';

export type FaceFixStats = {
  meshesScanned: number;
  facesTotal: number;
  facesInverted: number;
  facesFlipped: number;
};

const _tmpV = new THREE.Vector3();
const _tmpN = new THREE.Vector3();
const _edge1 = new THREE.Vector3();
const _edge2 = new THREE.Vector3();
const _faceN = new THREE.Vector3();

const _v = (pos: THREE.BufferAttribute, i: number) =>
  _tmpV.set(pos.getX(i), pos.getY(i), pos.getZ(i));
const _n = (norm: THREE.BufferAttribute, i: number) =>
  _tmpN.set(norm.getX(i), norm.getY(i), norm.getZ(i));

export function fixInvertedFacesSelective(root: THREE.Object3D, opts?: {
  maxInvertPercentToFix?: number;
  logEachMesh?: boolean;
}): FaceFixStats {
  const { maxInvertPercentToFix = 60, logEachMesh = true } = opts || {};
  const stats: FaceFixStats = { meshesScanned: 0, facesTotal: 0, facesInverted: 0, facesFlipped: 0 };

  root.traverse((o: any) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry as THREE.BufferGeometry;
    
    if (!g.index || !g.attributes.position || !g.attributes.normal) return;

    const index = g.index;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const norm = g.attributes.normal as THREE.BufferAttribute;

    let invertedCount = 0;
    const faces = index.count / 3;

    for (let f = 0; f < index.count; f += 3) {
      const i0 = index.getX(f), i1 = index.getX(f + 1), i2 = index.getX(f + 2);

      const v0 = _v(pos, i0);
      const v1 = _v(pos, i1);
      const v2 = _v(pos, i2);
      _edge1.subVectors(v1, v0);
      _edge2.subVectors(v2, v0);
      const faceN = _faceN.crossVectors(_edge1, _edge2).normalize();

      const n0 = _n(norm, i0);
      if (faceN.dot(n0) < 0) invertedCount++;
    }

    const invPct = (invertedCount / faces) * 100;
    stats.meshesScanned++;
    stats.facesTotal += faces;
    stats.facesInverted += invertedCount;

    if (logEachMesh) {
      console.log(`🔍 ${o.name || 'unnamed'}: ${invertedCount}/${faces} faces inverted (${invPct.toFixed(2)}%)`);
    }

    if (invPct > maxInvertPercentToFix) {
      if (logEachMesh) console.warn(`  ↪️ Skip selective: majority inverted (${invPct.toFixed(1)}%). Handle via global flip/mirror logic.`);
      return;
    }

    if (invertedCount === 0) return;

    const arr = index.array as Uint16Array | Uint32Array;
    let flipped = 0;
    for (let f = 0; f < arr.length; f += 3) {
      const i0 = arr[f], i1 = arr[f + 1], i2 = arr[f + 2];

      const v0 = _v(pos, i0);
      const v1 = _v(pos, i1);
      const v2 = _v(pos, i2);
      _edge1.subVectors(v1, v0);
      _edge2.subVectors(v2, v0);
      const faceN = _faceN.crossVectors(_edge1, _edge2).normalize();

      const n0 = _n(norm, i0);
      if (faceN.dot(n0) < 0) {
        arr[f + 1] = i2;
        arr[f + 2] = i1;
        flipped++;
      }
    }

    if (flipped) {
      index.needsUpdate = true;
      g.computeVertexNormals();
      g.normalizeNormals();
      g.computeBoundingSphere();
      g.computeBoundingBox();
      stats.facesFlipped += flipped;

      if (logEachMesh) console.log(`  🔧 Phase A: Flipped ${flipped} faces on ${o.name || 'unnamed'} (keeping DoubleSide)`);
      
      let remainingInv = 0;
      for (let f = 0; f < index.count; f += 3) {
        const i0 = index.getX(f), i1 = index.getX(f + 1), i2 = index.getX(f + 2);
        const v0 = _v(pos, i0);
        const v1 = _v(pos, i1);
        const v2 = _v(pos, i2);
        _edge1.subVectors(v1, v0);
        _edge2.subVectors(v2, v0);
        const faceN = _faceN.crossVectors(_edge1, _edge2).normalize();
        const n0 = _n(norm, i0);
        if (faceN.dot(n0) < 0) remainingInv++;
      }

      const remainPct = (remainingInv / faces) * 100;
      if (logEachMesh) console.log(`  📊 Phase B: Re-measured → ${remainingInv}/${faces} inverted (${remainPct.toFixed(3)}%)`);

      if (remainPct < 0.05) {
        o.castShadow = true;
        o.receiveShadow = true;

        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m) continue;
          m.side = THREE.FrontSide;
          m.shadowSide = THREE.FrontSide;
          m.needsUpdate = true;
        }
        if (logEachMesh) console.log(`  ✅ Phase B: Committed to FrontSide + castShadow=true (clean geometry!)`);
      } else {
        o.castShadow = true;
        o.receiveShadow = true;
        
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m) continue;
          m.side = THREE.DoubleSide;
          m.shadowSide = THREE.FrontSide;
          m.needsUpdate = true;
        }
        if (logEachMesh) console.warn(`  ⚠️ Phase B: Keeping DoubleSide (${remainPct.toFixed(3)}% still inverted)`);
      }
    }
  });

  console.log(`🧹 SelectiveFix summary: meshes=${stats.meshesScanned}, faces=${stats.facesTotal}, inverted=${stats.facesInverted}, flipped=${stats.facesFlipped}`);
  return stats;
}
