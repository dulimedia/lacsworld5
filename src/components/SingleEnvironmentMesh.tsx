import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { makeFacesBehave } from '../utils/makeFacesBehave';
import { fixInvertedFacesSelective } from '../utils/fixInvertedFacesSelective';
import { generateSceneReport, printReport } from '../debug/MeshInspector';
import { useThree } from '@react-three/fiber';
import { simplifyGeometryForMobile, shouldSimplifyMesh, optimizeMeshForMobile } from '../utils/simplifyGeometry';
import { PerfFlags } from '../perf/PerfFlags';
import { log } from '../utils/debugFlags';
import { applyPolygonOffset } from '../materials/applyPolygonOffset';

interface SingleEnvironmentMeshProps {
  tier: string;
}

const DRACO_DECODER_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
const OTHER_ENVIRONMENT_COUNT = 7;
const MOBILE_PHASE_COUNT = 4;

function useDracoGLTF(path: string) {
  return useGLTF(path, DRACO_DECODER_CDN);
}

export function SingleEnvironmentMesh({ tier }: SingleEnvironmentMeshProps) {
  const { gl } = useThree();
  
  const isMobile = (tier === 'mobile-low');
  
  const accessory = useDracoGLTF('/models/environment/accessory concrete.glb');
  const hqSidewalk = useDracoGLTF('/models/environment/hq sidewalk 2.glb');
  const road = useDracoGLTF('/models/environment/road.glb');
  const transparentBuildings = useDracoGLTF('/models/environment/transparent buildings.glb');
  const transparentSidewalk = useDracoGLTF('/models/environment/transparents sidewalk.glb');
  const whiteWall = useDracoGLTF('/models/environment/white wall.glb');
  const palms = useDracoGLTF('/models/environment/palms.glb');
  const frame = useDracoGLTF('/models/environment/frame-raw-14.glb');
  const roof = useDracoGLTF('/models/environment/roof and walls.glb');
  const stages = useDracoGLTF('/models/environment/stages.glb');



  const otherScenes = useMemo(

    () =>

      [

        accessory.scene,

        hqSidewalk.scene,

        road.scene,

        transparentBuildings.scene,

        transparentSidewalk.scene,

        whiteWall.scene,

        palms.scene

      ].filter((scene): scene is THREE.Object3D => Boolean(scene)),

    [

      accessory.scene,

      hqSidewalk.scene,

      road.scene,

      transparentBuildings.scene,

      transparentSidewalk.scene,

      whiteWall.scene,

      palms.scene

    ]

  );



  const othersReady = otherScenes.length === OTHER_ENVIRONMENT_COUNT;

  const frameReady = Boolean(frame.scene);

  const roofReady = Boolean(roof.scene);

  const stagesReady = Boolean(stages.scene);



  const mobilePhaseDispatch = useRef({

    started: false,

    others: false,

    frame: false,

    roof: false,

    stages: false,

    completed: false

  });



  const sendMobileUpdate = (phase: 'others' | 'frame' | 'roof' | 'stages', step: number, message: string) => {

    if (!window.dispatchEvent) return;

    window.dispatchEvent(new CustomEvent('mobile-loading-update', {

      detail: {

        phase: `${phase}-complete`,

        progress: Math.round((step / MOBILE_PHASE_COUNT) * 100),

        message

      }

    }));

  };

  

  console.log('dY"? SingleEnvironmentMesh:', { 

    isMobile, 

    tier, 

    loadingModels: 'Draco environment set (10 GLBs)',

    reason: isMobile ? 'Environment enabled using compressed assets' : 'Desktop has sufficient memory'

  });

  

  const shadowsEnabled = gl && (gl as any).shadowMap?.enabled !== false && !isMobile;



  useEffect(() => {

    if (!isMobile || mobilePhaseDispatch.current.started) return;

    mobilePhaseDispatch.current.started = true;

    if (window.dispatchEvent) {

      window.dispatchEvent(new CustomEvent('mobile-loading-start', {

        detail: {

          phase: 'mobile-environment-loading',

          message: 'Loading Draco-compressed environment assets...'

        }

      }));

    }

  }, [isMobile]);



  useEffect(() => {

    if (!isMobile || !othersReady || mobilePhaseDispatch.current.others) return;

    mobilePhaseDispatch.current.others = true;

    sendMobileUpdate('others', 1, 'Environment assets ready (1/4)');

  }, [isMobile, othersReady]);



  useEffect(() => {

    if (!isMobile || !frameReady || mobilePhaseDispatch.current.frame) return;

    mobilePhaseDispatch.current.frame = true;

    sendMobileUpdate('frame', 2, 'Frame ready (2/4)');

  }, [isMobile, frameReady]);



  useEffect(() => {

    if (!isMobile || !roofReady || mobilePhaseDispatch.current.roof) return;

    mobilePhaseDispatch.current.roof = true;

    sendMobileUpdate('roof', 3, 'Roof & walls ready (3/4)');

  }, [isMobile, roofReady]);



  useEffect(() => {

    if (!isMobile || !stagesReady || mobilePhaseDispatch.current.stages) return;

    mobilePhaseDispatch.current.stages = true;

    sendMobileUpdate('stages', 4, 'Stages ready (4/4)');

  }, [isMobile, stagesReady]);



  useEffect(() => {

    if (!isMobile) return;

    if (othersReady && frameReady && roofReady && stagesReady && !mobilePhaseDispatch.current.completed) {

      mobilePhaseDispatch.current.completed = true;

      if (window.dispatchEvent) {

        window.dispatchEvent(new CustomEvent('mobile-loading-complete', {

          detail: {

            phase: 'complete',

            progress: 100,

            message: 'All environment models loaded!'

          }

        }));

      }

    }

  }, [isMobile, othersReady, frameReady, roofReady, stagesReady]);



// Process environment models when loaded

  useEffect(() => {

    if (!otherScenes.length) return;

    console.log('dY"? Processing environment set (others)...');

    otherScenes.forEach((scene) => {

      makeFacesBehave(scene, true);

      

      scene.traverse((child) => {

        if ((child as THREE.Mesh).isMesh) {

          const mesh = child as THREE.Mesh;

          

          if (mesh.geometry && mesh.geometry.attributes.position && isMobile) {

            log.verbose(`  Mesh: ${mesh.name || 'unnamed'} (${mesh.geometry.attributes.position.count} vertices)`);

            optimizeMeshForMobile(mesh);

          }

          

          if (shadowsEnabled) {

            mesh.castShadow = true;

            mesh.receiveShadow = true;

          } else if (isMobile) {

            mesh.castShadow = false;

            mesh.receiveShadow = false;

          }

          

          if (mesh.material) {

            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

            materials.forEach((mat: any) => {

              if (shadowsEnabled) {

                mat.shadowSide = THREE.FrontSide;

              }

              

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

    });

    

    if (isMobile) {

      if ((window as any).gc) {

        (window as any).gc();

      }

      if (window.requestIdleCallback) {

        window.requestIdleCallback(() => {

          console.log('dYO? Mobile: Idle cleanup after environment processing');

        });

      }

    }

  }, [otherScenes, isMobile, shadowsEnabled]);



// Process frame model when loaded

  useEffect(() => {

    const scene = frame.scene;

    if (scene) {

      console.log('dY"? Processing Frame model...');

      if (isMobile) console.log('dY"? Mobile: Processing Frame with optimizations');

      

      makeFacesBehave(scene);

      log.verbose('dY"? Running selective face fixer on Frame...');

      fixInvertedFacesSelective(scene);

      

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

              console.log(`dY"% Frame simplified ${mesh.name}: ${originalVerts} ?+' ${newVerts} vertices`);

            }

          }

        });

      }

      

      if (isMobile) {

        console.log('dY-`?,? Mobile: Cleanup after Frame processing');

        if ((window as any).gc) {

          (window as any).gc();

        }

      }

    }

  }, [frame.scene, isMobile]);



// Process roof model when loaded

  useEffect(() => {

    const scene = roof.scene;

    if (scene) {

      console.log('dY"? Processing Roof model...');

      if (isMobile) console.log('dY"? Mobile: Processing Roof with optimizations');

      

      makeFacesBehave(scene);

      

      scene.traverse((child) => {

        if ((child as THREE.Mesh).isMesh) {

          const mesh = child as THREE.Mesh;

          

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

            mesh.castShadow = false;

            mesh.receiveShadow = false;

            

            if (shouldSimplifyMesh(mesh, isMobile) && mesh.geometry) {

              const originalVerts = mesh.geometry.attributes.position.count;

              mesh.geometry = simplifyGeometryForMobile(mesh.geometry, 0.7);

              const newVerts = mesh.geometry.attributes.position.count;

              console.log(`dY"% Roof simplified ${mesh.name}: ${originalVerts} ?+' ${newVerts} vertices`);

            }

          }

        }

      });

      

      if (isMobile) {

        console.log('dY-`?,? Mobile: Cleanup after Roof processing');

        if ((window as any).gc) {

          (window as any).gc();

        }

      }

    }

  }, [roof.scene, isMobile]);



// Process stages model when loaded

  useEffect(() => {

    const scene = stages.scene;

    if (scene) {

      console.log('dY"? Processing Stages model...');

      if (isMobile) console.log('dY"? Mobile: Processing Stages with optimizations');

      

      makeFacesBehave(scene);

      

      let meshCount = 0;

      scene.traverse((child) => {

        if ((child as THREE.Mesh).isMesh) {

          const mesh = child as THREE.Mesh;

          meshCount++;

          

          mesh.visible = true;

          mesh.frustumCulled = false;

          

          if (mesh.material) {

            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

            materials.forEach((mat: any) => {

              mat.visible = true;

              mat.transparent = false;

              mat.opacity = 1.0;

              mat.side = THREE.FrontSide;

              mat.depthWrite = true;

              mat.depthTest = true;

              mat.needsUpdate = true;

            });

          }

          

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

            mesh.castShadow = false;

            mesh.receiveShadow = false;

            

            if (shouldSimplifyMesh(mesh, isMobile) && mesh.geometry) {

              const originalVerts = mesh.geometry.attributes.position.count;

              mesh.geometry = simplifyGeometryForMobile(mesh.geometry, 0.7);

              const newVerts = mesh.geometry.attributes.position.count;

              console.log(`dY"% Stages simplified ${mesh.name}: ${originalVerts} ?+' ${newVerts} vertices`);

            }

          }

        }

      });

      

      console.log('?o. Stages configured: ' + meshCount + ' meshes, all set to visible');

      

      if (isMobile) {

        console.log('dY-`?,? Mobile: Final cleanup after Stages processing');

        if ((window as any).gc) {

          (window as any).gc();

        }

        

        if (navigator && (navigator as any).deviceMemory) {

          console.log(`dY"S Device memory: ${(navigator as any).deviceMemory}GB`);

        }

        

        if (gl && gl.info) {

          const info = gl.info;

          console.log('dY"S WebGL memory:', {

            geometries: info.memory.geometries,

            textures: info.memory.textures,

            programs: info.programs?.length || 0

          });

        }

        

        console.log('?o. Mobile: All models loaded and optimized successfully!');

      }

    }

  }, [stages.scene, isMobile, gl]);



  return (
    <>
      {otherScenes.map((scene, index) => (
        <primitive key={`environment-other-${index}`} object={scene} />
      ))}
      {frame.scene && <primitive object={frame.scene} />}
      {roof.scene && <primitive object={roof.scene} />}
      {stages.scene && <primitive object={stages.scene} />}
    </>
  );
}
