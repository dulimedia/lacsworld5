import type { Tier } from './tier';

export interface AmbientOcclusionPreset {
  enabled: boolean;
  samples: number;
  radius: number;
  intensity: number;
  quality: 'performance' | 'low' | 'medium' | 'high' | 'ultra';
  halfRes: boolean;
}

export interface SsReflectionsPreset {
  enabled: boolean;
  intensity: number;
  maxSteps: number;
  maxDepth: number;
  thickness: number;
  temporalResolve: boolean;
  useMrt: boolean;
}

export interface SsgiPreset {
  enabled: boolean;
  resolutionScale: number;
  intensity: number;
  denoise: boolean;
}

export interface ToneMapPreset {
  mode: 'ACES_FILMIC' | 'LINEAR' | 'REINHARD' | 'CINEON';
  exposure: number;
}

export const Presets = {
  ao(tier: Tier): AmbientOcclusionPreset {
    const mobile = tier.startsWith('mobile');

    return {
      enabled: true,
      samples: mobile ? 6 : 12,
      radius: mobile ? 0.22 : 0.35,
      intensity: mobile ? 0.6 : 1.0,
      quality: mobile ? 'low' : 'high',
      halfRes: mobile,
    };
  },
  ssr(tier: Tier): SsReflectionsPreset {
    const desktop = tier.startsWith('desktop');

    return {
      enabled: desktop,
      intensity: 0.18,
      maxSteps: tier === 'desktop-webgl2' ? 24 : 36,
      maxDepth: 12,
      thickness: 0.2,
      temporalResolve: true,
      useMrt: tier !== 'desktop-webgl2',
    };
  },
  ssgi(tier: Tier): SsgiPreset {
    return {
      enabled: tier === 'desktop-webgpu',
      resolutionScale: 0.5,
      intensity: 0.9,
      denoise: true,
    };
  },
  tonemap(tier: Tier): ToneMapPreset {
    return {
      mode: 'ACES_FILMIC',
      exposure: tier.startsWith('mobile') ? 2.625 : 3.15,
    };
  },
  composerScale(tier: Tier): number {
    return tier.startsWith('mobile') ? 0.5 : 1.0;
  },
};

export type PresetOverrides = {
  ao?: Partial<AmbientOcclusionPreset>;
  ssr?: Partial<SsReflectionsPreset>;
  ssgi?: Partial<SsgiPreset>;
  tonemap?: Partial<ToneMapPreset>;
  composerScale?: number;
};
