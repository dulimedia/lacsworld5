import { EffectComposer, N8AO, ToneMapping, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { Tier } from '../lib/graphics/tier';
import { Presets } from '../lib/graphics/presets';
import { PerfFlags } from '../perf/PerfFlags';

interface EffectsProps {
  tier: Tier;
  enabled?: boolean;
}

export function Effects({ tier, enabled = true }: EffectsProps) {
  const { gl } = useThree();
  const aoPreset = Presets.ao(tier);
  const tmPreset = Presets.tonemap(tier);
  const isMobileLow = tier === 'mobile-low';
  const isMobileHigh = tier === 'mobile-high';

  if (!enabled || !gl || gl.domElement?.isConnected === false) return null;
  
  if (!gl.getContext || gl.isContextLost?.()) {
    console.warn('⚠️ Effects: WebGL context is lost, skipping effects');
    return null;
  }

  if (isMobileLow) {
    console.log('📱 Mobile-low: Post-processing effects DISABLED for performance');
    return null;
  }
  
  if (isMobileHigh) {
    console.log('📱 Mobile-high: Selective post-processing enabled (Bloom + ToneMapping)');
    return (
      <EffectComposer multisampling={0} disableNormalPass={true}>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ToneMapping mode={THREE.ACESFilmicToneMapping} exposure={tmPreset.exposure} />
      </EffectComposer>
    );
  }
  
  console.log('🖥️ Desktop: Full post-processing effects enabled');

  return (
    <EffectComposer multisampling={0} disableNormalPass={true}>
      <Bloom
        intensity={0.8}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <ToneMapping mode={THREE.ACESFilmicToneMapping} exposure={tmPreset.exposure} />
    </EffectComposer>
  );
}
