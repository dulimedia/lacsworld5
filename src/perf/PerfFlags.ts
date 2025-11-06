import { pickTier, type QualityTier } from './QualityTier';

export type Tier = "mobileLow" | "desktopHigh";

export const PerfFlags = (() => {
  const userAgent = navigator.userAgent;
  const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isNarrowViewport = window.innerWidth < 768;
  const hasLowMemory = (navigator as any).deviceMemory ? (navigator as any).deviceMemory <= 4 : false;
  const isSimulatorSize = window.innerWidth < 600 || window.innerHeight < 600;
  
  const isMobile = isMobileUA || (isTouchDevice && isNarrowViewport) || hasLowMemory || isSimulatorSize;
  const tier: Tier = isMobile ? "mobileLow" : "desktopHigh";
  
  const qualityTier: QualityTier = pickTier();

  return {
    tier,
    qualityTier,
    isMobile,
    isMobileUA,
    isIOS,
    isTouch: isTouchDevice,
    
    DPR_MAX: qualityTier === 'LOW' ? 1.2 : qualityTier === 'BALANCED' ? 1.3 : 2.0,
    SHADOW_MAP_SIZE: qualityTier === 'LOW' ? 1024 : qualityTier === 'BALANCED' ? 1024 : 2048,
    SHADOWS_ENABLED: qualityTier !== 'LOW',
    MAX_TEXTURE_DIM: qualityTier === 'LOW' ? 1024 : qualityTier === 'BALANCED' ? 2048 : 4096,
    
    dynamicShadows: false,
    ssr: false,
    ssgi: false,
    ao: qualityTier === 'HIGH',
    bloom: qualityTier !== 'LOW',
    antialiasing: false,
    anisotropy: qualityTier === 'LOW' ? 1 : 2,
    maxTextureSize: qualityTier === 'LOW' ? 1024 : qualityTier === 'BALANCED' ? 2048 : 4096,
    pixelRatio: qualityTier === 'LOW' ? 1.2 : qualityTier === 'BALANCED' ? 1.3 : 2.0,
    powerPreference: 'high-performance' as const,
    
    useLogDepth: false,
    originRebase: false,
    
    useDracoCompressed: false,
  };
})();