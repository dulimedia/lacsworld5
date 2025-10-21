import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { DirectionalLight, OrthographicCamera, PCFShadowMap } from "three";
import { detectTier } from "../lib/graphics/tier";

export interface LightingProps {
  shadowBias?: number;
  shadowNormalBias?: number;
  onLightCreated?: (light: DirectionalLight) => void;
}

export function Lighting({ 
  shadowBias = -0.0005, 
  shadowNormalBias = 0.02,
  onLightCreated 
}: LightingProps = {}) {
  const { scene } = useThree();
  const sunRef = useRef<DirectionalLight | null>(null);

  useEffect(() => {
    let cancelled = false;

    detectTier().then((tier) => {
      if (cancelled) return;

      const old = scene.children.filter(o => o.userData.__sunLight);
      old.forEach(o => scene.remove(o));

      const sun = new DirectionalLight(0xffffff, 6.5);
      sun.position.set(-40, 30, 20);
      sun.castShadow = true;
      
      const mapSize = tier.startsWith('mobile') ? 2048 : 4096;
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

      sun.userData.__sunLight = true;
      scene.add(sun);
      sunRef.current = sun;

      onLightCreated?.(sun);

      console.log(`🌅 Sun shadow initialized: ${mapSize}×${mapSize}, bias=${shadowBias}, normalBias=${shadowNormalBias}`);
    });

    return () => { 
      cancelled = true;
      const lights = scene.children.filter(o => o.userData.__sunLight);
      lights.forEach(l => scene.remove(l)); 
      sunRef.current = null;
    };
  }, [scene, shadowBias, shadowNormalBias, onLightCreated]);

  return null;
}
