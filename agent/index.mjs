import fs from 'fs';
import path from 'path';

const root = 'agent/.kb';
const out = [];

const want = /(shadow|pcf|pcss|gtao|ssao|ssr|ktx2|basis|draco|meshopt|logarithmicDepthBuffer|polygonOffset|tone\s?mapping|ACES|iOS|Safari|mobile|performance|instanced|depthTest|depthWrite|receiveShadow|castShadow|shadowMap|directional.*light|ambient.*light)/i;

console.log('📑 Indexing knowledge base...');
console.log(`   Pattern: ${want.toString()}`);

function walk(dir) {
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  Directory not found: ${dir}`);
    return;
  }
  
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    
    if (s.isDirectory()) {
      walk(p);
    } else if (s.size < 2e6) {
      try {
        const t = fs.readFileSync(p, 'utf8');
        if (want.test(t)) {
          const lines = t.split('\n');
          const matches = [];
          
          lines.forEach((line, idx) => {
            if (want.test(line)) {
              matches.push({ line: idx + 1, text: line.trim().substring(0, 200) });
            }
          });
          
          if (matches.length > 0) {
            out.push({
              file: p,
              size: s.size,
              matchCount: matches.length,
              matches: matches.slice(0, 10),
              sample: t.slice(0, 3000)
            });
          }
        }
      } catch (e) {
        console.warn(`  ⚠️  Failed to read ${p}: ${e.message}`);
      }
    }
  }
}

walk(path.join(root, 'repos'));
walk(path.join(root, 'pages'));

const indexPath = path.join(root, 'index.json');
fs.writeFileSync(indexPath, JSON.stringify(out, null, 2));

console.log('✅ Index complete');
console.log(`   Files indexed: ${out.length}`);
console.log(`   Total matches: ${out.reduce((sum, item) => sum + item.matchCount, 0)}`);
console.log(`   Output: ${indexPath}`);
