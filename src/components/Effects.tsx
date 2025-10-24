import { EffectComposer, N8AO, ToneMapping, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { Tier } from '../lib/graphics/tier';
import { Presets } from '../lib/graphics/presets';

interface EffectsProps {
  tier: Tier;
  enabled?: boolean;
}

export function Effects({ tier, enabled = true }: EffectsProps) {
  const { gl } = useThree();
  const aoPreset = Presets.ao(tier);
  const tmPreset = Presets.tonemap(tier);
  const isMobile = tier.startsWith('mobile');

  if (!enabled || !gl || gl.domElement?.isConnected === false) return null;
  
  if (!gl.getContext || gl.isContextLost?.()) {
    console.warn('⚠️ Effects: WebGL context is lost, skipping effects');
    return null;
  }

  if (isMobile) {
    return null;
  }

  return (
    <EffectComposer multisampling={0} disableNormalPass={true}>
      {/* N8AO disabled - was creating transparent reflection overlay */}
      {/* <N8AO
        aoRadius={aoPreset.radius}
        intensity={aoPreset.intensity * 0.4}
        distanceFalloff={1.2}
        halfRes={aoPreset.halfRes}
        denoiseIterations={3}
        denoiseKernel={4}
        luminanceInfluence={0.3}
      /> */}
      <Bloom
        intensity={0.2}
        luminanceThreshold={0.95}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <ToneMapping mode={THREE.ACESFilmicToneMapping} exposure={tmPreset.exposure} />
    </EffectComposer>
  );
}
