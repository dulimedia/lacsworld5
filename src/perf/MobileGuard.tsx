import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { PerfFlags } from './PerfFlags';

export function useCanvasClamps() {
  const { gl, size, setDpr } = useThree();
  
  useEffect(() => {
    const maxCanvasPixels = PerfFlags.qualityTier === 'LOW' ? 0.9e6 : 
                           PerfFlags.qualityTier === 'BALANCED' ? 1.2e6 : 
                           3.0e6;
    
    const targetDpr = PerfFlags.DPR_MAX;
    setDpr(targetDpr);
    
    const pixels = size.width * size.height * targetDpr * targetDpr;
    if (pixels > maxCanvasPixels) {
      const scale = Math.sqrt(maxCanvasPixels / (size.width * size.height));
      const clampedDpr = Math.max(0.75, Math.min(targetDpr * scale, targetDpr));
      console.log(`[MobileGuard] Clamping DPR from ${targetDpr} to ${clampedDpr} (pixels: ${pixels.toFixed(0)} > ${maxCanvasPixels})`);
      setDpr(clampedDpr);
    }
  }, [gl, size, setDpr]);
}

export function useFrameGovernor() {
  const shedStep = useRef(0);
  
  useEffect(() => {
    if (!PerfFlags.isMobile) {
      console.log('[FrameGovernor] Skipping on desktop');
      return;
    }
    
    let last = performance.now();
    let jankFrames = 0;
    let raf = 0;
    
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = now - last;
      last = now;
      
      if (dt > 50) {
        jankFrames++;
      }
      
      if (jankFrames >= 8 && shedStep.current < 3) {
        shedStep.current++;
        jankFrames = 0;
        console.warn(`[FrameGovernor] Performance degradation detected (${jankFrames} janky frames), triggering stage ${shedStep.current}`);
        const ev = new CustomEvent('perf:degrade', { detail: shedStep.current });
        window.dispatchEvent(ev);
      }
    };
    
    raf = requestAnimationFrame(loop);
    console.log('[FrameGovernor] Frame monitoring started');
    
    return () => {
      cancelAnimationFrame(raf);
      console.log('[FrameGovernor] Frame monitoring stopped');
    };
  }, []);
}

export function MobilePerfScope() {
  useCanvasClamps();
  useFrameGovernor();
  return null;
}
