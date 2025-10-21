import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ShadowHelperProps {
  enabled: boolean;
}

export function ShadowHelper({ enabled }: ShadowHelperProps) {
  const { scene } = useThree();

  useEffect(() => {
    if (!enabled) {
      const helpers = scene.children.filter(o => o.userData.__shadowHelper);
      helpers.forEach(h => scene.remove(h));
      return;
    }

    const sun = scene.children.find(o => o.userData.__sunLight) as THREE.DirectionalLight | undefined;
    if (!sun || !sun.shadow || !sun.shadow.camera) {
      console.warn('ShadowHelper: No sun light found');
      return;
    }

    const helper = new THREE.CameraHelper(sun.shadow.camera);
    helper.userData.__shadowHelper = true;
    scene.add(helper);

    return () => {
      scene.remove(helper);
      helper.dispose();
    };
  }, [enabled, scene]);

  return null;
}
