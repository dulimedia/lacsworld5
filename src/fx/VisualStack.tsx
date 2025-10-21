import { memo, useEffect, useMemo, useRef } from 'react';
import { Effects } from '@react-three/drei';
import { N8AO, SSR, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import type { EffectComposer } from 'three-stdlib';
import { useThree } from '@react-three/fiber';
import type { Tier } from '../lib/graphics/tier';
import { Presets, type PresetOverrides } from '../lib/graphics/presets';

export interface VisualDebugConfig {
  ao?: boolean;
  ssr?: boolean;
  ssgi?: boolean;
  composerScale?: number;
}

interface VisualStackProps {
  tier: Tier;
  debug?: VisualDebugConfig;
  overrides?: PresetOverrides;
}

const TONE_MAPPING_MAP: Record<string, ToneMappingMode> = {
  ACES_FILMIC: ToneMappingMode.ACES_FILMIC,
  LINEAR: ToneMappingMode.LINEAR,
  REINHARD: ToneMappingMode.REINHARD,
  CINEON: ToneMappingMode.CINEON,
};

export const VisualStack = memo(function VisualStack({ tier, debug, overrides }: VisualStackProps) {
  const composerRef = useRef<EffectComposer | null>(null);
  const { size } = useThree();

  const aoConfig = useMemo(() => ({
    ...Presets.ao(tier),
    ...(overrides?.ao ?? {}),
  }), [tier, overrides?.ao]);

  const ssrConfig = useMemo(() => ({
    ...Presets.ssr(tier),
    ...(overrides?.ssr ?? {}),
  }), [tier, overrides?.ssr]);

  const ssgiConfig = useMemo(() => ({
    ...Presets.ssgi(tier),
    ...(overrides?.ssgi ?? {}),
  }), [tier, overrides?.ssgi]);

  const tonemapConfig = useMemo(() => ({
    ...Presets.tonemap(tier),
    ...(overrides?.tonemap ?? {}),
  }), [tier, overrides?.tonemap]);

  const composerScale = useMemo(() => (
    debug?.composerScale ?? overrides?.composerScale ?? Presets.composerScale(tier)
  ), [debug?.composerScale, overrides?.composerScale, tier]);

  useEffect(() => {
    if (!composerRef.current) return;

    const width = Math.max(1, Math.floor(size.width * composerScale));
    const height = Math.max(1, Math.floor(size.height * composerScale));

    composerRef.current.setSize(width, height);
  }, [composerScale, size.height, size.width]);

  const aoEnabled = aoConfig.enabled && debug?.ao !== false;
  const ssrEnabled = false;
  const ssgiEnabled = ssgiConfig.enabled && debug?.ssgi !== false;

  const toneMappingMode = TONE_MAPPING_MAP[tonemapConfig.mode] ?? ToneMappingMode.ACES_FILMIC;

  return (
    <Effects ref={composerRef} disableGamma>
      {aoEnabled && (
        <N8AO
          quality={aoConfig.quality}
          aoRadius={aoConfig.radius}
          intensity={aoConfig.intensity}
          aoSamples={aoConfig.samples}
          denoiseSamples={Math.max(Math.floor(aoConfig.samples / 2), 4)}
          denoiseRadius={1}
          distanceFalloff={1}
          halfRes={aoConfig.halfRes}
          depthAwareUpsampling
        />
      )}

      <ToneMapping adaptive={false} mode={toneMappingMode} exposure={tonemapConfig.exposure} />
    </Effects>
  );
});
