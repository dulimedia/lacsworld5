export type Tier = 'desktop-webgpu' | 'desktop-webgl2' | 'mobile-high' | 'mobile-low';

export async function detectTier(): Promise<Tier> {
  if (typeof window === 'undefined') {
    return 'desktop-webgl2';
  }

  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const isMobile = !!nav && /Mobi|Android|iPhone|iPad/i.test(nav.userAgent);
  const hasWebGPU = !!(navigator as any).gpu;

  const canvas = document.createElement('canvas');
  const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
  const webgl2 = !!gl2;

  const gl1 = !webgl2 ? canvas.getContext('webgl') as WebGLRenderingContext | null : null;

  const hasHalfFloatGL2 = webgl2 && !!gl2?.getExtension('EXT_color_buffer_float');
  const hasHalfFloatGL1 = !!gl1?.getExtension('EXT_color_buffer_half_float');

  if (!isMobile && hasWebGPU) return 'desktop-webgpu';
  if (!isMobile && webgl2) return 'desktop-webgl2';
  if (isMobile && (hasWebGPU || (webgl2 && (hasHalfFloatGL2 || hasHalfFloatGL1)))) return 'mobile-high';
  return 'mobile-low';
}
