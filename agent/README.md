# Mobile Optimization Agent

**Autonomous system for mobile WebGL/Three.js performance optimization**

## Quick Start

```bash
# Full validation + auto-fix
npm run agent:mobile

# Quick mode (skip FPS/Lighthouse)
npm run agent:mobile:quick

# Dry run (validation only)
npm run agent:mobile:dry
```

## Features

- ✅ Validates WebGL configuration
- ✅ Measures FPS & Lighthouse scores
- ✅ Auto-fixes safe issues
- ✅ Generates reports
- ⛔ NEVER pushes to GitHub

## Safety Guarantees

- Only "safe" risk fixes
- Creates backups
- Logs all changes
- Manual git commit required

## Output

- Report: `agent/reports/mobile-optimization-report.md`
- JSON: `agent/reports/mobile-optimization-report.json`
- Changes: `agent/reports/changes.log`
- Backups: `agent/backups/`

## Mobile Requirements

### WebGL Config
```js
{
  antialias: false,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'low-power'
}
```

### Performance Tiers
- LOW: 1.0 DPR, 1024 shadows, no post-processing
- BALANCED: 1.3 DPR, bloom only
- HIGH: 2.0 DPR, full effects

### FPS Targets
- Mobile: 30+ (55+ ideal)
- Desktop: 60+

**Version:** 1.0
