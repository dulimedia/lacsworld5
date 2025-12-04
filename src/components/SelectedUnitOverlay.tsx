import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useGLBState } from '../store/glbState';
import { createFresnelHighlightMaterial } from '../materials/FresnelHighlightMaterial';
import { GHOST_MATERIAL_CONFIG } from '../config/ghostMaterialConfig';

export const SelectedUnitOverlay: React.FC = () => {
  const { 
    selectedUnit, 
    selectedBuilding, 
    selectedFloor, 
    hoveredUnit,
    hoveredFloor,
    getGLBByUnit, 
    getGLBsByBuilding,
    getGLBsByFloor,
    glbNodes 
  } = useGLBState();
  const { camera, scene } = useThree();
  const overlayGroupRef = useRef<THREE.Group>(null);
  const overlayMeshesRef = useRef<THREE.Mesh[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const lastCameraPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const needsOcclusionUpdateRef = useRef<boolean>(false);
  const targetOpacityRef = useRef<number>(0);
  const currentOpacityRef = useRef<number>(0);
  
  // Function to detect occlusion between camera and unit
  const detectOcclusion = (unitObject: THREE.Group): number => {
    if (!camera || !scene) return 1.0; // No occlusion if camera/scene not available
    
    // Get the bounding box center of the unit
    const box = new THREE.Box3().setFromObject(unitObject);
    const unitCenter = box.getCenter(new THREE.Vector3());
    
    // Calculate direction from camera to unit center
    const direction = new THREE.Vector3().subVectors(unitCenter, camera.position).normalize();
    const distance = camera.position.distanceTo(unitCenter);
    
    // Set up raycaster from camera towards unit
    raycasterRef.current.set(camera.position, direction);
    raycasterRef.current.far = distance - 0.1; // Stop just before the unit
    
    // Get all objects that could cause occlusion (other building GLBs)
    const occluders: THREE.Object3D[] = [];
    scene.traverse((child) => {
      // Only consider visible meshes that are NOT highlight overlays
      if (child instanceof THREE.Mesh && 
          child.visible && 
          !child.userData.isHighlightOverlay &&
          !unitObject.children.includes(child) && // Exclude the unit itself
          child.material && 
          child.material.opacity > 0.1) { // Only consider opaque objects
        occluders.push(child);
      }
    });
    
    // Cast ray and check for intersections
    const intersections = raycasterRef.current.intersectObjects(occluders, false);
    
    if (intersections.length > 0) {
      // Calculate occlusion factor based on distance to first intersection
      const firstIntersection = intersections[0];
      const occlusionDistance = firstIntersection.distance;
      const totalDistance = distance;
      
      // Dimming factor: closer occlusions cause more dimming
      const occlusionFactor = Math.max(0.3, 1.0 - (occlusionDistance / totalDistance) * 0.7);
      return occlusionFactor;
    }
    
    return 1.0; // No occlusion
  };

  // Create the Fresnel highlight material using configuration
  const fresnelMaterial = useMemo(() => {
    return createFresnelHighlightMaterial({
      color: GHOST_MATERIAL_CONFIG.color,
      opacity: GHOST_MATERIAL_CONFIG.opacity,
      bias: GHOST_MATERIAL_CONFIG.fresnelBias,
      scale: GHOST_MATERIAL_CONFIG.fresnelScale,
      power: GHOST_MATERIAL_CONFIG.fresnelPower,
      doubleSide: GHOST_MATERIAL_CONFIG.doubleSide
    });
  }, []);

  // Function to clone meshes from a GLB object and apply Fresnel material with occlusion
  const createOverlayMeshes = (sourceObject: THREE.Group): THREE.Mesh[] => {
    const overlayMeshes: THREE.Mesh[] = [];
    
    // Detect occlusion for this unit
    const occlusionFactor = detectOcclusion(sourceObject);
    
    // Create material with adjusted opacity based on occlusion
    const adjustedMaterial = createFresnelHighlightMaterial({
      color: GHOST_MATERIAL_CONFIG.color,
      opacity: GHOST_MATERIAL_CONFIG.opacity * occlusionFactor,
      bias: GHOST_MATERIAL_CONFIG.fresnelBias,
      scale: GHOST_MATERIAL_CONFIG.fresnelScale,
      power: GHOST_MATERIAL_CONFIG.fresnelPower,
      doubleSide: GHOST_MATERIAL_CONFIG.doubleSide
    });
    
    sourceObject.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // Clone the mesh but with our occlusion-adjusted highlight material
        const overlayMesh = new THREE.Mesh(
          child.geometry.clone(),
          adjustedMaterial
        );
        
        // Copy transform from original mesh
        overlayMesh.matrix.copy(child.matrixWorld);
        overlayMesh.matrix.decompose(
          overlayMesh.position,
          overlayMesh.quaternion,
          overlayMesh.scale
        );
        
        // Set high render order to draw on top
        overlayMesh.renderOrder = 999;
        overlayMesh.userData.isHighlightOverlay = true;
        overlayMesh.userData.occlusionFactor = occlusionFactor;
        
        overlayMeshes.push(overlayMesh);
      }
    });
    
    return overlayMeshes;
  };

  // Function to update existing overlay opacity based on occlusion
  const updateOcclusionForExistingOverlays = () => {
    if (!overlayMeshesRef.current.length) return;
    
    // Group meshes by their source unit (assuming each unit creates multiple meshes)
    const meshGroups = new Map<string, THREE.Mesh[]>();
    
    overlayMeshesRef.current.forEach(mesh => {
      // Try to find the original unit object that this mesh belongs to
      let sourceUnit: THREE.Group | null = null;
      
      // Find the source unit by checking all loaded GLB nodes
      Array.from(glbNodes.values()).forEach(unitGLB => {
        if (unitGLB.object && unitGLB.isLoaded) {
          unitGLB.object.traverse((child) => {
            if (child instanceof THREE.Mesh && 
                child.geometry && 
                mesh.geometry.uuid === child.geometry.uuid) {
              sourceUnit = unitGLB.object;
            }
          });
        }
      });
      
      if (sourceUnit) {
        const key = sourceUnit.uuid;
        if (!meshGroups.has(key)) {
          meshGroups.set(key, []);
        }
        meshGroups.get(key)!.push(mesh);
      }
    });
    
    // Update occlusion for each group
    meshGroups.forEach((meshes, unitKey) => {
      const sourceUnit = Array.from(glbNodes.values()).find(unit => 
        unit.object && unit.object.uuid === unitKey
      )?.object;
      
      if (sourceUnit) {
        const occlusionFactor = detectOcclusion(sourceUnit);
        
        meshes.forEach(mesh => {
          if (mesh.material && 'uniforms' in mesh.material && mesh.material.uniforms.uOpacity) {
            mesh.material.uniforms.uOpacity.value = GHOST_MATERIAL_CONFIG.opacity * occlusionFactor;
            mesh.userData.occlusionFactor = occlusionFactor;
          }
        });
      }
    });
  };

  // Detect camera movement and trigger occlusion updates + smooth fade
  useFrame((state, delta) => {
    if (!camera) return;
    
    const currentPosition = camera.position.clone();
    const threshold = 0.1; // Minimum movement threshold to trigger update
    
    if (lastCameraPositionRef.current.distanceTo(currentPosition) > threshold) {
      lastCameraPositionRef.current.copy(currentPosition);
      needsOcclusionUpdateRef.current = true;
    }
    
    // Update occlusion if needed and we have overlays
    if (needsOcclusionUpdateRef.current && overlayMeshesRef.current.length > 0) {
      updateOcclusionForExistingOverlays();
      needsOcclusionUpdateRef.current = false;
    }
    
    // Smooth fade in/out for highlight
    const fadeSpeed = 3.0; // Higher = faster fade
    const hasOverlays = overlayMeshesRef.current.length > 0;
    targetOpacityRef.current = hasOverlays ? 1.0 : 0.0;
    
    // Lerp current opacity towards target
    const opacityDiff = targetOpacityRef.current - currentOpacityRef.current;
    if (Math.abs(opacityDiff) > 0.001) {
      currentOpacityRef.current += opacityDiff * Math.min(delta * fadeSpeed, 1.0);
      
      // Apply to all overlay meshes
      overlayMeshesRef.current.forEach(mesh => {
        if (mesh.material && 'uniforms' in mesh.material && mesh.material.uniforms.uOpacity) {
          const baseOpacity = GHOST_MATERIAL_CONFIG.opacity * (mesh.userData.occlusionFactor || 1.0);
          mesh.material.uniforms.uOpacity.value = baseOpacity * currentOpacityRef.current;
        }
      });
    }
  });

  // STABLE OVERLAY: Update visibility without creating/destroying meshes
  useEffect(() => {
    if (!overlayGroupRef.current) return;
    
    // Instead of destroying/creating, just update visibility of existing overlays
    overlayMeshesRef.current.forEach(mesh => {
      const unitKey = mesh.userData.unitKey;
      
      // Determine if this overlay should be visible
      let shouldBeVisible = false;
      
      // Check if it matches current selection
      if (selectedUnit && selectedBuilding && selectedFloor !== null && selectedFloor !== undefined) {
        const unitGLB = getGLBByUnit(selectedBuilding, selectedFloor, selectedUnit);
        shouldBeVisible = shouldBeVisible || (unitGLB?.key === unitKey);
      }
      
      // Check if it matches current hover
      if (hoveredUnit) {
        const hoveredUnitGLB = glbNodes.get(hoveredUnit);
        shouldBeVisible = shouldBeVisible || (hoveredUnitGLB?.key === unitKey);
      }
      
      // Update mesh visibility and material opacity
      mesh.visible = shouldBeVisible;
      
      if (mesh.material && 'uniforms' in mesh.material && mesh.material.uniforms.uOpacity) {
        mesh.material.uniforms.uOpacity.value = shouldBeVisible ? 
          GHOST_MATERIAL_CONFIG.opacity * (mesh.userData.occlusionFactor || 1.0) : 0;
      }
    });
  }, [hoveredUnit, selectedUnit, selectedBuilding, selectedFloor, getGLBByUnit, glbNodes]);

  // Initialize overlay meshes once for all units
  useEffect(() => {
    if (!overlayGroupRef.current || overlayMeshesRef.current.length > 0) return;
    
    // Create overlay meshes for ALL units once, control visibility via state
    const allNodes = Array.from(glbNodes.values());
    
    allNodes.forEach(unitGLB => {
      if (unitGLB.object && unitGLB.isLoaded) {
        try {
          const overlayMeshes = createOverlayMeshes(unitGLB.object);
          
          overlayMeshes.forEach(mesh => {
            // Store unit key for visibility updates
            mesh.userData.unitKey = unitGLB.key;
            mesh.visible = false; // Start hidden
            overlayGroupRef.current?.add(mesh);
          });
          
          overlayMeshesRef.current.push(...overlayMeshes);
        } catch (error) {
          console.error(`Error creating overlay for ${unitGLB.key}:`, error);
        }
      }
    });
    
    console.log(`✅ Initialized ${overlayMeshesRef.current.length} stable overlay meshes`);
  }, [glbNodes, fresnelMaterial]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      overlayMeshesRef.current.forEach(mesh => {
        mesh.geometry?.dispose();
      });
    };
  }, []);

  return <group ref={overlayGroupRef} />;
};