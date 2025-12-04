import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export function CanvasResizeHandler() {
  const { camera } = useThree();

  useEffect(() => {
    const sceneShell = document.querySelector('.scene-shell') as HTMLElement;
    
    if (!sceneShell) return;

    // CRITICAL DEBUG: Monitor canvas size changes continuously
    const canvas = sceneShell.querySelector('canvas');
    if (canvas) {
      console.log('📐 INITIAL CANVAS SIZE:', {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight
      });

      // Monitor canvas size every 100ms during sidebar operations
      const sizeMonitor = setInterval(() => {
        if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
          console.error('🚨 CANVAS SIZE WENT TO ZERO!', {
            width: canvas.width,
            height: canvas.height,
            clientWidth: canvas.clientWidth,
            clientHeight: canvas.clientHeight,
            style: canvas.style.cssText,
            parentStyle: canvas.parentElement?.style.cssText,
            timestamp: Date.now()
          });
        }
      }, 100);

      return () => clearInterval(sizeMonitor);
    }

    const handleTransitionEnd = (e: TransitionEvent) => {
      console.log('🖼️ CANVAS RESIZE HANDLER - transition end:', {
        property: e.propertyName,
        targetTag: (e.target as HTMLElement)?.tagName,
        targetClass: (e.target as HTMLElement)?.className,
        isSceneShell: e.target === sceneShell,
        timestamp: Date.now()
      });

      if (e.propertyName === 'transform' && e.target === sceneShell) {
        console.log('🎯 HANDLING SCENE SHELL TRANSFORM - POTENTIAL CRASH TRIGGER!');
        
        const container = sceneShell;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        console.log('📐 Container dimensions:', { width, height });
        
        if (width > 0 && height > 0 && camera && 'aspect' in camera) {
          const currentAspect = (camera as any).aspect;
          const newAspect = width / height;
          const aspectDiff = Math.abs(currentAspect - newAspect);
          
          console.log('📷 Camera aspect change:', { 
            current: currentAspect, 
            new: newAspect, 
            diff: aspectDiff,
            willUpdate: aspectDiff > 0.01
          });
          
          if (aspectDiff > 0.01) {
            try {
              console.log('🔄 UPDATING CAMERA PROJECTION MATRIX...');
              (camera as any).aspect = newAspect;
              camera.updateProjectionMatrix();
              console.log('✅ Camera projection matrix updated successfully');
            } catch (error) {
              console.error('❌ ERROR updating camera projection matrix:', error);
              // This could be the cause of the crash!
            }
          }
        } else {
          console.warn('⚠️ Invalid dimensions or camera for resize');
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
