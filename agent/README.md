# 3D Engine Research & Auto-Refinement Agent

> **Purpose**: Continuously mine public WebGL/WebGPU/Three.js sources for best practices, compare them against your repo, and iteratively improve visual quality + performance while preserving stability and licensing.

## ⚠️ Important Guardrails

- **No GitHub pushes during testing** - Changes stay local until you're ready
- **Licensing**: External repos are **reference only**. Re-implement patterns, don't copy GPL/AGPL code
- **Safety**: All changes behind feature flags; must pass perf/visual tests before merging
- **Scope**: Focus on rendering path (renderer, camera, materials, shadows, textures)

## Quick Start

```bash
# 1. Harvest external sources (repos + web pages)
node agent/harvest.mjs

# 2. Index the knowledge base
node agent/index.mjs

# 3. Review the indexed findings
cat agent/.kb/index.json | jq '.[] | {file: .file, matches: .matchCount}' | head -20

# 4. Run a refinement cycle (interactive)
node agent/cycle.mjs
```

## System Architecture

```
agent/
├── sources.yaml       # Repos & URLs to harvest
├── harvest.mjs        # Clones repos, fetches pages
├── index.mjs          # Extracts patterns by keywords
├── score.js           # Performance scoring system
├── cycle.mjs          # Main refinement loop
├── .kb/               # Knowledge base (gitignored)
│   ├── repos/         # Cloned repositories
│   ├── pages/         # Fetched web pages
│   └── index.json     # Indexed findings
└── README.md          # This file

reports/auto_refine/
├── cycle-1.md         # First cycle report
├── cycle-2.md         # Second cycle report
├── ...
└── scorecard.json     # Historical metrics
```

## What the Agent Looks For

The indexer searches for patterns related to:

- **Shadows**: PCF, PCSS, contact hardening, shadow bias
- **Post-processing**: SSAO, GTAO, SSR, SSGI
- **Depth precision**: logarithmicDepthBuffer, polygonOffset, z-fighting
- **Textures**: KTX2, Basis compression, mipmaps, anisotropy
- **Geometry**: Draco, meshopt, instancing
- **Performance**: Mobile optimization, iOS Safari limits
- **Rendering**: WebGPU, tone mapping (ACES/Filmic)

## Claude Code Integration

When running `node agent/cycle.mjs`, you'll be prompted to:

1. Review `agent/.kb/index.json` for relevant patterns
2. Use Claude Code to analyze findings and propose patches
3. Apply changes (Claude will modify files)
4. Run build & tests
5. Review metrics and decide keep/revert

### Claude Code System Prompt

```md
You are an autonomous Rendering R&D and Release Engineer.
Your mission is to:
1) Harvest knowledge from curated WebGL/WebGPU/Three.js sources
2) Index & summarize findings with traceable citations
3) Audit the target project and propose minimal, reversible patches behind feature flags
4) Run iterative loop: propose → apply → test → decide → report
5) Respect licenses. Re-implement patterns instead of copying incompatible code

Outputs per cycle: reports/auto_refine/cycle-N.md, updated scorecard.json
Stop condition: score improves < 1% for 3 consecutive cycles
```

### Claude Code Task Prompt

```md
Context:
- Local project: /mnt/c/Users/drews/LACSWORLD31
- Sources: agent/sources.yaml
- Target: Vercel deployment, mobile-first

Objectives:
1) Build local knowledge base from sources
2) Audit render pipeline; rank bottlenecks
3) Propose flag-gated patches to maximize visual clarity per ms
4) Repeat cycles until diminishing returns

Constraints:
- Mobile FPS ≥ 35 idle, ≥ 28 interaction
- TTI ≤ 4.5s on throttled 4G
- Bundle ≤ 3.5MB gzipped
- No regressions in stability or embedding

Deliverables:
- reports/auto_refine/cycle-*.md with metrics & screenshots
- reports/auto_refine/scorecard.json with historical data
- Feature branch with gated improvements
```

## Scoring System

Performance score is calculated as:

```js
score = 0.4 × (fpsIdle/60) + 0.3 × (fpsMove/60)
      - 0.15 × (longTasks/10) - 0.10 × (bytes/5MB)
      - 0.05 × (draws/2000)
```

Higher is better. Changes are only kept if they improve the score.

## Workflow Example

```bash
# Cycle 1: Baseline
node agent/harvest.mjs  # Clone/update repos
node agent/index.mjs    # Build index
node agent/cycle.mjs    # Interactive cycle

# Claude proposes: "Increase shadow map from 2048→4096"
# You review, press Enter to continue
# Build runs, tests run, metrics captured
# Report generated: reports/auto_refine/cycle-1.md

# Cycle 2: Next iteration
# Claude proposes: "Add GTAO ambient occlusion behind flag"
# ... repeat process ...
```

## Source Configuration

Edit `agent/sources.yaml` to add/remove research sources:

```yaml
repos:
  - https://github.com/mrdoob/three.js.git
  - https://github.com/pmndrs/react-three-fiber.git
  # ... add more repos

urls:
  - https://threejs.org/docs/
  - https://github.com/topics/webgl
  # ... add more URLs

keywords:
  - mobile performance
  - shadow quality
  # ... add more keywords
```

## Reports

Each cycle generates a markdown report in `reports/auto_refine/`:

```md
# Cycle N — Auto-Refinement Report

**Hypothesis**: What we tried
**Patch**: Files changed + diff summary
**Metrics (before → after)**:
- Idle FPS: X → Y
- Orbit FPS: X → Y
- Long tasks: A → B
- Bytes: X MB → Y MB
- Draw calls: X → Y
**Decision**: keep / revert
**Citations**: References from knowledge base
**Notes**: Follow-ups + risks
```

## Safety Features

- All changes gated behind `PerfFlags` feature flags
- Automatic rollback if metrics worsen
- No direct GitHub pushes (manual review required)
- License compliance checking
- Mobile performance budgets enforced

## Next Steps After Cycles

1. Review all cycle reports in `reports/auto_refine/`
2. Check `reports/auto_refine/scorecard.json` for trends
3. Test changes manually on mobile devices
4. Cherry-pick the best improvements
5. Create a proper PR with documentation
6. **Then** push to GitHub (not before!)

---

**Note**: This agent learns from the ecosystem but doesn't blindly copy. It proposes evidence-based improvements that you review and approve.
