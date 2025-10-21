import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { setFaceDebug } from '../debug/FaceDebug';

export function useFaceDebugHotkey() {
  const { scene } = useThree();
  const [debugEnabled, setDebugEnabled] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'h') {
        setDebugEnabled(prev => {
          const next = !prev;
          setFaceDebug(scene, next);
          console.log(`🔍 Face Debug Mode: ${next ? 'ENABLED' : 'DISABLED'}`);
          if (next) {
            console.log('👁️ All faces now DoubleSide + Wireframe');
            console.log('✅ If faces reappear → culling/normals/mirroring issue');
            console.log('❌ If still gone → depth/frustum/z-fighting issue');
          }
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scene]);

  return debugEnabled;
}
