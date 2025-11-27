import { pickTier, type QualityTier } from './QualityTier';
import { MobileDiagnostics } from '../debug/mobileDiagnostics';

export type Tier = "mobileLow" | "desktopHigh";

export const PerfFlags = (() => {
  const userAgent = navigator.userAgent;
  const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);
  const isSafariIOS = isIOS && isSafari;
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isNarrowViewport = window.innerWidth < 768;
  const hasLowMemory = (navigator as any).deviceMemory ? (navigator as any).deviceMemory <= 4 : false;
  const isSimulatorSize = window.innerWidth < 600 || window.innerHeight < 600;
  
  const isMobile = isMobileUA || (isTouchDevice && isNarrowViewport) || hasLowMemory || isSimulatorSize;
  const tier: Tier = (isMobile || isIOS) ? "mobileLow" : "desktopHigh";
  
  MobileDiagnostics.log('perf', 'PerfFlags initialized', {
    isIOS,
    isSafari,
    isSafariIOS,
    isMobile,
    tier,
    userAgent: userAgent.substring(0, 80),
    isTouchDevice,
    isNarrowViewport,
    hasLowMemory,
    isSimulatorSize,
  });
  
  const qualityTier: QualityTier = isMobile ? 'LOW' : pickTier();
  
  const isLow = qualityTier === 'LOW';
  const isBalanced = qualityTier === 'BALANCED';
  const isHigh = qualityTier === 'HIGH';

  return {
    tier,
    qualityTier,
    isMobile,
    isMobileUA,
    isIOS,
    isSafari,
    isSafariIOS,
    isTouch: isTouchDevice,
    
    DPR_MAX: isLow ? 1.25 : isBalanced ? 1.3 : 2.0,
    pixelRatio: isLow ? 1.25 : isBalanced ? 1.3 : 2.0,
    
    // 🔥 Texture & shadow caps - no shadows at all on mobile
    maxTextureSize: isLow ? 1024 : isBalanced ? 2048 : 4096,
    MAX_TEXTURE_DIM: isLow ? 1024 : isBalanced ? 2048 : 4096,
    SHADOW_MAP_SIZE: isLow ? 0 : isBalanced ? 2048 : 4096,
    SHADOWS_ENABLED: !isLow,
    SHADOW_MAX_EXTENT: isLow ? 0 : isBalanced ? 180 : 210,
    SHADOW_MARGIN: isLow ? 0 : isBalanced ? 5.5 : 6,
    SHADOW_BIAS: isLow ? 0 : isBalanced ? -0.002 : -0.006,
    SHADOW_NORMAL_BIAS: isLow ? 0 : isBalanced ? 0.3 : 0.35,
    
    // 🔥 Post FX flags - none on mobile
    dynamicShadows: !isLow && isHigh,
    ssr: false,
    ssgi: !isLow && isHigh,
    ao: !isLow && isHigh,
    bloom: !isLow && isHigh,
    
    // 🔥 Renderer knobs
    antialiasing: !isLow && !isMobile,
    anisotropy: isLow ? 1 : isBalanced ? 2 : 8,
    powerPreference: (isMobile ? 'low-power' : 'high-performance') as const,
    
    useLogDepth: false,
    originRebase: false,
    useDracoCompressed: false,
  };
})();
