# LACSWORLD2 Performance Risk Assessment

## Repo Diff Summary (prod vs local)
**Status:** Local repo is identical to prod/main (no divergence detected)
- All changes are uncommitted local work
- Key modified files: `App.tsx`, `GLBManager.tsx`, `UnitWarehouse.tsx`, `PerfFlags.ts`, `glbState.ts`
- Deleted: FilterDropdown, NavigationControls, SceneDebugUI, ShadowStressTest, SimpleShadowDebug

## Asset Inventory

### Large GLB Files (>2MB)
| File | Size | Risk |
|------|------|------|
| `environment/roof` | 13MB | 🔴 HIGH - Large uncompressed mesh |
| `environment/stages.glb` | 11MB | 🔴 HIGH - Large scene file |
| `environment/compressed/roof` | 13MB | 🔴 HIGH - "compressed" folder still large |
| `environment/compressed/stages.glb` | 11MB | 🔴 HIGH - Compression insufficient |
| `environment/frame-raw-14.glb` | 4.1MB | 🟡 MEDIUM |
| `environment/others2.glb` | 3.7MB | 🟡 MEDIUM |
| `environment/compressed/others2.glb` | 3.6MB | 🟡 MEDIUM |
| `environment/others2-processed.glb` | 2.8MB | 🟡 MEDIUM |

**Total GLB:** 62.5MB (exceeds budget by ~42MB)
**Recommendation:** Apply Draco/meshopt compression; convert heavy textures to KTX2

### Textures
- No standalone .jpg/.png/.hdr found in public/ (good - embedded in GLB)
- **Risk:** Embedded textures in GLB likely uncompressed
- **Action needed:** Extract, convert to KTX2/Basis, repack GLB

### PostFX Configuration

#### Current State (GOOD ✅)
- **Effects.tsx:** Mobile-low → NO postFX, Mobile-high → Bloom+ToneMap only, Desktop → Bloom+ToneMap
- **VisualStack.tsx:** N8AO optional, SSR hardcoded OFF (line 68), SSGI optional but gated
- **NO SSR/heavy passes** on mobile ✅

#### Risk: Composer Scale
- VisualStack uses dynamic `composerScale` - ensure mobile-low gets 0.75-1.0 max

### Shadow Configuration

#### Current State (MIXED ⚠️)
- **makeRenderer.ts:79-81:** Shadows **disabled by default**, PCFShadowMap, autoUpdate:false ✅
- **mobileProfile.ts:84-86:** iOS low-memory enables PCFShadowMap but no size cap visible
- **No explicit shadow map size caps** found in grep results

#### Recommendations
- Cap shadow map at **1024 (mobile-low)**, **1536 (mobile-high)**, **2048 (desktop)**
- Ensure `light.shadow.mapSize.width/height` respects tier

### Renderer Configuration

#### Current State (GOOD ✅)
- **makeRenderer.ts:**
  - Mobile-low: DPR 1.0, low-power, WebGL1 fallback for iOS ✅
  - Mobile-high: DPR capped at 1.25 ✅
  - Desktop: DPR capped at 2.0 ✅
  - antialias: false ✅
  - Context loss handlers in place ✅
  - Visibility throttle (line 137-141) ✅

- **mobileProfile.ts:**
  - Redundant with makeRenderer (consider consolidation)
  - Has low-memory fallback banner
  - Shadow map size helpers: 512 (low), 1536 (high) ✅

#### Risk: PerfFlags.ts
- **Line 32:** `powerPreference: 'low-power'` hardcoded for ALL devices
- **Should be:** 'low-power' for mobile, 'high-performance' for desktop
- **Line 26:** `pixelRatio: 1.0` hardcoded (but makeRenderer overrides this, so safe)

### Missing Components (per Agent Playbook)

1. ❌ `src/perf/QualityTier.ts` - not present (but logic exists in PerfFlags.ts)
2. ✅ `src/perf/PerfFlags.ts` - exists but needs tier-based tuning
3. ❌ `src/three/RendererSetup.ts` - logic in makeRenderer.ts (rename?)
4. ❌ `src/perf/MobileGuards.ts` - some logic in mobileProfile.ts
5. ✅ `src/three/ContextLoss.ts` - implemented in makeRenderer.ts lines 108-135
6. ❌ `scripts/mobile-audit.js` - missing
7. ❌ `tests/playwright.mobile.spec.ts` - missing (no Playwright installed)
8. ❌ `lighthouserc.json` - missing (no LHCI installed)

## Risk Summary

| Category | Status | Priority |
|----------|--------|----------|
| Asset size (62MB GLB) | 🔴 OVER BUDGET | P0 - compress now |
| PostFX (mobile) | 🟢 GOOD | P2 - monitor |
| Shadows (caps) | 🟡 PARTIAL | P1 - add explicit caps |
| Renderer DPR | 🟢 GOOD | P2 - validate |
| PerfFlags power pref | 🟡 MINOR | P2 - fix desktop |
| Testing infra | 🔴 MISSING | P1 - install Playwright/LHCI |
| Texture compression | 🔴 MISSING | P0 - KTX2 pipeline |

## Next Steps (Recommended Order)

1. Install Playwright + LHCI
2. Run BEFORE audit
3. Update PerfFlags.ts (fix power pref, add shadow caps)
4. Create mobile test scripts
5. Add Lighthouse config
6. Compress top 4 GLB files (apply Draco)
7. Run AFTER audit
8. Generate release notes
