import { useEffect, useRef, useCallback } from 'react';
import { useGLBState } from '../store/glbState';
import * as THREE from 'three';
import { createGlowMaterial } from '../materials/glowMaterial';

export const UnitGlowHighlightFixed = () => {
  const { selectedUnit, selectedBuilding, selectedFloor, hoveredUnit, getGLBByUnit, glbNodes } = useGLBState();
  const glowGroupRef = useRef<THREE.Group>(null);
  const currentGlowMeshesRef = useRef<THREE.Mesh[]>([]);
  const glowMaterialRef = useRef<THREE.Material | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // Create the blue glow material once with proper depth settings
  useEffect(() => {
    if (!glowMaterialRef.current) {
      glowMaterialRef.current = createGlowMaterial(0x3b82f6); // Blue glow
      console.log('✨ Created selective glow material with depthTest:false');
    }
  }, []);

  // Helper function to safely create glow mesh from a single unit
  const createGlowMeshFromUnit = (unitGLB: any): THREE.Mesh[] => {
    const glowMeshes: THREE.Mesh[] = [];
    
    if (!unitGLB?.object || !glowMaterialRef.current) {
      console.warn('❌ Cannot create glow: missing unit object or material');
      return glowMeshes;
    }

    let meshCount = 0;
    unitGLB.object.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        try {
          // Safety check: skip if geometry is too large (likely environment mesh)
          const vertexCount = child.geometry.attributes.position?.count || 0;
          if (vertexCount > 10000) {
            console.warn(`⚠️ Skipping large mesh with ${vertexCount} vertices (likely environment)`);
            return;
          }

          // Clone the geometry and material to prevent sharing corruption
          const clonedGeometry = child.geometry.clone();
          const clonedMaterial = glowMaterialRef.current!.clone();
          const glowMesh = new THREE.Mesh(clonedGeometry, clonedMaterial);
          
          // Copy transform from original mesh
          glowMesh.position.copy(child.position);
          glowMesh.rotation.copy(child.rotation);
          glowMesh.scale.copy(child.scale);
          
          // Key settings for glow-through effect
          glowMesh.renderOrder = 999; // Render on top of everything
          glowMesh.visible = true; // Visible when created
          
          // Store metadata
          glowMesh.userData.unitKey = unitGLB.key;
          glowMesh.userData.originalMesh = child.uuid;
          glowMesh.userData.isGlowMesh = true;
          
          glowMeshes.push(glowMesh);
          meshCount++;
        } catch (error) {
          console.error('❌ Failed to clone geometry for glow:', error);
        }
      }
    });

    console.log(`✅ Created ${meshCount} glow meshes for unit ${unitGLB.key}`);
    return glowMeshes;
  };

  // ENHANCED: Clear ALL glow meshes including orphaned ones
  const clearGlowMeshes = () => {
    console.log('🧹 ENHANCED GLOW CLEANUP START:', {
      currentMeshCount: currentGlowMeshesRef.current.length,
      processing: isProcessingRef.current,
      hasGroup: !!glowGroupRef.current,
      timestamp: Date.now()
    });
    
    if (glowGroupRef.current && !isProcessingRef.current) {
      isProcessingRef.current = true;
      console.log('🔒 GLOW CLEANUP LOCKED - starting enhanced disposal...');
      
      try {
        // CRITICAL FIX: Clear ALL children from glow group, not just tracked ones
        const allGlowChildren = [...glowGroupRef.current.children];
        console.log(`🗑️ Found ${allGlowChildren.length} total glow meshes in group`);
        
        allGlowChildren.forEach((child, index) => {
          try {
            if (child instanceof THREE.Mesh) {
              console.log(`🗑️ Disposing glow mesh ${index + 1}/${allGlowChildren.length}`);
              glowGroupRef.current?.remove(child);
              
              // Dispose geometry
              if (child.geometry) {
                child.geometry.dispose();
              }
              
              // Dispose material
              if (child.material && Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else if (child.material) {
                child.material.dispose();
              }
            }
          } catch (meshError) {
            console.error(`❌ ERROR disposing mesh ${index + 1}:`, meshError);
          }
        });
        
        // Clear the reference array
        currentGlowMeshesRef.current = [];
        console.log('✅ ENHANCED GLOW CLEANUP COMPLETE - ALL meshes disposed');
      } catch (error) {
        console.error('❌ CRITICAL ERROR during enhanced glow cleanup:', error);
      } finally {
        isProcessingRef.current = false;
        console.log('🔓 GLOW CLEANUP UNLOCKED');
      }
    } else {
      console.log('⚠️ GLOW CLEANUP SKIPPED:', {
        reason: !glowGroupRef.current ? 'no group' : 'already processing'
      });
    }
  };

  // Separate function for the actual glow update logic - MOVED BEFORE useEffect
  const performGlowUpdate = useCallback(() => {
    if (!glowGroupRef.current || !glowMaterialRef.current || isProcessingRef.current) {
      console.log('[SELECTIVE GLOW] ⚠️ Cannot perform glow update - missing refs or processing');
      return;
    }

    // Create glow for selected unit only
    if (selectedUnit && selectedBuilding && selectedFloor !== null && selectedFloor !== undefined) {
      const unitGLB = getGLBByUnit(selectedBuilding, selectedFloor, selectedUnit);
      console.log('[SELECTIVE GLOW MATCH]', unitGLB ? 'Found GLB for' : 'No GLB found for', selectedUnit);
      
      if (unitGLB) {
        try {
          const glowMeshes = createGlowMeshFromUnit(unitGLB);
          
          glowMeshes.forEach(mesh => {
            glowGroupRef.current?.add(mesh);
          });
          
          currentGlowMeshesRef.current = glowMeshes;
          
          if (glowMeshes.length > 0) {
            console.log(`🔵 Applied selective blue glow to ${selectedUnit} (${glowMeshes.length} meshes)`);
          }
        } catch (error) {
          console.error(`❌ Error creating selective glow for ${selectedUnit}:`, error);
        }
      }
    }
    
    // Also handle hover when no selection (optional)
    else if (hoveredUnit && !selectedUnit) {
      const hoveredUnitGLB = glbNodes.get(hoveredUnit);
      if (hoveredUnitGLB) {
        try {
          const glowMeshes = createGlowMeshFromUnit(hoveredUnitGLB);
          
          glowMeshes.forEach(mesh => {
            glowGroupRef.current?.add(mesh);
          });
          
          currentGlowMeshesRef.current = glowMeshes;
          
          if (glowMeshes.length > 0) {
            console.log(`🔵 Applied selective blue glow to hovered ${hoveredUnit}`);
          }
        } catch (error) {
          console.error(`❌ Error creating selective glow for hovered ${hoveredUnit}:`, error);
        }
      }
    }
  }, [selectedUnit, selectedBuilding, selectedFloor, hoveredUnit, getGLBByUnit, glbNodes]);

  // Update glow for selected unit ONLY - MOVED AFTER function definition
  useEffect(() => {
    if (!glowGroupRef.current || !glowMaterialRef.current || isProcessingRef.current) return;
    
    console.log('[SELECTIVE GLOW] selectedUnit =', selectedUnit, 'selectedBuilding =', selectedBuilding, 'selectedFloor =', selectedFloor);
    
    // RACE CONDITION PROTECTION: Prevent overlapping glow operations
    if (isProcessingRef.current) {
      console.log('[SELECTIVE GLOW] ⚡ Skipping glow update - processing in progress');
      return;
    }
    
    // CRITICAL FIX: Defer glow mesh cleanup to next frame to prevent race conditions
    console.log('[SELECTIVE GLOW] 🕐 Deferring glow cleanup to next frame...');
    requestAnimationFrame(() => {
      console.log('[SELECTIVE GLOW] 🕐 Executing deferred glow cleanup');
      clearGlowMeshes();
      
      // Also defer the glow creation to ensure cleanup is complete
      requestAnimationFrame(() => {
        console.log('[SELECTIVE GLOW] 🕐 Executing deferred glow creation');
        performGlowUpdate();
      });
    });
  }, [selectedUnit, selectedBuilding, selectedFloor, hoveredUnit, performGlowUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearGlowMeshes();
      if (glowMaterialRef.current) {
        glowMaterialRef.current.dispose();
      }
    };
  }, []);

  return (
    <group ref={glowGroupRef}>
      {/* Selective glow meshes are added dynamically only for selected unit */}
    </group>
  );
};