import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { DirectionalLight, OrthographicCamera, PCFSoftShadowMap, AmbientLight } from "three";
import { detectTier } from "../lib/graphics/tier";
import { useFitDirectionalLightShadow } from "./ShadowFit";
import { logger } from "../utils/logger";
import { PerfFlags } from "../perf/PerfFlags";

export interface LightingProps {
  shadowBias?: number;
  shadowNormalBias?: number;
  onLightCreated?: (light: DirectionalLight) => void;
}

export function Lighting({ 
  shadowBias = -0.0003, 
  shadowNormalBias = 0.05,
  onLightCreated 
}: LightingProps = {}) {
  const { scene, gl } = useThree();
  const sunRef = useRef<DirectionalLight | null>(null);
  const isMobileRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    detectTier().then((tier) => {
      const isMobileLow = tier === 'mobile-low';
      const isMobileHigh = tier === 'mobile-high';
      const isMobile = isMobileLow || isMobileHigh;
      isMobileRef.current = isMobile;
      if (cancelled) return;

      // Clean up old lights
      const old = scene.children.filter(o => o.userData.__sunLight || o.userData.__ambientLight);
      old.forEach(o => scene.remove(o));

      // Create directional light
      const sun = new DirectionalLight(0xffffff, isMobile ? 3.2 : 7.2);
      sun.position.set(-40, 30, 20);
      
      // Mobile-low: No shadows
      // Mobile-high: Lightweight shadows
      // Desktop: Full quality shadows
      if (isMobileLow) {
        sun.castShadow = false;
        gl.shadowMap.enabled = false;
        console.log('📱 Mobile-low: Shadows DISABLED for performance');
      } else if (isMobileHigh) {
        sun.castShadow = true;
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = PCFSoftShadowMap;
        
        const mapSize = 2048;
        sun.shadow.mapSize.set(mapSize, mapSize);
        sun.shadow.bias = shadowBias;
        sun.shadow.normalBias = shadowNormalBias;
        sun.shadow.radius = 2;
        
        const cam = sun.shadow.camera as OrthographicCamera;
        cam.left = -60;
        cam.right = 60;
        cam.top = 60;
        cam.bottom = -60;
        cam.near = 0.5;
        cam.far = 150;
        cam.updateProjectionMatrix();
        
        console.log('📱 Mobile-high: Lightweight shadows enabled (2K map)');
      } else {
        sun.castShadow = true;
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = PCFSoftShadowMap;
        
        const mapSize = 4096;
        sun.shadow.mapSize.set(mapSize, mapSize);
        sun.shadow.bias = shadowBias;
        sun.shadow.normalBias = shadowNormalBias;
        sun.shadow.radius = 0;
        
        const cam = sun.shadow.camera as OrthographicCamera;
        cam.left = -80;
        cam.right = 80;
        cam.top = 80;
        cam.bottom = -80;
        cam.near = 0.5;
        cam.far = 220;
        cam.updateProjectionMatrix();
        
        logger.log('LOADING', '🌅', `Desktop: Shadow map initialized: ${mapSize}×${mapSize}`);
      }

      sun.userData.__sunLight = true;
      scene.add(sun);
      sunRef.current = sun;
      
      // Add ambient light based on tier
      if (isMobileLow) {
        const ambient = new AmbientLight(0x404040, 0.6);
        ambient.userData.__ambientLight = true;
        scene.add(ambient);
        logger.log('LOADING', '💡', 'Mobile-low: Reduced ambient light (no shadows)');
      } else if (isMobileHigh) {
        const ambient = new AmbientLight(0x303030, 0.4);
        ambient.userData.__ambientLight = true;
        scene.add(ambient);
        logger.log('LOADING', '💡', 'Mobile-high: Reduced ambient light with shadows');
      } else {
        const ambient = new AmbientLight(0x404040, 0.3);
        ambient.userData.__ambientLight = true;
        scene.add(ambient);
      }

      onLightCreated?.(sun);

      logger.log('LOADING', '🌅', `Lighting configured for ${tier} (shadows: ${sun.castShadow})`);
    });

    return () => { 
      cancelled = true;
      const lights = scene.children.filter(o => o.userData.__sunLight || o.userData.__ambientLight);
      lights.forEach(l => scene.remove(l)); 
      sunRef.current = null;
    };
  }, [scene, gl, shadowBias, shadowNormalBias, onLightCreated]);

  useFitDirectionalLightShadow(
    isMobileRef.current ? null : sunRef.current,
    {
      maxExtent: 100,
      margin: 3,
      mapSize: 4096,
      snap: true
    }
  );

  return null;
}
