#!/usr/bin/env node

import gltfPipeline from 'gltf-pipeline';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const processGltf = gltfPipeline.processGltf;

async function compressGLB(inputPath, outputPath) {
  console.log(`\n🔄 Compressing: ${path.basename(inputPath)}`);
  
  try {
    const glb = await fs.readFile(inputPath);
    
    const options = {
      dracoOptions: {
        compressionLevel: 10,
        quantizePositionBits: 14,
        quantizeNormalBits: 10,
        quantizeTexcoordBits: 12,
        quantizeColorBits: 8,
        quantizeGenericBits: 12,
        unifiedQuantization: false
      }
    };
    
    const originalSize = glb.length;
    console.log(`  Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    
    const results = await processGltf(glb, options);
    await fs.writeFile(outputPath, results.glb);
    
    const compressedSize = results.glb.length;
    const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    console.log(`  Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  ✅ Saved: ${savings}% (${((originalSize - compressedSize) / 1024 / 1024).toFixed(2)} MB)`);
    
    return { originalSize, compressedSize, savings };
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  const publicDir = path.join(__dirname, '../public');
  
  const filesToCompress = [
    {
      input: path.join(publicDir, 'models/environment/transparent stuff .glb'),
      output: path.join(publicDir, 'models/environment/transparent stuff .glb.compressed')
    },
    {
      input: path.join(publicDir, 'models/environment/full tower.glb'),
      output: path.join(publicDir, 'models/environment/full tower.glb.compressed')
    }
  ];
  
  console.log('🗜️  Starting Draco Compression...\n');
  
  let totalOriginal = 0;
  let totalCompressed = 0;
  
  for (const file of filesToCompress) {
    try {
      const stats = await compressGLB(file.input, file.output);
      totalOriginal += stats.originalSize;
      totalCompressed += stats.compressedSize;
    } catch (error) {
      console.error(`Failed to compress ${file.input}`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`  Total original: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Total compressed: ${(totalCompressed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Total savings: ${((1 - totalCompressed / totalOriginal) * 100).toFixed(1)}%`);
  console.log('\n✨ Compression complete!');
  console.log('\n⚠️  To use compressed files, rename them (remove .compressed extension)');
}

main().catch(console.error);
