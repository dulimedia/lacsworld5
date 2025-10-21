/** Spec reference:
 * See ./docs/AGENT_SPEC.md (§10 Acceptance) and ./docs/INTERACTION_CONTRACT.md (§3-4).
 * Do not change ids/schema without updating docs.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGLBState, type GLBNodeInfo } from '../store/glbState';
import { useExploreState } from '../store/exploreState';
import { SELECTED_MATERIAL_CONFIG, HOVERED_MATERIAL_CONFIG } from '../config/ghostMaterialConfig';

interface GLBUnitProps {
  node: GLBNodeInfo;
}

const GLBUnit: React.FC<GLBUnitProps> = ({ node }) => {
  const { scene, error } = useGLTF(node.path);
  const groupRef = useRef<THREE.Group>(null);
  const originalMaterialsRef = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map());
  
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
  // hoveredUnit stores the full key like "Maryland Building/First Floor/M-140"
  const isHovered = hoveredUnit === node.key && !selectedUnit;
  
  // selectedUnit stores the unit name like "M-140", need to match all three parts
  const isSelected = selectedUnit === node.unitName && 
                    selectedBuilding === node.building && 
                    selectedFloor === node.floor;

  // Apply material state based on selection/hover
  useEffect(() => {
    if (!groupRef.current) return;

    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const originalMaterial = originalMaterialsRef.current.get(child.uuid);
        
        if (isSelected) {
          // Apply bright blue highlight material
          const blueMaterial = new THREE.MeshStandardMaterial({
            color: SELECTED_MATERIAL_CONFIG.color,
            emissive: SELECTED_MATERIAL_CONFIG.emissive,
            emissiveIntensity: SELECTED_MATERIAL_CONFIG.emissiveIntensity,
            metalness: SELECTED_MATERIAL_CONFIG.metalness,
            roughness: SELECTED_MATERIAL_CONFIG.roughness,
            transparent: SELECTED_MATERIAL_CONFIG.transparent,
            opacity: SELECTED_MATERIAL_CONFIG.opacity,
          });
          child.material = blueMaterial;
          child.visible = true;
        } else if (isHovered) {
          // Apply subtle emissive glow to original material
          if (originalMaterial) {
            const hoveredMaterial = (originalMaterial as THREE.MeshStandardMaterial).clone();
            hoveredMaterial.emissive = new THREE.Color(HOVERED_MATERIAL_CONFIG.emissive);
            hoveredMaterial.emissiveIntensity = HOVERED_MATERIAL_CONFIG.emissiveIntensity;
            child.material = hoveredMaterial;
            child.visible = true;
          }
        } else {
          // Restore original material
          if (originalMaterial) {
            child.material = originalMaterial;
          }
          child.visible = true;
        }
      }
    });
  }, [isSelected, isHovered]);

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
