import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';
import { makeFacesBehave } from '../utils/makeFacesBehave';
import { fixInvertedFacesSelective } from '../utils/fixInvertedFacesSelective';
import { generateSceneReport, printReport } from '../debug/MeshInspector';

interface SingleEnvironmentMeshProps {
  isMobile?: boolean;
}

export function SingleEnvironmentMesh({ isMobile = false }: SingleEnvironmentMeshProps = {}) {
  const others = useGLTF('/models/environment/others2.glb');
  const frame = useGLTF('/models/environment/frame-raw-14.glb');
  const roof = useGLTF('/models/environment/roof and walls.glb');
  const stages = useGLTF('/models/environment/stages.glb');

  useEffect(() => {
    if (others.scene) {
      console.log('🔵 Processing Others2 model...');
      makeFacesBehave(others.scene, true, isMobile);
      
      let meshCount = 0;
      let shadowCount = 0;
      
      others.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          meshCount++;
          
          if (mesh.geometry && mesh.geometry.attributes.position) {
            const vertCount = mesh.geometry.attributes.position.count;
            console.log(`  Mesh: ${mesh.name || 'unnamed'} (${vertCount} vertices)`);
          }
          
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          shadowCount++;
          
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((mat: any) => {
              mat.shadowSide = THREE.FrontSide;
              
              if (mat.normalMap) {
                console.log(`  📄 Removed normalMap from ${mesh.name || 'unnamed'}`);
                delete mat.normalMap;
              }
              if (mat.roughnessMap) delete mat.roughnessMap;
              if (mat.metalnessMap) delete mat.metalnessMap;
              if (mat.map) mat.map.needsUpdate = true;
              mat.needsUpdate = true;
            });
          }
        }
      });
      console.log(`✅ Others2 configured: ${meshCount} meshes, ${shadowCount} shadow-enabled`);
    }
  }, [others.scene]);

  useEffect(() => {
    if (frame.scene) {
      console.log('🔵 Processing Frame model...');
      makeFacesBehave(frame.scene, false, isMobile);
      console.log('🔧 Running selective face fixer on Frame...');
      fixInvertedFacesSelective(frame.scene);
      console.log('✅ Frame configured with safe selective face fixing');
    }
  }, [frame.scene]);

  useEffect(() => {
    if (roof.scene) {
      console.log('🔵 Processing Roof model...');
      makeFacesBehave(roof.scene, false, isMobile);
      
      let meshCount = 0;
      roof.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          meshCount++;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(mat => {
                mat.shadowSide = THREE.FrontSide;
              });
            } else {
              mesh.material.shadowSide = THREE.FrontSide;
            }
          }
        }
      });
      console.log(`✅ Roof configured: ${meshCount} meshes`);
    }
  }, [roof.scene]);

  useEffect(() => {
    if (stages.scene) {
      console.log('🔵 Processing Stages model...');
      makeFacesBehave(stages.scene, false, isMobile);
      
      let meshCount = 0;
      stages.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          meshCount++;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(mat => {
                mat.shadowSide = THREE.FrontSide;
              });
            } else {
              mesh.material.shadowSide = THREE.FrontSide;
            }
          }
        }
      });
      console.log(`✅ Stages configured: ${meshCount} meshes`);
    }
  }, [stages.scene]);

  return (
    <>
      <primitive object={others.scene} />
      <primitive object={frame.scene} />
      <primitive object={roof.scene} />
      <primitive object={stages.scene} />
    </>
  );
}

useGLTF.preload('/models/environment/others2.glb');
useGLTF.preload('/models/environment/frame-raw-14.glb');
useGLTF.preload('/models/environment/roof and walls.glb');
useGLTF.preload('/models/environment/stages.glb');
