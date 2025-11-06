import * as THREE from 'three';

export const isIOS = () => {
  return /iP(ad|hone|od)/.test(navigator.platform) || 
         (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
};

export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isLowMemoryDevice = () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('profile') === 'low') return true;
  return isIOS();
};

let lowMemoryFallbackActive = false;

export const enterLowMemoryFallback = (scene?: THREE.Scene) => {
  if (lowMemoryFallbackActive) return;
  lowMemoryFallbackActive = true;
  
  console.warn('🚨 ENTERING LOW-MEMORY FALLBACK MODE');
  
  if (scene) {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        
        if (Array.isArray(obj.material)) {
          obj.material.forEach(mat => {
            if ('transparent' in mat && mat.transparent) {
              mat.transparent = false;
              mat.opacity = 1.0;
            }
          });
        } else if (obj.material && 'transparent' in obj.material) {
          obj.material.transparent = false;
          obj.material.opacity = 1.0;
        }
      }
      
      if (obj instanceof THREE.Light && obj.type !== 'DirectionalLight') {
        obj.intensity *= 0.5;
      }
    });
  }
  
  showLowMemoryBanner();
};

export const applyMobileGlassFallback = (mesh: THREE.Mesh) => {
  if (!isLowMemoryDevice()) return;
  
  mesh.material = new THREE.MeshStandardMaterial({
    color: 0x9fb4c7,
    metalness: 0.0,
    roughness: 0.15,
    envMapIntensity: 0.0,
    transparent: false,
    side: THREE.FrontSide
  });
};

export const createRendererForMobile = (canvas: HTMLCanvasElement) => {
  const useLowMemory = isLowMemoryDevice();
  
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !useLowMemory,
    alpha: false,
    stencil: false,
    depth: true,
    powerPreference: useLowMemory ? 'low-power' : 'high-performance',
    logarithmicDepthBuffer: false,
    precision: useLowMemory ? 'mediump' : 'highp'
  });
  
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  
  if (useLowMemory) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    console.log('📱 Mobile profile: shadows minimal, no antialiasing, mediump precision');
  }
  
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    console.error('❌ WebGL context lost! Attempting recovery...');
    enterLowMemoryFallback();
  });
  
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    console.log('✅ WebGL context restored');
  });
  
  return renderer;
};

export const getMobileShadowMapSize = () => {
  return isLowMemoryDevice() ? 512 : 1536;
};

export const getMobileMaxTextureSize = () => {
  return isLowMemoryDevice() ? 1024 : 2048;
};

function showLowMemoryBanner() {
  const existing = document.getElementById('low-memory-banner');
  if (existing) return;
  
  const banner = document.createElement('div');
  banner.id = 'low-memory-banner';
  banner.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 150, 0, 0.9);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;
  banner.textContent = '⚠️ Low-Memory Mode Enabled';
  document.body.appendChild(banner);
  
  setTimeout(() => {
    banner.style.transition = 'opacity 0.5s';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 500);
  }, 5000);
}
