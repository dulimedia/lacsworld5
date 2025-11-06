# UI Auditor – Agent Spec

## Goals
1) Sidebar toggle is visible and not clipped in all desktop states.
2) Loader visuals match baseline (logo crop/size, progress bar).
3) Scene canvas fills the beveled frame (no left/right gaps).
4) No mixed layout+transform animations on key nodes.
5) CSS state variables match reality for 48/320/640.

## States to test (desktop 1440x900)
- collapsed: body classes = []
- open: body.add('sidebar-open')
- expanded: body.add('sidebar-open','floorplan-expanded')
- loading: simulate `modelsLoading=true` (toggle loader root visible)

## Measurements
For each state:
- `.scene-shell`: bounding rect, left/right/top/bottom, transform, z-index.
- `canvas` inside `.scene-shell`: bounding rect (must match `.scene-shell` inset:0).
- Sidebar `<aside>`: rect, overflow, transform, z-index.
- Toggle button: rect.x (≥ frame-left - 12px && ≤ frame-left + 12px), visibility, clip.
- Loader: card center alignment, logo size, border-radius/object-fit, progress bar rect/height.
- CSS vars (if exist): `--scene-left`, `--scene-right`.

## Failure thresholds
- Frame left/right gap > 2px → FAIL.
- Toggle outside viewport or intersecting sidebar overflow → FAIL.
- Loader logo size differs from baseline > 4px or radius missing → FAIL.
- Any transition on `left|right|top|bottom|width|height` for scene/sidebar/toggle → FAIL.
- `--scene-left` not equal to {48,320,640} in the three states → FAIL.

## Output
- JSON report per state in `ui-auditor/artifacts/`.
- Screenshots per state.
- One consolidated markdown summary.
