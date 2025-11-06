import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export function CanvasResizeHandler() {
  const { camera } = useThree();

  useEffect(() => {
    const sceneShell = document.querySelector('.scene-shell') as HTMLElement;
    
    if (!sceneShell) return;

    const handleTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'transform' && e.target === sceneShell) {
        const container = sceneShell;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        if (width > 0 && height > 0 && camera && 'aspect' in camera) {
          const newAspect = width / height;
          if (Math.abs((camera as any).aspect - newAspect) > 0.01) {
            (camera as any).aspect = newAspect;
            camera.updateProjectionMatrix();
          }
        }
      }
    };

    sceneShell.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      sceneShell.removeEventListener('transitionend', handleTransitionEnd);
    };
  }, [camera]);

  return null;
}
