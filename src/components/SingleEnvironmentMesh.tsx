import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';

export function SingleEnvironmentMesh() {
  // Load 4 environment files - NO DRACO (all decompressed)
  const others = useGLTF('/models/environment/others2.glb', false);
  const frame = useGLTF('/models/environment/frame-raw-14.glb', false);
  const roof = useGLTF('/models/environment/roof and walls.glb', false);
  const stages = useGLTF('/models/environment/stages.glb', false);

  // Configure others2.glb
  useEffect(() => {
    if (others.scene) {
      console.log('🏗️ Others2 Model Loaded');
      console.log('  - Total children:', others.scene.children.length);
      
      others.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          console.log(`  📦 Others Mesh: "${mesh.name || 'unnamed'}"`);
        }
      });
      
      console.log('✅ Others2 loaded');
    }
  }, [others.scene]);

  // Configure frame-raw-14.glb
  useEffect(() => {
    if (frame.scene) {
      console.log('🏗️ Frame-raw-14 Model Loaded');
      console.log('  - Total children:', frame.scene.children.length);
      
      frame.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          console.log(`  📦 Frame Mesh: "${mesh.name || 'unnamed'}"`);
        }
      });
      
      console.log('✅ Frame-raw-14 loaded');
    }
  }, [frame.scene]);

  // Configure roof and walls.glb
  useEffect(() => {
    if (roof.scene) {
      console.log('🏗️ Roof and Walls Model Loaded');
      console.log('  - Total children:', roof.scene.children.length);
      
      roof.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          console.log(`  📦 Roof Mesh: "${mesh.name || 'unnamed'}"`);
        }
      });
      
      console.log('✅ Roof and Walls loaded');
    }
  }, [roof.scene]);

  // Configure stages.glb
  useEffect(() => {
    if (stages.scene) {
      console.log('🏗️ Stages Model Loaded');
      console.log('  - Total children:', stages.scene.children.length);
      
      stages.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          console.log(`  📦 Stage Mesh: "${mesh.name || 'unnamed'}"`);
        }
      });
      
      console.log('✅ Stages loaded');
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

// Preload all 4 files - NO DRACO (all decompressed)
useGLTF.preload('/models/environment/others2.glb', false);
useGLTF.preload('/models/environment/frame-raw-14.glb', false);
useGLTF.preload('/models/environment/roof and walls.glb', false);
useGLTF.preload('/models/environment/stages.glb', false);
