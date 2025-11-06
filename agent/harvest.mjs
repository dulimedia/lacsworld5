import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import yaml from 'js-yaml';
import { JSDOM } from 'jsdom';

const cfg = yaml.load(fs.readFileSync('agent/sources.yaml', 'utf8'));
const shell = (s, cwd = '.') => execSync(s, { stdio: 'pipe', cwd });
const root = 'agent/.kb';
fs.mkdirSync(root, { recursive: true });
fs.mkdirSync(path.join(root, 'repos'), { recursive: true });
fs.mkdirSync(path.join(root, 'pages'), { recursive: true });

console.log('🔍 Starting harvest...');

for (const url of cfg.repos) {
  const name = url.split('/').slice(-1)[0].replace(/\.git$/, '');
  const dir = path.join(root, 'repos', name);
  console.log(`📦 ${name}...`);
  
  try {
    if (!fs.existsSync(dir)) {
      console.log(`  Cloning ${url}...`);
      shell(`git clone --depth=1 ${url} ${dir}`);
    } else {
      console.log(`  Updating ${name}...`);
      shell(`git fetch --depth=1 && git reset --hard origin/HEAD`, dir);
    }
    console.log(`  ✅ ${name} ready`);
  } catch (e) {
    console.warn(`  ⚠️  Failed to harvest ${name}:`, e.message);
  }
}

for (const url of cfg.urls) {
  console.log(`🌐 Fetching ${url}...`);
  try {
    const html = shell(`curl -L --max-time 20 "${url}"`).toString();
    const doc = new JSDOM(html).window.document;
    const text = doc.body.textContent || '';
    const filename = Buffer.from(url).toString('base64').substring(0, 50) + '.txt';
    fs.writeFileSync(path.join(root, 'pages', filename), text);
    console.log(`  ✅ Saved page snapshot`);
  } catch (e) {
    console.warn(`  ⚠️  Failed to fetch ${url}:`, e.message);
  }
}

console.log('✅ Harvest complete');
console.log(`   Repos: ${fs.readdirSync(path.join(root, 'repos')).length}`);
console.log(`   Pages: ${fs.readdirSync(path.join(root, 'pages')).length}`);
