import { useGLTF } from '@react-three/drei';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { makeFacesBehave } from '../utils/makeFacesBehave';
import { fixInvertedFacesSelective } from '../utils/fixInvertedFacesSelective';
import { generateSceneReport, printReport } from '../debug/MeshInspector';
import { useThree } from '@react-three/fiber';
import { simplifyGeometryForMobile, shouldSimplifyMesh, optimizeMeshForMobile } from '../utils/simplifyGeometry';
import { PerfFlags } from '../perf/PerfFlags';
import { log } from '../utils/debugFlags';
import { applyPolygonOffset } from '../materials/applyPolygonOffset';
import type { GLTF } from 'three-stdlib';

interface SingleEnvironmentMeshProps {
  tier: string;
}

type LoadingState = 'pending' | 'loading' | 'complete' | 'error';

interface ModelState {
  gltf: GLTF | null;
  loadingState: LoadingState;
  error?: string;
}

export function SingleEnvironmentMesh({ tier }: SingleEnvironmentMeshProps) {
  const { gl } = useThree();
  
  const isSmallViewport = window.innerWidth < 600 || window.innerHeight < 600;
  const isMobile = (tier === 'mobile-low');
  
  // Sequential loading state for mobile
  const [models, setModels] = useState<{
    others: ModelState;
    frame: ModelState;
    roof: ModelState;
    stages: ModelState;
  }>(() => ({
    others: { gltf: null, loadingState: 'pending' },
    frame: { gltf: null, loadingState: 'pending' },
    roof: { gltf: null, loadingState: 'pending' },
    stages: { gltf: null, loadingState: 'pending' }
  }));
  
  // For desktop, load all at once
  // For mobile, only load minimal essential models (frame only)
  const others = !isMobile ? useGLTF('/models/environment/others2.glb') : { scene: null };
  const frame = useGLTF('/models/environment/frame-raw-14.glb'); // Always load frame (essential)
  const roof = !isMobile ? useGLTF('/models/environment/roof and walls.glb') : { scene: null };
  const stages = { scene: null }; // Skip stages entirely on all devices to save memory
  
  const shadowsEnabled = gl && (gl as any).shadowMap?.enabled !== false && !isMobile;

  // Sequential model loading for mobile
  useEffect(() => {
    if (!isMobile) return; // Desktop uses normal useGLTF loading
    
    console.log('📱 Mobile detected: Starting sequential model loading...');
    
    const loadModel = async (url: string, name: string, overallProgress: {current: number, total: number}): Promise<GLTF> => {
      console.log(`🔄 Loading ${name}... (${overallProgress.current + 1}/${overallProgress.total})`);
      
      // Dispatch loading status to mobile UI
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('mobile-loading-update', {
          detail: {
            phase: `loading-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            progress: Math.round(((overallProgress.current / overallProgress.total) * 100)),
            message: `Loading ${name}... (${overallProgress.current + 1}/${overallProgress.total})`,
            modelName: name
          }
        }));
      }
      
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
      
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(dracoLoader);
      
      return new Promise((resolve, reject) => {
        loader.load(
          url,
          (gltf) => {
            console.log(`✅ ${name} loaded successfully`);
            
            // Update progress for this model completion
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('mobile-loading-update', {
                detail: {
                  phase: `completed-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                  progress: Math.round(((overallProgress.current + 1) / overallProgress.total) * 100),
                  message: `${name} loaded successfully`,
                  modelName: name
                }
              }));
            }
            
            resolve(gltf);
          },
          (progress) => {
            const modelPercent = Math.round((progress.loaded / progress.total) * 100);
            const overallPercent = Math.round(((overallProgress.current + (progress.loaded / progress.total)) / overallProgress.total) * 100);
            
            // Update fine-grained progress
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('mobile-loading-update', {
                detail: {
                  phase: `loading-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                  progress: overallPercent,
                  message: `Loading ${name}... ${modelPercent}%`,
                  modelName: name
                }
              }));
            }
            
            console.log(`📊 ${name}: ${modelPercent}% (overall: ${overallPercent}%)`);
          },
          (error) => {
            console.error(`❌ Failed to load ${name}:`, error);
            
            // Dispatch error
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('mobile-loading-error', {
                detail: {
                  error: error.message,
                  modelName: name,
                  phase: `error-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
                }
              }));
            }
            
            reject(error);
          }
        );
      });
    };
    
    const loadSequentially = async () => {
      try {
        // Initialize loading UI
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('mobile-loading-start', {
            detail: {
              phase: 'mobile-sequential-loading',
              message: 'Starting mobile-optimized loading...'
            }
          }));
        }
        
        // Load others2 first (1/4 = 25%)
        setModels(prev => ({ ...prev, others: { ...prev.others, loadingState: 'loading' } }));
        const othersGltf = await loadModel('/models/environment/others2.glb', 'Environment Objects', {current: 0, total: 4});
        setModels(prev => ({ ...prev, others: { gltf: othersGltf, loadingState: 'complete' } }));
        
        // Wait for memory pressure to ease
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Load frame (2/4 = 50%)
        setModels(prev => ({ ...prev, frame: { ...prev.frame, loadingState: 'loading' } }));
        const frameGltf = await loadModel('/models/environment/frame-raw-14.glb', 'Building Frame', {current: 1, total: 4});
        setModels(prev => ({ ...prev, frame: { gltf: frameGltf, loadingState: 'complete' } }));
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Load roof (3/4 = 75%)
        setModels(prev => ({ ...prev, roof: { ...prev.roof, loadingState: 'loading' } }));
        const roofGltf = await loadModel('/models/environment/roof and walls.glb', 'Roof & Walls', {current: 2, total: 4});
        setModels(prev => ({ ...prev, roof: { gltf: roofGltf, loadingState: 'complete' } }));
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Load stages (4/4 = 100%)
        setModels(prev => ({ ...prev, stages: { ...prev.stages, loadingState: 'loading' } }));
        const stagesGltf = await loadModel('/models/environment/stages.glb', 'Production Stages', {current: 3, total: 4});
        setModels(prev => ({ ...prev, stages: { gltf: stagesGltf, loadingState: 'complete' } }));
        
        // Final completion
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('mobile-loading-complete', {
            detail: {
              phase: 'mobile-models-loaded',
              progress: 100,
              message: 'All models loaded successfully!'
            }
          }));
        }
        
        console.log('🎉 All models loaded successfully on mobile!');
      } catch (error) {
        console.error('❌ Sequential loading failed:', error);
        
        // Dispatch error event
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('mobile-loading-error', {
            detail: {
              error: error.message || 'Unknown error',
              phase: 'sequential-loading-failed'
            }
          }));
        }
      }
    };
    
    loadSequentially();
  }, [isMobile]);
  
  // Process others model when loaded
  useEffect(() => {
    const scene = isMobile ? models.others.gltf?.scene : others.scene;
    if (scene) {
      console.log('🔵 Processing Others2 model...');
      if (isMobile) console.log('📱 Mobile: Processing Others2 with aggressive optimizations');
      
      makeFacesBehave(scene, true);
      
      let meshCount = 0;
      let shadowCount = 0;
      
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          meshCount++;
          
          if (mesh.geometry && mesh.geometry.attributes.position) {
            const vertCount = mesh.geometry.attributes.position.count;
            log.verbose(`  Mesh: ${mesh.name || 'unnamed'} (${vertCount} vertices)`);
            
            if (isMobile) {
              // Use comprehensive mobile optimization
              optimizeMeshForMobile(mesh);
            }
            // Desktop: NO simplification - keep original quality
          }
          
          if (shadowsEnabled) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            shadowCount++;
          } else if (isMobile) {
            // Explicitly disable shadows on mobile
            mesh.castShadow = false;
            mesh.receiveShadow = false;
          }
          
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach((mat: any) => {
              if (shadowsEnabled) {
                mat.shadowSide = THREE.FrontSide;
              }
              
              // Apply polygon offset to prevent z-fighting on coplanar surfaces
              const meshNameLower = (mesh.name || '').toLowerCase();
              if (meshNameLower.includes('road') || meshNameLower.includes('plaza') || 
                  meshNameLower.includes('roof') || meshNameLower.includes('floor') ||
                  meshNameLower.includes('ground') || meshNameLower.includes('deck')) {
                applyPolygonOffset(mat);
              }
              
              if (isMobile) {
                if (mat.normalMap) {
                  mat.normalMap.dispose();
                  mat.normalMap = null as any;
                  log.verbose(`  📄 Disposed normalMap from ${mesh.name || 'unnamed'}`);
                }
                if (mat.roughnessMap) {
                  mat.roughnessMap.dispose();
                  mat.roughnessMap = null as any;
                }
                if (mat.metalnessMap) {
                  mat.metalnessMap.dispose();
                  mat.metalnessMap = null as any;
                }
                mat.envMapIntensity = 0.6;
              }
              
              if (mat.map) mat.map.needsUpdate = true;
              mat.needsUpdate = true;
            });
          }
        }
      });
      
      // Mobile: Force garbage collection and dispose intermediate data
      if (isMobile) {
        console.log('🗑️ Mobile: Triggering garbage collection after Others2 processing');
        // Force browser garbage collection if available
        if ((window as any).gc) {
          (window as any).gc();
        }
        // Request idle callback to clean up
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => {
            console.log('🌱 Mobile: Idle cleanup after Others2');
          });
        }
      }
    }
  }, [isMobile ? models.others.gltf?.scene : others.scene, isMobile]);

  // Process frame model when loaded
  useEffect(() => {
    const scene = isMobile ? models.frame.gltf?.scene : frame.scene;
    if (scene) {
      console.log('🔵 Processing Frame model...');
      if (isMobile) console.log('📱 Mobile: Processing Frame with optimizations');
      
      makeFacesBehave(scene);
      log.verbose('🔧 Running selective face fixer on Frame...');
      fixInvertedFacesSelective(scene);
      
      // Apply mobile optimizations
      if (isMobile) {
        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            
            if (shouldSimplifyMesh(mesh, isMobile) && mesh.geometry) {
              const originalVerts = mesh.geometry.attributes.position.count;
              mesh.geometry = simplifyGeometryForMobile(mesh.geometry, 0.7);
              const newVerts = mesh.geometry.attributes.position.count;
              console.log(`📉 Frame simplified ${mesh.name}: ${originalVerts} → ${newVerts} vertices`);
            }
          }
        });
      }
      
      
      // Mobile: Cleanup after frame processing
      if (isMobile) {
        console.log('🗑️ Mobile: Cleanup after Frame processing');
        if ((window as any).gc) {
          (window as any).gc();
        }
      }
    }
  }, [isMobile ? models.frame.gltf?.scene : frame.scene, isMobile]);

  // Process roof model when loaded
  useEffect(() => {
    const scene = isMobile ? models.roof.gltf?.scene : roof.scene;
    if (scene) {
      console.log('🔵 Processing Roof model...');
      if (isMobile) console.log('📱 Mobile: Processing Roof with optimizations');
      
      makeFacesBehave(scene);
      
      let meshCount = 0;
      scene.traverse((child) => {
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
          } else if (isMobile) {
            // Explicitly disable shadows on mobile
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            
            // Apply mobile geometry simplification
            if (shouldSimplifyMesh(mesh, isMobile) && mesh.geometry) {
              const originalVerts = mesh.geometry.attributes.position.count;
              mesh.geometry = simplifyGeometryForMobile(mesh.geometry, 0.7);
              const newVerts = mesh.geometry.attributes.position.count;
              console.log(`📉 Roof simplified ${mesh.name}: ${originalVerts} → ${newVerts} vertices`);
            }
          }
        }
      });
      
      // Mobile: Cleanup after roof processing
      if (isMobile) {
        console.log('🗑️ Mobile: Cleanup after Roof processing');
        if ((window as any).gc) {
          (window as any).gc();
        }
      }
    }
  }, [isMobile ? models.roof.gltf?.scene : roof.scene, isMobile]);

  // Process stages model when loaded
  useEffect(() => {
    const scene = isMobile ? models.stages.gltf?.scene : stages.scene;
    if (scene) {
      console.log('🔵 Processing Stages model...');
      if (isMobile) console.log('📱 Mobile: Processing Stages with optimizations');
      
      makeFacesBehave(scene);
      
      let meshCount = 0;
      scene.traverse((child) => {
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
          } else if (isMobile) {
            // Explicitly disable shadows on mobile
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            
            // Apply mobile geometry simplification
            if (shouldSimplifyMesh(mesh, isMobile) && mesh.geometry) {
              const originalVerts = mesh.geometry.attributes.position.count;
              mesh.geometry = simplifyGeometryForMobile(mesh.geometry, 0.7);
              const newVerts = mesh.geometry.attributes.position.count;
              console.log(`📉 Stages simplified ${mesh.name}: ${originalVerts} → ${newVerts} vertices`);
            }
          }
        }
      });
      
      // Mobile: Final cleanup after all models processed
      if (isMobile) {
        console.log('🗑️ Mobile: Final cleanup after Stages processing');
        if ((window as any).gc) {
          (window as any).gc();
        }
        
        // Final memory check
        if (navigator && (navigator as any).deviceMemory) {
          console.log(`📊 Device memory: ${(navigator as any).deviceMemory}GB`);
        }
        
        // WebGL memory info
        if (gl && gl.info) {
          const info = gl.info;
          console.log('📊 WebGL memory:', {
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            programs: info.programs?.length || 0
          });
        }
        
        console.log('✅ Mobile: All models loaded and optimized successfully!');
      }
    }
  }, [isMobile ? models.stages.gltf?.scene : stages.scene, isMobile, gl]);

  return (
    <>
      {/* Only render models that have finished loading */}
      {(isMobile ? models.others.loadingState === 'complete' && models.others.gltf?.scene : others.scene) && (
        <primitive object={isMobile ? models.others.gltf!.scene : others.scene} />
      )}
      {(isMobile ? models.frame.loadingState === 'complete' && models.frame.gltf?.scene : frame.scene) && (
        <primitive object={isMobile ? models.frame.gltf!.scene : frame.scene} />
      )}
      {(isMobile ? models.roof.loadingState === 'complete' && models.roof.gltf?.scene : roof.scene) && (
        <primitive object={isMobile ? models.roof.gltf!.scene : roof.scene} />
      )}
      {(isMobile ? models.stages.loadingState === 'complete' && models.stages.gltf?.scene : stages.scene) && (
        <primitive object={isMobile ? models.stages.gltf!.scene : stages.scene} />
      )}
    </>
  );
}
