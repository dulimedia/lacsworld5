#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).map(a => {
  const [k,v] = a.startsWith('--') ? a.slice(2).split('=') : [a, true];
  return [k, v===undefined ? true : (v==='false'?false:v)];
}));

const APPLY = !!args.get('apply');
const KEEP_READMES = args.get('keep-readmes')!==false;
const DRY = !APPLY;

const EXT_SAFE = new Set([
  '.glb','.gltf','.bin','.ktx2','.basis',
  '.hdr','.exr',
  '.png','.jpg','.jpeg','.webp','.avif',
  '.svg',
  '.pdf',
  '.csv',
]);

const GLOBS_NEVER_TOUCH = [
  'public',
  'src/assets',
];

const KEEP_FILES = new Set([
  'README.md','README','LICENSE','LICENSE.md','LICENSE.txt','SECURITY.md',
  'CLAUDE.md','index.html',
]);

const DELETE_PATTERNS = [
  '.DS_Store','Thumbs.db','.log','.tmp','.temp',
  '.orig','.bak','.swp',
  '.gif',
];

const DELETE_DIRS = new Set([
  'dist','build','.next','.vercel','__tests__','__snapshots__',
  '.storybook','examples','demo','demos','screenshots',
  'test-results','playwright-report','.reports','reports',
]);

const IGNORE_DIRS = new Set(['node_modules','.git','.husky','.github','.idea','.vscode','ui-auditor','agent','.trash']);

function walk(dir, out=[]) {
  try {
    const list = fs.readdirSync(dir, {withFileTypes:true});
    for (const d of list) {
      if (IGNORE_DIRS.has(d.name) || DELETE_DIRS.has(d.name)) continue;
      const p = path.join(dir, d.name);
      if (d.isDirectory()) walk(p, out);
      else out.push(p);
    }
  } catch(e) {}
  return out;
}

const allFiles = walk(ROOT).map(p=>path.relative(ROOT,p).replaceAll('\\','/'));

const IMPORT_EXTS = new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs','.json','.css','.scss','.sass']);
const SRC_ROOTS = ['src','app','pages'];
const entryFiles = allFiles.filter(f => SRC_ROOTS.some(r => f.startsWith(r+'/')) && IMPORT_EXTS.has(path.extname(f)));

const importFromFile = (file)=>{
  try {
    const src = fs.readFileSync(path.join(ROOT, file),'utf8');
    const re = /\bimport\s+[^'"]*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|from\s+['"]([^'"]+)['"]/g;
    const deps = new Set();
    let m;
    while ((m = re.exec(src))) {
      const rel = m[1]||m[2]||m[3];
      if (!rel || rel.startsWith('http') || rel.startsWith('@') || rel.startsWith('#')) continue;
      if (rel.startsWith('.')||rel.startsWith('/')) {
        const absFrom = path.join(ROOT, path.dirname(file));
        const cand = [
          path.resolve(absFrom, rel),
          path.resolve(absFrom, rel)+'.ts',
          path.resolve(absFrom, rel)+'.tsx',
          path.resolve(absFrom, rel)+'.js',
          path.resolve(absFrom, rel)+'.jsx',
          path.resolve(absFrom, rel)+'.mjs',
          path.resolve(absFrom, rel,'index.ts'),
          path.resolve(absFrom, rel,'index.tsx'),
          path.resolve(absFrom, rel,'index.js'),
          path.resolve(absFrom, rel,'index.jsx'),
          path.resolve(absFrom, rel)+'.json',
          path.resolve(absFrom, rel)+'.css',
        ];
        for (const c of cand) {
          if (fs.existsSync(c)) deps.add(path.relative(ROOT,c).replaceAll('\\','/'));
        }
      }
    }
    return [...deps];
  } catch(e) {
    return [];
  }
};

const reachable = new Set();
const stack = [...entryFiles];
while (stack.length) {
  const f = stack.pop();
  if (reachable.has(f)) continue;
  reachable.add(f);
  if (IMPORT_EXTS.has(path.extname(f))) {
    importFromFile(f).forEach(d => { if (!reachable.has(d)) stack.push(d); });
  }
}

GLOBS_NEVER_TOUCH.forEach(prefix => 
  allFiles.filter(f=>f.startsWith(prefix)).forEach(f=>reachable.add(f))
);

const toDelete = [];
for (const f of allFiles) {
  const ext = path.extname(f).toLowerCase();
  const base = path.basename(f);
  
  if (GLOBS_NEVER_TOUCH.some(p=>f.startsWith(p))) continue;
  if (EXT_SAFE.has(ext)) continue;
  if (KEEP_FILES.has(base)) continue;

  if (DELETE_PATTERNS.some(p=>base.endsWith(p) || base===p)) { 
    toDelete.push({reason:'pattern',f}); 
    continue; 
  }

  if (ext==='.md' || ext==='.markdown' || ext==='.txt') {
    if (KEEP_READMES && /^README(\.|$)/i.test(base)) continue;
    if (f.startsWith('docs/') && f.includes('RELEASE')) continue;
    toDelete.push({reason:'md/txt', f});
    continue;
  }

  if (!reachable.has(f)) {
    if (f.match(/^(\.github|\.husky|\.vscode|\.idea|scripts|lighthouserc|playwright\.config|vite\.config|tailwind\.config|postcss\.config|tsconfig|package|\.env|\.gitignore|\.npmignore)/)) continue;
    if (base.startsWith('.')) continue;
    toDelete.push({reason:'orphan', f});
  }
}

const byReason = toDelete.reduce((m, x) => (m[x.reason]=(m[x.reason]||0)+1, m), {});
const totalBytes = (files)=>files.reduce((s, {f}) => {
  try { return s + fs.statSync(path.join(ROOT,f)).size; } catch { return s; }
}, 0);
const bytes = totalBytes(toDelete);

console.log('=== CLEAN PROJECT REPORT ===');
console.log(`Files scanned: ${allFiles.length}`);
console.log(`Will delete:   ${toDelete.length} files (${(bytes/1e6).toFixed(2)} MB) [${Object.entries(byReason).map(([k,v])=>`${k}:${v}`).join(', ')}]`);
console.log('');
toDelete.slice(0,200).forEach(x => console.log(`${x.reason.padEnd(8)}  ${x.f}`));
if (toDelete.length>200) console.log(`...and ${toDelete.length-200} more`);
console.log('');
console.log(DRY ? 'DRY RUN (no files deleted). Pass --apply to delete.' : 'APPLY = true (deleting files now).');

if (!DRY) {
  for (const {f} of toDelete) {
    try { fs.rmSync(path.join(ROOT,f), {force:true, recursive:false}); }
    catch (e) {}
  }
  console.log('Deletion complete.');
}
