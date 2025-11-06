export const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const capTexture = (img: HTMLImageElement, maxDim: number): HTMLImageElement => {
  const max = Math.max(img.width, img.height);
  if (max <= maxDim) return img;
  
  const scale = maxDim / max;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return img;
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  const out = new Image();
  out.src = canvas.toDataURL('image/png');
  return out;
};

export const estimateTextureMemory = (width: number, height: number, format: 'rgb' | 'rgba' = 'rgba'): number => {
  const bytesPerPixel = format === 'rgba' ? 4 : 3;
  return width * height * bytesPerPixel;
};

export const estimateTextureMemoryMB = (width: number, height: number, format: 'rgb' | 'rgba' = 'rgba'): number => {
  return estimateTextureMemory(width, height, format) / (1024 * 1024);
};
