# Mobile GLB File Constraints

**Last Updated:** 2025-11-12

## Overview

This document specifies the GLB file size and complexity constraints for mobile devices.

## File Size Limits

### Current Assets

Based on your codebase analysis:

```
public/models/
├── buildings.glb          105 KB  ✅ (Main building geometry)
├── boxes/                 ~3-10KB each  ✅ (Unit box models)
└── environment/           Various sizes
```

### Recommended Limits

| Asset Type | Desktop Max | Mobile Max | Current |
|------------|-------------|------------|---------|
| Main Building GLB | 500 KB | 200 KB | 105 KB ✅ |
| Unit Box GLB | 50 KB | 20 KB | 3-10 KB ✅ |
| Environment GLB | 1 MB | 300 KB | TBD |
| HDRI Texture | 10 MB | 5 MB | ~5-10 MB |
| Total Scene | 30 MB | 15 MB | ~30 MB |

## Mobile Optimization Strategies

### 1. Geometry Simplification
- **Desktop:** Full detail models
- **Mobile:** Reduced polygon count (50-70% reduction)
- **Tool:** Blender decimation or gltf-pipeline simplification

### 2. Texture Optimization
- **Desktop:** 4K textures (4096x4096)
- **Mobile:** 1K-2K textures (1024x1024 - 2048x2048)
- **Format:** Use Basis Universal texture compression

### 3. Draco Compression
- Apply Draco compression to reduce GLB file sizes by 50-90%
- **Command:**
  ```bash
  gltf-pipeline -i model.glb -o model-compressed.glb --draco
  ```

### 4. Progressive Loading
- Load critical assets first (buildings, nearby units)
- Lazy-load distant or off-screen units
- Stream environment meshes on-demand

## Current Mobile Configuration

From `src/perf/PerfFlags.ts`:

```typescript
LOW: {
  maxTextureSize: 1024,
  maxCanvasPixels: 900000,  // ~950x950 @ 1x DPR
}

BALANCED: {
  maxTextureSize: 2048,
  maxCanvasPixels: 1200000,  // ~1095x1095 @ 1x DPR
}
```

## Memory Budgets

### Device Categories

| Device | RAM | Texture Budget | Geometry Budget |
|--------|-----|----------------|-----------------|
| Ultra-low (iPhone 6-8, SE) | < 4GB | 50 MB | 10 MB |
| Low (iPhone 11, Android mid) | 4GB | 100 MB | 20 MB |
| Normal (iPhone 12+, modern) | 8GB+ | 200 MB | 50 MB |

### Asset Loading Strategy

**Critical (Load Immediately):**
- buildings.glb (105KB)
- Visible unit boxes (~10-20 units)
- Basic materials

**Deferred (Load After 2s):**
- Environment meshes
- Non-visible units
- HDRI textures (use gradient fallback initially)

**On-Demand (Load When Needed):**
- Unit box models (when user explores that area)
- Floorplan images (when user clicks unit)
- Palm tree models

## Testing GLB File Impact

### Check Current File Sizes

```bash
# List all GLB files and sizes
find public/models -name "*.glb" -exec ls -lh {} \;

# Total size
du -sh public/models
```

### Compress GLB Files

```bash
# Install gltf-pipeline
npm install -g gltf-pipeline

# Compress a GLB file
gltf-pipeline -i input.glb -o output.glb --draco

# Batch compress all GLBs
npm run compress-glb
```

### Test on Mobile

1. **Chrome DevTools (Desktop):**
   - F12 → Network tab
   - Select "Disable cache"
   - Toggle device toolbar (Ctrl+Shift+M)
   - Select "iPhone 14 Pro"
   - Reload page
   - Check total transferred size

2. **Real Device:**
   - Connect phone to WiFi
   - Open: http://<your-pc-ip>:3092
   - Check load time and performance

## Validation Checklist

Before deploying new GLB files:

- [ ] File size < 200KB (mobile main) or < 20KB (mobile unit boxes)
- [ ] Polygon count < 50K triangles per model (mobile)
- [ ] Textures resolution ≤ 2048x2048 (mobile)
- [ ] Draco compression applied
- [ ] Tested on mobile emulator
- [ ] FPS > 30 on mobile
- [ ] Memory usage < 200MB

## Troubleshooting

### Issue: Mobile crashes or freezes
**Solution:** Reduce GLB file sizes, apply more aggressive Draco compression

### Issue: Long load times (> 10s)
**Solution:** Implement progressive loading, lazy-load non-critical assets

### Issue: Low FPS (< 30)
**Solution:** Simplify geometry, reduce texture sizes, disable shadows on mobile

### Issue: Out of memory errors
**Solution:** Limit total scene memory to 150MB, unload unused assets

## References

- [glTF Pipeline Documentation](https://github.com/CesiumGS/gltf-pipeline)
- [Draco Compression](https://google.github.io/draco/)
- [Three.js Performance Tips](https://threejs.org/docs/#manual/en/introduction/Performance)
- [Mobile 3D Best Practices](https://www.khronos.org/gltf/)

---

**Status:** ✅ Current assets are within mobile limits
**Next Steps:** Monitor as new models are added
