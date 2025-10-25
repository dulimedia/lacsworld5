import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';
import { makeFacesBehave } from '../utils/makeFacesBehave';
import { fixInvertedFacesSelective } from '../utils/fixInvertedFacesSelective';
import { generateSceneReport, printReport } from '../debug/MeshInspector';
import { useThree } from '@react-three/fiber';

interface SingleEnvironmentMeshProps {
  tier: string;
}

export function SingleEnvironmentMesh({ tier }: SingleEnvironmentMeshProps) {
  const { gl } = useThree();
  const isMobile = tier.startsWith('mobile');
  const isMobileLow = tier === 'mobile-low';
  
  const others = useGLTF('/models/environment/others2.glb', !isMobileLow);
  const frame = useGLTF('/models/environment/frame-raw-14.glb', !isMobileLow);
  const roof = useGLTF('/models/environment/roof and walls.glb', !isMobileLow);
  const stages = useGLTF('/models/environment/stages.glb', !isMobileLow);
  
  const shadowsEnabled = gl && (gl as any).shadowMap?.enabled !== false;

  useEffect(() => {
    if (isMobileLow) {
      console.log('🔵 Mobile-low tier: Skipping environment models to save memory');
      return;
    }
    
    if (others.scene) {
      console.log('🔵 Processing Others2 model...');
      makeFacesBehave(others.scene, true);
      
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
          
          if (shadowsEnabled) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            shadowCount++;
          }
          
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((mat: any) => {
              if (shadowsEnabled) {
                mat.shadowSide = THREE.FrontSide;
              }
              
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
  }, [others.scene, isMobileLow]);

  useEffect(() => {
    if (isMobileLow) return;
    
    if (frame.scene) {
      console.log('🔵 Processing Frame model...');
      makeFacesBehave(frame.scene);
      console.log('🔧 Running selective face fixer on Frame...');
      fixInvertedFacesSelective(frame.scene);
      console.log('✅ Frame configured with safe selective face fixing');
    }
  }, [frame.scene, isMobileLow]);

  useEffect(() => {
    if (isMobileLow) return;
    
    if (roof.scene) {
      console.log('🔵 Processing Roof model...');
      makeFacesBehave(roof.scene);
      
      let meshCount = 0;
      roof.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          meshCount++;
          
          if (shadowsEnabled) {
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
        }
      });
      console.log(`✅ Roof configured: ${meshCount} meshes`);
    }
  }, [roof.scene, isMobileLow]);

  useEffect(() => {
    if (isMobileLow) return;
    
    if (stages.scene) {
      console.log('🔵 Processing Stages model...');
      makeFacesBehave(stages.scene);
      
      let meshCount = 0;
      stages.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          meshCount++;
          
          if (shadowsEnabled) {
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
        }
      });
      console.log(`✅ Stages configured: ${meshCount} meshes`);
    }
  }, [stages.scene, isMobileLow]);

  if (isMobileLow) {
    return (
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshBasicMaterial color="#87CEEB" />
      </mesh>
    );
  }

  return (
    <>
      <primitive object={others.scene} />
      <primitive object={frame.scene} />
      <primitive object={roof.scene} />
      <primitive object={stages.scene} />
    </>
  );
}
