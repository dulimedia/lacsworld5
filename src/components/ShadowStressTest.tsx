import { useMemo } from 'react';
import * as THREE from 'three';

interface ShadowStressTestProps {
  enabled: boolean;
}

export function ShadowStressTest({ enabled }: ShadowStressTestProps) {
  const planeGeometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(100, 100);
    geom.rotateX(-Math.PI / 2);
    return geom;
  }, []);

  const cubeGeom = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const plateGeom = useMemo(() => new THREE.BoxGeometry(2, 0.05, 2), []);

  const cubes = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let x = -20; x <= 20; x += 4) {
      for (let z = -20; z <= 20; z += 4) {
        positions.push([x, 0.5, z]);
      }
    }
    return positions;
  }, []);

  const coplanarPlates = useMemo(() => {
    const plates: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      offset: number;
    }> = [];
    
    const angles = [0, 15, 30, 45, 60, 75];
    const offsets = [0.005, 0.01, 0.02, 0.05];
    
    let x = -30;
    for (const angle of angles) {
      let z = -30;
      for (const offset of offsets) {
        plates.push({
          position: [x, offset, z],
          rotation: [0, (angle * Math.PI) / 180, 0],
          offset,
        });
        z += 8;
      }
      x += 12;
    }
    
    return plates;
  }, []);

  if (!enabled) return null;

  return (
    <group>
      <mesh geometry={planeGeometry} receiveShadow position={[0, 0, 0]}>
        <meshStandardMaterial color="#888888" />
      </mesh>

      {cubes.map(([x, y, z], i) => (
        <mesh
          key={`cube-${i}`}
          geometry={cubeGeom}
          position={[x, y, z]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
      ))}

      {coplanarPlates.map((plate, i) => (
        <group key={`plate-${i}`} position={plate.position} rotation={plate.rotation}>
          <mesh geometry={plateGeom} castShadow receiveShadow position={[0, 0, 0]}>
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <mesh geometry={plateGeom} castShadow receiveShadow position={[0, plate.offset, 0]}>
            <meshStandardMaterial color="#22c55e" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
