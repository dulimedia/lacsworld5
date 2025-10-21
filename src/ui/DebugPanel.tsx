import { useEffect, useState, type CSSProperties } from 'react';
import type { Tier } from '../lib/graphics/tier';

export interface DebugPanelState {
  tier: Tier;
  ao: boolean;
  ssr: boolean;
  ssgi: boolean;
  pathtracer: boolean;
  ptBounces: number;
  composerScale: number;
  shadowBias: number;
  shadowNormalBias: number;
  showShadowHelper: boolean;
  polygonOffsetEnabled: boolean;
  polygonOffsetFactor: number;
  polygonOffsetUnits: number;
  polygonOffsetRegex: string;
}

interface DebugPanelProps {
  state: DebugPanelState;
  onChange: (next: Partial<DebugPanelState>) => void;
}

const clampScale = (value: number) => Math.min(1, Math.max(0.5, value));
const clampBias = (value: number) => Math.min(0, Math.max(-0.001, value));
const clampNormalBias = (value: number) => Math.min(2, Math.max(0, value));

export function DebugPanel({ state, onChange }: DebugPanelProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'd') {
        setOpen((value) => !value);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        background: 'rgba(10, 10, 14, 0.85)',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: 12,
        width: 280,
        boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(10px)',
        fontFamily: 'Inter, sans-serif',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Debug Controls</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 12 }}>Tier: {state.tier}</div>

      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 16, marginBottom: 8 }}>Effects</div>

      <label style={checkboxStyle}>
        <input
          type="checkbox"
          checked={state.ao}
          onChange={(event) => onChange({ ao: event.target.checked })}
        />
        <span>Ambient Occlusion</span>
      </label>

      <label style={checkboxStyle}>
        <input
          type="checkbox"
          checked={state.ssr}
          onChange={(event) => onChange({ ssr: event.target.checked })}
          disabled={state.tier.startsWith('mobile')}
        />
        <span>Screen Space Reflections</span>
      </label>

      <label style={checkboxStyle}>
        <input
          type="checkbox"
          checked={state.ssgi}
          onChange={(event) => onChange({ ssgi: event.target.checked })}
          disabled={state.tier !== 'desktop-webgpu'}
        />
        <span>Screen Space GI</span>
      </label>

      <label style={checkboxStyle}>
        <input
          type="checkbox"
          checked={state.pathtracer}
          onChange={(event) => onChange({ pathtracer: event.target.checked })}
          disabled={state.tier.startsWith('mobile')}
        />
        <span>GPU Path Tracer</span>
      </label>

      {state.pathtracer && (
        <>
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
            PT Bounces: {state.ptBounces}
          </div>
          <input
            type="range"
            min={3}
            max={15}
            step={1}
            value={state.ptBounces}
            onChange={(event) => onChange({ ptBounces: Number(event.target.value) })}
            style={{ width: '100%', marginTop: 4 }}
          />
        </>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
        Composer Scale
      </div>
      <input
        type="range"
        min={0.5}
        max={1}
        step={0.05}
        value={state.composerScale}
        onChange={(event) => onChange({ composerScale: clampScale(Number(event.target.value)) })}
        style={{ width: '100%', marginTop: 4 }}
      />
      <div style={{ textAlign: 'right', fontSize: 11, marginTop: 4 }}>
        {state.composerScale.toFixed(2)}x
      </div>

      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 16, marginBottom: 8 }}>Shadows</div>

      <label style={checkboxStyle}>
        <input
          type="checkbox"
          checked={state.showShadowHelper}
          onChange={(event) => onChange({ showShadowHelper: event.target.checked })}
        />
        <span>Show Shadow Frustum</span>
      </label>

      <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
        Shadow Bias: {state.shadowBias.toFixed(5)}
      </div>
      <input
        type="range"
        min={-0.001}
        max={0}
        step={0.00001}
        value={state.shadowBias}
        onChange={(event) => onChange({ shadowBias: clampBias(Number(event.target.value)) })}
        style={{ width: '100%', marginTop: 4 }}
      />

      <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
        Normal Bias: {state.shadowNormalBias.toFixed(2)}
      </div>
      <input
        type="range"
        min={0}
        max={2}
        step={0.05}
        value={state.shadowNormalBias}
        onChange={(event) => onChange({ shadowNormalBias: clampNormalBias(Number(event.target.value)) })}
        style={{ width: '100%', marginTop: 4 }}
      />

      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 16, marginBottom: 8 }}>Polygon Offset</div>

      <label style={checkboxStyle}>
        <input
          type="checkbox"
          checked={state.polygonOffsetEnabled}
          onChange={(event) => onChange({ polygonOffsetEnabled: event.target.checked })}
        />
        <span>Enable Visible Polygon Offset</span>
      </label>

      {state.polygonOffsetEnabled && (
        <>
          <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
            Offset Factor: {state.polygonOffsetFactor.toFixed(1)}
          </div>
          <input
            type="range"
            min={-4}
            max={4}
            step={0.5}
            value={state.polygonOffsetFactor}
            onChange={(event) => onChange({ polygonOffsetFactor: Number(event.target.value) })}
            style={{ width: '100%', marginTop: 4 }}
          />

          <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
            Offset Units: {state.polygonOffsetUnits.toFixed(1)}
          </div>
          <input
            type="range"
            min={-4}
            max={4}
            step={0.5}
            value={state.polygonOffsetUnits}
            onChange={(event) => onChange({ polygonOffsetUnits: Number(event.target.value) })}
            style={{ width: '100%', marginTop: 4 }}
          />

          <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>
            Name Filter (regex)
          </div>
          <input
            type="text"
            value={state.polygonOffsetRegex}
            onChange={(event) => onChange({ polygonOffsetRegex: event.target.value })}
            placeholder="slat|louver|mullion"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              padding: '6px 8px',
              fontSize: 11,
              color: '#fff',
              fontFamily: 'monospace',
            }}
          />
        </>
      )}

      <button
        type="button"
        onClick={() => onChange({ 
          ao: true, 
          ssr: !state.tier.startsWith('mobile'), 
          ssgi: state.tier === 'desktop-webgpu',
          pathtracer: false,
          ptBounces: 5,
          composerScale: clampScale(state.tier.startsWith('mobile') ? 0.5 : 1),
          shadowBias: -0.00015,
          shadowNormalBias: 0.6,
          showShadowHelper: false,
          polygonOffsetEnabled: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -2,
          polygonOffsetRegex: 'slat|louver|mullion|trim|glass|window|panel',
        })}
        style={{
          marginTop: 16,
          width: '100%',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '8px 0',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Reset Defaults
      </button>
    </div>
  );
}

const checkboxStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  marginBottom: 8,
};
