import * as THREE from 'three';

export function createFresnelHighlightMaterial({
  color = '#3aa7ff',   // soft blue
  opacity = 0.25,      // subtle transparency
  bias = 0.1,
  scale = 1.5,
  power = 3.0,
  doubleSide = true,
  depthTest = false,   // configurable depth testing
  depthWrite = false,  // configurable depth writing
}: {
  color?: string;
  opacity?: number;
  bias?: number;
  scale?: number;
  power?: number;
  doubleSide?: boolean;
  depthTest?: boolean;
  depthWrite?: boolean;
} = {}) {
  const uniforms = {
    uColor:   { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
    uBias:    { value: bias },
    uScale:   { value: scale },
    uPower:   { value: power },
  };

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: depthTest,    // configurable: prevents z-fighting when false
    depthWrite: depthWrite,   // configurable: prevents depth conflicts when false
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    uniforms,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uBias;
      uniform float uScale;
      uniform float uPower;
      varying vec3 vNormal;
      varying vec3 vWorldPos;

      void main() {
        // View dir in world space
        vec3 cameraToFrag = normalize(cameraPosition - vWorldPos);
        // Fresnel term
        float fresnel = uBias + uScale * pow(1.0 - max(dot(vNormal, cameraToFrag), 0.0), uPower);
        fresnel = clamp(fresnel, 0.0, 1.0);

        // Maximum visibility translucent edge color - significantly increased intensity
        vec3 col = uColor * (0.6 + 1.0 * fresnel);  // Increased from 0.4 + 0.7
        
        // Maximum bloom effect for maximum visibility
        float bloomBoost = fresnel * 3.5; // Increased from 2.5
        col = col + uColor * bloomBoost * 0.6; // Increased from 0.4
        
        // Apply enhanced opacity with fresnel-based variation for maximum visibility
        float finalOpacity = uOpacity * (0.9 + 0.4 * fresnel); // Increased from 0.7 + 0.3
        gl_FragColor = vec4(col, finalOpacity);
      }
    `
  });

  // Set high render order to ensure it draws on top
  mat.renderOrder = 999;
  return mat;
}