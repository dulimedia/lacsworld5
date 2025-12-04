import { useEffect, useRef } from 'react';
import { useGLBState } from '../store/glbState';
import { useExploreState } from '../store/exploreState';
import * as THREE from 'three';
import { createFresnelHighlightMaterial } from '../materials/FresnelHighlightMaterial';

export const UnitGlowHighlight = () => {
  const { selectedUnit, selectedBuilding, selectedFloor, hoveredUnit, getGLBByUnit, glbNodes } = useGLBState();
  const highlightMaterialRef = useRef<THREE.Material | null>(null);
  const originalMaterialsRef = useRef<Map<string, THREE.Material>>(new Map());
  
  // Create the blue glow material once
  useEffect(() => {
    if (!highlightMaterialRef.current) {
      highlightMaterialRef.current = createFresnelHighlightMaterial({
        color: '#80d4ff',
        opacity: 0.8,
        bias: 0.1,
        scale: 1.5,
        power: 3.0,
        depthTest: false, // Show through buildings
        doubleSide: true
      });
      console.log('✨ Created stable blue glow material');
    }
  }, []);
  
  // Handle unit highlighting via material swapping (no mesh creation/destruction)
  useEffect(() => {
    // Reset all units to original materials first
    originalMaterialsRef.current.forEach((originalMaterial, meshUuid) => {
      const allNodes = Array.from(glbNodes.values());
      for (const node of allNodes) {
        if (node.object) {
          node.object.traverse((child) => {
            if (child instanceof THREE.Mesh && child.uuid === meshUuid) {
              child.material = originalMaterial;
            }
          });
        }
      }
    });
    
    // Apply highlight material to selected unit
    if (selectedUnit && selectedBuilding && selectedFloor !== null && selectedFloor !== undefined) {
      const unitGLB = getGLBByUnit(selectedBuilding, selectedFloor, selectedUnit);
      if (unitGLB?.object && highlightMaterialRef.current) {
        unitGLB.object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Store original material if not already stored
            if (!originalMaterialsRef.current.has(child.uuid)) {
              originalMaterialsRef.current.set(child.uuid, child.material as THREE.Material);
            }
            // Apply glow material
            child.material = highlightMaterialRef.current!;
          }
        });
        console.log(`🔵 Applied blue glow to ${selectedUnit}`);
      }
    }
    
    // Apply highlight material to hovered unit (if no selection)
    else if (hoveredUnit && !selectedUnit) {
      const hoveredUnitGLB = glbNodes.get(hoveredUnit);
      if (hoveredUnitGLB?.object && highlightMaterialRef.current) {
        hoveredUnitGLB.object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (!originalMaterialsRef.current.has(child.uuid)) {
              originalMaterialsRef.current.set(child.uuid, child.material as THREE.Material);
            }
            child.material = highlightMaterialRef.current!;
          }
        });
        console.log(`🔵 Applied blue glow to hovered ${hoveredUnit}`);
      }
    }
  }, [selectedUnit, selectedBuilding, selectedFloor, hoveredUnit, getGLBByUnit, glbNodes]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (highlightMaterialRef.current) {
        highlightMaterialRef.current.dispose();
      }
    };
  }, []);
  
  return null; // No visual component, just material management
};