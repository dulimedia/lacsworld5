export type QualityTier = 'LOW' | 'BALANCED' | 'HIGH';

export const pickTier = (): QualityTier => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const mem = (navigator as any).deviceMemory || 4;
  
  const urlParams = new URLSearchParams(window.location.search);
  const forceTier = urlParams.get('tier');
  if (forceTier === 'low' || forceTier === 'LOW') return 'LOW';
  if (forceTier === 'balanced' || forceTier === 'BALANCED') return 'BALANCED';
  if (forceTier === 'high' || forceTier === 'HIGH') return 'HIGH';
  
  if ((isIOS || isAndroid) && mem <= 4) return 'LOW';
  if (isIOS || isAndroid) return 'BALANCED';
  return 'HIGH';
};
