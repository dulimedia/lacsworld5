import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { WebGLRenderer } from 'three';

export function RendererInfo() {
  const { gl } = useThree();

  useEffect(() => {
    if (!gl) return;

    const isWebGL = gl instanceof WebGLRenderer;
    const constructorName = gl.constructor.name;
    
    let type = 'Unknown';
    if (constructorName === 'WebGPURenderer') {
      type = 'WebGPU';
    } else if (isWebGL) {
      type = 'WebGL2';
    }
    
    const color = type === 'WebGPU' ? '#00ff00' : '#ff9900';
    console.log(`%c🎨 RENDERER: ${type}`, `background: ${color}; color: #000; padding: 4px 8px; font-weight: bold; font-size: 14px`);
    console.log(`   Constructor: ${constructorName}`);
    
    if (type === 'WebGPU') {
      console.log('   Backend:', (gl as any).backend?.constructor?.name || 'Unknown');
      console.log('   Device:', (gl as any).backend?.device ? 'GPUDevice available' : 'No device');
    } else if (isWebGL) {
      const webglRenderer = gl as WebGLRenderer;
      const caps = webglRenderer.capabilities;
      console.log('   WebGL Version:', caps.isWebGL2 ? '2.0' : '1.0');
      console.log('   Max Texture Size:', caps.maxTextureSize);
      console.log('   Max Anisotropy:', caps.getMaxAnisotropy());
    }
    
    console.log('   Canvas:', gl.domElement.width, 'x', gl.domElement.height);
    console.log('   Pixel Ratio:', (gl as any).getPixelRatio?.() || 1);
    console.log('   Has WebGPU API:', !!(navigator as any).gpu);
  }, [gl]);

  return null;
}
