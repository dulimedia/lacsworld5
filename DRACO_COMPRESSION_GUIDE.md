# Draco Compression Guide for GLB Files

## Files to Compress
- `public/models/environment/transparent stuff .glb` (63MB)
- `public/models/environment/full tower.glb` (42MB)

## Method 1: Using gltf-transform CLI (Recommended)

### Install gltf-transform globally:
```bash
npm install -g @gltftransform/cli
```

### Compress files:
```bash
# Navigate to models directory
cd public/models/environment/

# Compress transparent stuff .glb
gltf-transform draco "transparent stuff .glb" "transparent stuff .glb" \
  --draco-compression-level 10 \
  --draco-quantize-position 14 \
  --draco-quantize-normal 10 \
  --draco-quantize-texcoord 12

# Compress full tower.glb
gltf-transform draco "full tower.glb" "full tower.glb" \
  --draco-compression-level 10 \
  --draco-quantize-position 14 \
  --draco-quantize-normal 10 \
  --draco-quantize-texcoord 12
```

Expected results:
- `transparent stuff .glb`: 63MB → ~15-20MB (70% reduction)
- `full tower.glb`: 42MB → ~10-15MB (65% reduction)

## Method 2: Using Blender (Visual Method)

1. **Open Blender** (3.6+ recommended)
2. **Import GLB**: File → Import → glTF 2.0 (.glb/.gltf)
3. **Export with Draco**:
   - File → Export → glTF 2.0 (.glb/.gltf)
   - Format: **glTF Binary (.glb)**
   - Enable **Draco mesh compression**
   - Set **Compression level: 10**
   - Position quantization: **14 bits**
   - Normal quantization: **10 bits**
   - Texcoord quantization: **12 bits**
4. **Save** with original filename

## Method 3: Online Tool

Visit: https://gltf.report/

1. Upload GLB file
2. Click "Export"
3. Enable "Draco compression"
4. Set compression level to 10
5. Download compressed file

## Verification

After compression, check:
```bash
ls -lh public/models/environment/*.glb
```

Files should be significantly smaller while maintaining visual quality.

## Current Application Status

The app already has Draco decoder configured:
- Decoder path: `/draco/`
- Located in: `src/loaders/StreamingGLTFLoader.ts`
- Auto-detects Draco-compressed GLBs

**Note**: The application will automatically decompress Draco files at runtime - no code changes needed!
