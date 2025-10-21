import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { Tier } from '../lib/graphics/tier';

interface AdaptivePerfProps {
  tier: Tier;
}

export function AdaptivePerf({ tier }: AdaptivePerfProps) {
  const { setDpr } = useThree();

  return (
    <PerformanceMonitor
      onDecline={() => setDpr(tier.startsWith('mobile') ? 1.0 : 1.25)}
      onIncline={() => setDpr(tier.startsWith('mobile') ? 1.25 : 1.5)}
    />
  );
}
