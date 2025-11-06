import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { detectTier, type Tier } from '../lib/graphics/tier';
import { AdaptivePerf } from './AdaptivePerf';
import { makeRenderer, type RendererType } from '../graphics/makeRenderer';
import { RendererInfo } from '../graphics/getRendererInfo';
import { MobilePerfScope } from '../perf/MobileGuard';
import { attachContextGuard } from '../perf/WebGLContextGuard';
import { installErrorProbe } from '../perf/ErrorProbe';
import { installDegradePolicy } from '../perf/FrameGovernor';

export type RootCanvasProps = Omit<CanvasProps, 'children' | 'gl' | 'dpr'> & {
  children: ReactNode | ((tier: Tier) => ReactNode);
  gl?: CanvasProps['gl'];
  onTierChange?: (tier: Tier) => void;
};

export function RootCanvas({ children, gl: glProp, onTierChange, ...canvasProps }: RootCanvasProps) {
  const [tier, setTier] = useState<Tier | null>(null);
  const [rendererType, setRendererType] = useState<RendererType | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => installErrorProbe(), []);

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

  useEffect(() => {
    if (canvasRef.current) {
      return attachContextGuard(canvasRef.current);
    }
  }, []);

  const createRenderer = useCallback(async (canvas: HTMLCanvasElement) => {
    if (!canvas) {
      console.error('❌ Canvas element is null/undefined!');
      throw new Error('Canvas not ready');
    }

    console.log('✅ Canvas element ready, creating renderer...');
    canvasRef.current = canvas;

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
    
    installDegradePolicy({
      setShadows: (v) => result.renderer.shadowMap.enabled = v,
      setBloom: (v) => console.log('[DegradePolicy] Bloom:', v),
      setAO: (v) => console.log('[DegradePolicy] AO:', v),
      setSSR: (v) => console.log('[DegradePolicy] SSR:', v),
      setSSGI: (v) => console.log('[DegradePolicy] SSGI:', v),
      setMaxAnisotropy: (n) => console.log('[DegradePolicy] Max Anisotropy:', n),
    });
    
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
      shadows={canvasProps.shadows ?? (tier !== 'mobile-low')}
    >
      <MobilePerfScope />
      <AdaptivePerf tier={tier} />
      <RendererInfo />
      {resolvedChildren}
    </Canvas>
  );
}
