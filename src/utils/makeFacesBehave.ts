import * as THREE from 'three';
import { fixMirrors } from './fixMirrors';
import { sanitizeTransparency } from './sanitizeTransparency';
import { fixBounds } from './fixBounds';
import { validateGeometry } from './validateGeometry';

export function makeFacesBehave(root: THREE.Object3D, boostOpacity = false) {
  console.log('🔧 Running makeFacesBehave diagnostic suite...');
  
  console.log('Step 1: Fixing mirrored geometry and normals...');
  fixMirrors(root);
  
  console.log('Step 2: Sanitizing transparent materials...');
  sanitizeTransparency(root, boostOpacity);
  
  console.log('Step 3: Fixing bounding volumes...');
  fixBounds(root);
  
  console.log('Step 4: Validating geometry for NaN/Infinity...');
  validateGeometry(root);
  
  console.log('Step 5: Setting safe material defaults...');
  let invisibleFaces = 0;
  let cullingIssues = 0;
  let keptDoubleSide = 0;
  let switchedToFrontSide = 0;
  
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m: any) => {
      if (!m) return;
      
      if (m.opacity === 0 || m.visible === false) {
        console.warn(`⚠️ INVISIBLE: ${o.name || 'unnamed'} has opacity=${m.opacity}, visible=${m.visible}`);
        invisibleFaces++;
      }
      
      if (m.side === THREE.DoubleSide) {
        console.log(`✅ Keeping DoubleSide culling on: ${o.name || 'unnamed'} (prevents missing faces)`);
        keptDoubleSide++;
      }
      
      if (m.side === THREE.BackSide) {
        console.warn(`⚠️ BACKFACE: ${o.name || 'unnamed'} using BackSide (faces away from camera!)`);
        cullingIssues++;
      }
    });
  });
  
  if (switchedToFrontSide > 0) console.log(`🔄 Switched ${switchedToFrontSide} frame materials to FrontSide`);
  console.log(`✅ Kept ${keptDoubleSide} DoubleSide materials (safe rendering)`);
  if (invisibleFaces > 0) console.warn(`⚠️ Found ${invisibleFaces} invisible materials`);
  if (cullingIssues > 0) console.warn(`⚠️ Found ${cullingIssues} BackSide materials (may be invisible!)`);
  
  console.log('✅ makeFacesBehave complete!');
}
