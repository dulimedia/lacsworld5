/** Spec reference:
 * See ./docs/AGENT_SPEC.md (§10 Acceptance) and ./docs/INTERACTION_CONTRACT.md (§3-4).
 * Do not change ids/schema without updating docs.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGLBState, type GLBNodeInfo } from '../store/glbState';
import { useExploreState } from '../store/exploreState';
// FresnelMaterial removed - ghost effect is now handled by SelectedUnitOverlay

interface GLBUnitProps {
  node: GLBNodeInfo;
}

const GLBUnit: React.FC<GLBUnitProps> = ({ node }) => {
  const { scene, error } = useGLTF(node.path);
  const groupRef = useRef<THREE.Group>(null);
  
  // Handle GLB loading errors gracefully
  if (error) {
    console.warn(`⚠️ Failed to load GLB: ${node.key} at ${node.path}`, error);
    return null;
  }

  // Immediately apply invisible material to prevent any rendering
  useEffect(() => {
    if (scene) {
      // Use a completely invisible material that doesn't render anything
      const invisibleMaterial = new THREE.MeshBasicMaterial({
        visible: false,
        transparent: true,
        opacity: 0.0,
        colorWrite: false,
        depthWrite: false,
        depthTest: false
      });

      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = invisibleMaterial;
          child.visible = false;
          child.renderOrder = -999; // Render behind everything
        }
      });
    }
  }, [scene]);
  // Material references removed - units are always hidden, ghost effect handled by overlay
  const { selectUnit } = useGLBState();
  const { setSelected } = useExploreState();
  
  // Update the GLB state store with the loaded object and hide immediately
  useEffect(() => {
    if (groupRef.current && !node.isLoaded) {
      // Hide the unit immediately on load to prevent any flash of solid material
      groupRef.current.visible = false;
      
      const { updateGLBObject } = useGLBState.getState();
      updateGLBObject(node.key, groupRef.current);
    }
  }, [node.key, node.isLoaded]);

  // Fresnel material removed - ghost effect is handled by SelectedUnitOverlay component

  // Original materials storage removed - units are always hidden

  // Suite clicking disabled - selection only through Explore Suites panel
  // const handleClick = (event: any) => {
  //   event.stopPropagation();
  //   console.log(`🖱️ GLB Unit clicked: ${node.building}/${node.floor}/${node.unitName}`);
  //   
  //   // Clear any existing selections first, then select this unit
  //   selectUnit(node.building, node.floor, node.unitName);
  //   
  //   // Also notify the explore state for any UI updates
  //   setSelected(`${node.building}_${node.floor}_${node.unitName}`);
  // };

  // State machine for unit visibility - units are ALWAYS hidden
  // The SelectedUnitOverlay component handles all visual representation
  useEffect(() => {
    if (!groupRef.current) return;

    // CRITICAL: Original meshes must ALWAYS be invisible
    // Only the SelectedUnitOverlay shows the ghost/highlight state
    groupRef.current.visible = false;
    
    // Ensure all child meshes are also hidden
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.visible = false;
      }
    });
  }, [node.state]);

  // Material restoration removed - units always use original materials (hidden)

  // Animation removed - ghost effect animation handled by SelectedUnitOverlay

  // Clone the scene to avoid sharing materials between instances
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();
    // Immediately hide the cloned scene to prevent any flash
    cloned.visible = false;
    
    // Apply invisible material to prevent any rendering
    const invisibleMaterial = new THREE.MeshBasicMaterial({
      visible: false,
      transparent: true,
      opacity: 0.0,
      colorWrite: false,
      depthWrite: false,
      depthTest: false
    });
    
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.visible = false;
        // Apply invisible material to prevent any rendering
        child.material = invisibleMaterial;
      }
    });
    return cloned;
  }, [scene]);

  return (
    <group ref={groupRef} visible={false}>
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
      initializeGLBNodes();
    }
  }, [glbNodes.size, initializeGLBNodes]);

  return null;
};

export const GLBManager: React.FC = () => {
  const { glbNodes } = useGLBState();
  
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