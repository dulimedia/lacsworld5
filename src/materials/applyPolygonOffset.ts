import { Material } from 'three';
import { ZFixFlags } from '../perf/ZFixFlags';

export function applyPolygonOffset(mat: Material) {
  if (!('polygonOffset' in mat)) return;
  if (!ZFixFlags.ENABLE_POLYGON_OFFSET) return;
  
  (mat as any).polygonOffset = true;
  (mat as any).polygonOffsetFactor = 1;
  (mat as any).polygonOffsetUnits = 1;
}
