import { useEffect, useRef, useState } from 'react';

interface FlashKillerProps {
  isActive: boolean; // When true, shows freeze-frame to prevent flash
  duration?: number; // How long to show freeze-frame (ms)
}

export const FlashKiller: React.FC<FlashKillerProps> = ({ 
  isActive, 
  duration = 400 
}) => {
  const [freezeFrameUrl, setFreezeFrameUrl] = useState<string | null>(null);
  const [showFreeze, setShowFreeze] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failsafeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Capture canvas as freeze-frame when activated
  useEffect(() => {
    if (isActive) {
      console.log('🧊 FlashKiller ACTIVATED - starting freeze-frame capture');
      try {
        // Find the R3F canvas element in DOM
        const canvasElement = document.querySelector('canvas') as HTMLCanvasElement;
        
        if (canvasElement) {
          // Check if WebGL context is available before capturing
          const gl = canvasElement.getContext('webgl2') || canvasElement.getContext('webgl');
          if (gl && !gl.isContextLost()) {
            // Capture current frame immediately
            const dataUrl = canvasElement.toDataURL('image/jpeg', 0.8);
            setFreezeFrameUrl(dataUrl);
            setShowFreeze(true);
            
            console.log('🧊 FREEZE-FRAME: Captured canvas to prevent flash');
          } else {
            console.warn('⚠️ WebGL context lost or unavailable, skipping freeze-frame');
            setShowFreeze(false);
            return;
          }
          
          // Hide freeze-frame after duration
          timeoutRef.current = setTimeout(() => {
            setShowFreeze(false);
            console.log('✅ Flash prevention window ended (normal timeout)');
            // Clean up URL after animation
            setTimeout(() => setFreezeFrameUrl(null), 100);
          }, duration);

          // FAILSAFE: Force disable after max 2 seconds to prevent infinite freeze
          failsafeTimeoutRef.current = setTimeout(() => {
            console.warn('⚠️ FlashKiller FAILSAFE: Force disabling freeze after 2 seconds');
            setShowFreeze(false);
            setFreezeFrameUrl(null);
          }, 2000);
          
        } else {
          console.warn('❌ No canvas found for freeze-frame capture');
        }
        
      } catch (error) {
        console.error('❌ Failed to capture freeze-frame (WebGL context may be lost):', error);
        setShowFreeze(false);
      }
    } else {
      // Clear freeze when not active
      console.log('🔥 FlashKiller DEACTIVATED - clearing freeze-frame');
      setShowFreeze(false);
      setTimeout(() => setFreezeFrameUrl(null), 100);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (failsafeTimeoutRef.current) {
        clearTimeout(failsafeTimeoutRef.current);
      }
    };
  }, [isActive, duration]);

  // Don't render if no freeze-frame
  if (!showFreeze || !freezeFrameUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9998, // Just below loading overlay (9999)
        pointerEvents: 'none',
        backgroundImage: `url(${freezeFrameUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        transition: 'opacity 0.1s ease-out',
      }}
    >
      {/* Optional subtle fade indicator */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          opacity: 0.8,
        }}
      >
        🧊 FREEZE
      </div>
    </div>
  );
};