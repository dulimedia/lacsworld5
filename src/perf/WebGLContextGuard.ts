export function attachContextGuard(canvas: HTMLCanvasElement) {
  const onLost = (e: Event) => {
    console.warn('[WebGLContextGuard] Context lost; preventing default to allow restore');
    e.preventDefault?.();
  };
  
  const onRestored = () => {
    console.info('[WebGLContextGuard] Context restored; requesting full renderer reset');
    window.dispatchEvent(new Event('perf:context-restored'));
  };
  
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);
  
  return () => {
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
  };
}
