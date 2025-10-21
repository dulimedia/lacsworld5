import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect, useMemo } from 'react';

/**
 * Tightens a directional light's shadow camera to the current view frustum,
 * projected into light space. Adds texel snapping to stabilize.
 */
export function useFitDirectionalLightShadow(
  light: THREE.DirectionalLight | null,
  opts?: {
    maxExtent?: number;
    margin?: number;
    mapSize?: number;
    snap?: boolean;
  }
) {
  const { camera, gl, size } = useThree();

  const pCam = camera as THREE.PerspectiveCamera;
  const {
    maxExtent = 100,
    margin = 3,
    mapSize = 4096,
    snap = true,
  } = opts ?? {};

  useEffect(() => {
    if (!light) return;
    
    light.shadow.mapSize.set(mapSize, mapSize);
    light.shadow.autoUpdate = true;
    light.shadow.needsUpdate = true;
  }, [light, mapSize]);

  const tmp = useMemo(
    () => ({
      lightView: new THREE.Matrix4(),
      invLightView: new THREE.Matrix4(),
      frustumCornersWS: Array.from({ length: 8 }, () => new THREE.Vector3()),
      frustumCornersLS: Array.from({ length: 8 }, () => new THREE.Vector3()),
      boxLS: new THREE.Box3(),
      centerLS: new THREE.Vector3(),
      tmpV: new THREE.Vector3(),
    }),
    []
  );

  function updateShadowFrustum() {
    if (!light) return;
    
    const dirCam = light.shadow.camera as THREE.OrthographicCamera;

    const near = pCam.near;
    const far = Math.min(pCam.far, 220);
    const fov = (pCam.fov * Math.PI) / 180;
    const aspect = pCam.aspect;

    const nh = Math.tan(fov * 0.5) * near;
    const nw = nh * aspect;
    const fh = Math.tan(fov * 0.5) * far;
    const fw = fh * aspect;

    const camPos = pCam.position.clone();
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(pCam.quaternion).normalize();
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(pCam.quaternion).normalize();
    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(pCam.quaternion).normalize();

    const nc = camPos.clone().addScaledVector(camDir, near);
    const fc = camPos.clone().addScaledVector(camDir, far);

    const ntl = nc.clone().addScaledVector(camUp, nh).subScaledVector(camRight, nw);
    const ntr = nc.clone().addScaledVector(camUp, nh).addScaledVector(camRight, nw);
    const nbl = nc.clone().subScaledVector(camUp, nh).subScaledVector(camRight, nw);
    const nbr = nc.clone().subScaledVector(camUp, nh).addScaledVector(camRight, nw);
    const ftl = fc.clone().addScaledVector(camUp, fh).subScaledVector(camRight, fw);
    const ftr = fc.clone().addScaledVector(camUp, fh).addScaledVector(camRight, fw);
    const fbl = fc.clone().subScaledVector(camUp, fh).subScaledVector(camRight, fw);
    const fbr = fc.clone().subScaledVector(camUp, fh).addScaledVector(camRight, fw);

    tmp.frustumCornersWS[0].copy(ntl); tmp.frustumCornersWS[1].copy(ntr);
    tmp.frustumCornersWS[2].copy(nbl); tmp.frustumCornersWS[3].copy(nbr);
    tmp.frustumCornersWS[4].copy(ftl); tmp.frustumCornersWS[5].copy(ftr);
    tmp.frustumCornersWS[6].copy(fbl); tmp.frustumCornersWS[7].copy(fbr);

    const lightPos = light.position.clone();
    const lightTarget = light.target.getWorldPosition(tmp.tmpV);
    const up = new THREE.Vector3(0, 1, 0);
    tmp.lightView.makeLookAt(lightPos, lightTarget, up).invert();

    tmp.boxLS.makeEmpty();
    for (let i = 0; i < 8; i++) {
      tmp.frustumCornersLS[i].copy(tmp.frustumCornersWS[i]).applyMatrix4(tmp.lightView);
      tmp.boxLS.expandByPoint(tmp.frustumCornersLS[i]);
    }

    const min = tmp.boxLS.min, max = tmp.boxLS.max;
    const clampAxis = (a: number, b: number) => {
      const half = maxExtent * 0.5;
      return [Math.max(-half, a), Math.min(half, b)] as const;
    };
    const [minX, maxX] = clampAxis(min.x, max.x);
    const [minY, maxY] = clampAxis(min.y, max.y);
    const nearLS = Math.max(min.z - margin, -220);
    const farLS  = Math.min(max.z + margin,  220);

    let snappedMinX = minX, snappedMaxX = maxX, snappedMinY = minY, snappedMaxY = maxY;
    if (snap) {
      const width = maxX - minX;
      const height = maxY - minY;
      const texelW = width / light.shadow.mapSize.x;
      const texelH = height / light.shadow.mapSize.y;
      snappedMinX = Math.floor(minX / texelW) * texelW;
      snappedMaxX = Math.floor(maxX / texelW) * texelW;
      snappedMinY = Math.floor(minY / texelH) * texelH;
      snappedMaxY = Math.floor(maxY / texelH) * texelH;
    }

    dirCam.left = snappedMinX - margin;
    dirCam.right = snappedMaxX + margin;
    dirCam.bottom = snappedMinY - margin;
    dirCam.top = snappedMaxY + margin;
    dirCam.near = Math.max(0.1, nearLS);
    dirCam.far = Math.max(dirCam.near + 1.0, farLS);
    dirCam.updateProjectionMatrix();
    light.shadow.needsUpdate = true;
  }

  useEffect(() => {
    if (!light) return;
    
    let frameId: number;
    const onFrame = () => {
      updateShadowFrustum();
      frameId = requestAnimationFrame(onFrame);
    };
    frameId = requestAnimationFrame(onFrame);
    
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [light, gl, size.width, size.height]);
}
