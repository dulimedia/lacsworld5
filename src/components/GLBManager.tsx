/** Spec reference:
 * See ./docs/AGENT_SPEC.md (§10 Acceptance) and ./docs/INTERACTION_CONTRACT.md (§3-4).
 * Do not change ids/schema without updating docs.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLBState, type GLBNodeInfo } from '../store/glbState';
import { useExploreState } from '../store/exploreState';
import { SELECTED_MATERIAL_CONFIG, HOVERED_MATERIAL_CONFIG } from '../config/ghostMaterialConfig';

interface GLBUnitProps {
  node: GLBNodeInfo;
}

const FADE_DURATION = 0.8;

const GLBUnit: React.FC<GLBUnitProps> = ({ node }) => {
  const { scene, error } = useGLTF(node.path);
  const groupRef = useRef<THREE.Group>(null);
  const originalMaterialsRef = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map());
  const fadeProgressRef = useRef(0);
  const targetStateRef = useRef<'none' | 'selected' | 'hovered'>('none');
  
  const { selectedUnit, selectedBuilding, selectedFloor, hoveredUnit } = useGLBState();
  const { selectedUnitKey, hoveredUnitKey } = useExploreState();
  
  // Handle GLB loading errors gracefully
  if (error) {
    console.warn(`⚠️ Failed to load GLB: ${node.key} at ${node.path}`, error);
    return null;
  }
  
  // Log successful load
  if (scene && !node.isLoaded) {
    console.log(`📦 GLBUnit loaded: ${node.key}`);
  }

  // Store original materials on first load
  useEffect(() => {
    if (scene && originalMaterialsRef.current.size === 0) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          originalMaterialsRef.current.set(child.uuid, child.material);
        }
      });
    }
  }, [scene]);
  
  const { selectUnit, updateGLBObject } = useGLBState();
  const { setSelected } = useExploreState();
  
  // Update the GLB state store with the loaded object
  useEffect(() => {
    if (groupRef.current && !node.isLoaded) {
      updateGLBObject(node.key, groupRef.current);
    }
  }, [node.key, node.isLoaded, updateGLBObject]);

  // Determine if this unit is selected or hovered
  const isHovered = hoveredUnit === node.key && !selectedUnit;
  const isSelected = selectedUnit === node.unitName && 
                    selectedBuilding === node.building && 
                    selectedFloor === node.floor;

  // Update target state when selection/hover changes
  useEffect(() => {
    if (isSelected) {
      targetStateRef.current = 'selected';
    } else if (isHovered) {
      targetStateRef.current = 'hovered';
    } else {
      targetStateRef.current = 'none';
    }
  }, [isSelected, isHovered]);

  // Animate fade in/out with useFrame
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const targetProgress = targetStateRef.current !== 'none' ? 1 : 0;
    const fadeSpeed = 1 / FADE_DURATION;
    
    if (fadeProgressRef.current !== targetProgress) {
      if (fadeProgressRef.current < targetProgress) {
        fadeProgressRef.current = Math.min(1, fadeProgressRef.current + delta * fadeSpeed);
      } else {
        fadeProgressRef.current = Math.max(0, fadeProgressRef.current - delta * fadeSpeed);
      }

      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const originalMaterial = originalMaterialsRef.current.get(child.uuid);
          
          if (targetStateRef.current === 'selected') {
            if (!child.material || !(child.material as any).__isAnimatedMaterial) {
              const blueMaterial = new THREE.MeshStandardMaterial({
                color: SELECTED_MATERIAL_CONFIG.color,
                emissive: SELECTED_MATERIAL_CONFIG.emissive,
                emissiveIntensity: 0,
                metalness: SELECTED_MATERIAL_CONFIG.metalness,
                roughness: SELECTED_MATERIAL_CONFIG.roughness,
                transparent: true,
                opacity: 0,
              });
              (blueMaterial as any).__isAnimatedMaterial = true;
              child.material = blueMaterial;
            }
            const mat = child.material as THREE.MeshStandardMaterial;
            mat.opacity = fadeProgressRef.current;
            mat.emissiveIntensity = SELECTED_MATERIAL_CONFIG.emissiveIntensity * fadeProgressRef.current;
            child.visible = true;
          } else if (targetStateRef.current === 'hovered') {
            if (originalMaterial && (!child.material || !(child.material as any).__isAnimatedMaterial)) {
              const hoveredMaterial = (originalMaterial as THREE.MeshStandardMaterial).clone();
              hoveredMaterial.emissive = new THREE.Color(HOVERED_MATERIAL_CONFIG.emissive);
              hoveredMaterial.emissiveIntensity = 0;
              (hoveredMaterial as any).__isAnimatedMaterial = true;
              child.material = hoveredMaterial;
            }
            const mat = child.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = HOVERED_MATERIAL_CONFIG.emissiveIntensity * fadeProgressRef.current;
            child.visible = true;
          } else if (fadeProgressRef.current === 0 && originalMaterial) {
            child.material = originalMaterial;
            delete (child.material as any).__isAnimatedMaterial;
            child.visible = true;
          }
        }
      });
    }
  });

  // Clone the scene for instancing
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();
    return cloned;
  }, [scene]);

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
};

// Initialize GLB state on mount
const GLBInitializer: React.FC = () => {
  const { glbNodes, initializeGLBNodes } = useGLBState();
  
  useEffect(() => {
    // Initialize GLB nodes if not already done
    if (glbNodes.size === 0) {
      console.log('🔧 GLBManager: Initializing GLB nodes...');
      initializeGLBNodes();
    } else {
      console.log(`✅ GLBManager: ${glbNodes.size} nodes already initialized`);
    }
  }, [glbNodes.size, initializeGLBNodes]);

  return null;
};

export const GLBManager: React.FC = () => {
  const { glbNodes } = useGLBState();
  
  console.log(`🎯 GLBManager: Rendering ${glbNodes.size} units`);
  
  return (
    <group>
      <GLBInitializer />
      {Array.from(glbNodes.values()).map(node => (
        <GLBUnit key={node.key} node={node} />
      ))}
    </group>
  );
};

// Export individual components for flexibility
export { GLBUnit, GLBInitializer };
