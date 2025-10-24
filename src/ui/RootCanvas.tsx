import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { detectTier, type Tier } from '../lib/graphics/tier';
import { AdaptivePerf } from './AdaptivePerf';
import { makeRenderer, type RendererType } from '../graphics/makeRenderer';
import { RendererInfo } from '../graphics/getRendererInfo';

export type RootCanvasProps = Omit<CanvasProps, 'children' | 'gl' | 'dpr'> & {
  children: ReactNode | ((tier: Tier) => ReactNode);
  gl?: CanvasProps['gl'];
  onTierChange?: (tier: Tier) => void;
};

export function RootCanvas({ children, gl: glProp, onTierChange, ...canvasProps }: RootCanvasProps) {
  const [tier, setTier] = useState<Tier | null>(null);
  const [rendererType, setRendererType] = useState<RendererType | null>(null);

  useEffect(() => {
    let cancelled = false;

    detectTier()
      .then((value) => {
        if (cancelled) return;
        setTier(value);
        onTierChange?.(value);
      })
      .catch(() => {
        if (cancelled) return;
        setTier('mobile-low');
        onTierChange?.('mobile-low');
      });

    return () => {
      cancelled = true;
    };
  }, [onTierChange]);

  const createRenderer = useCallback(async (canvas: HTMLCanvasElement) => {
    if (typeof glProp === 'function') {
      return (glProp as (canvas: HTMLCanvasElement) => unknown)(canvas);
    }

    if (glProp) {
      return glProp as unknown;
    }

    if (!tier) {
      throw new Error('Tier not detected yet');
    }

    const result = await makeRenderer(canvas, tier);
    setRendererType(result.type);
    
    console.log(`✅ Renderer created: ${result.type} (tier: ${tier})`);
    
    return result.renderer;
  }, [glProp, tier]);

  const resolvedChildren = useMemo(() => {
    if (!tier) return null;
    if (rendererType) {
      console.log(`🎨 RootCanvas rendering with ${rendererType.toUpperCase()} (tier: ${tier})`);
    }
    return typeof children === 'function' ? (children as (value: Tier) => ReactNode)(tier) : children;
  }, [children, tier, rendererType]);

  if (!tier) {
    return null;
  }

  return (
    <Canvas
      {...canvasProps}
      gl={createRenderer}
      dpr={[1, tier.startsWith('mobile') ? 1.0 : 2]}
      shadows={canvasProps.shadows ?? !tier.startsWith('mobile')}
    >
      <AdaptivePerf tier={tier} />
      <RendererInfo />
      {resolvedChildren}
    </Canvas>
  );
}
