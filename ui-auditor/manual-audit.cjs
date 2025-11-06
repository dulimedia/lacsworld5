#!/usr/bin/env node

/**
 * Manual CSS Audit - checks CSS variables and values without needing Playwright
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 UI Manual Audit - CSS Analysis\n');

// Read the built CSS
const cssPath = path.join(__dirname, '../dist/assets');
const cssFiles = fs.readdirSync(cssPath).filter(f => f.endsWith('.css'));

if (cssFiles.length === 0) {
  console.error('❌ No CSS files found in dist/assets/');
  process.exit(1);
}

const cssContent = fs.readFileSync(path.join(cssPath, cssFiles[0]), 'utf-8');

console.log(`📄 Analyzing: ${cssFiles[0]}\n`);

// Test 1: CSS Variables
console.log('TEST 1: CSS Variable Values');
console.log('━'.repeat(50));

const tests = [
  {
    name: 'Collapsed state --scene-left',
    pattern: /--scene-left:\s*48px/,
    expected: '48px',
    critical: true
  },
  {
    name: 'Open state --scene-left',
    pattern: /sidebar-open[^}]*--scene-left:\s*320px/,
    expected: '320px',
    critical: true
  },
  {
    name: 'Expanded state --scene-left',
    pattern: /floorplan-expanded[^}]*--scene-left:\s*640px/,
    expected: '640px',
    critical: true
  },
  {
    name: '--scene-right value',
    pattern: /--scene-right:\s*40px/,
    expected: '40px',
    critical: true
  }
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
  const match = cssContent.match(test.pattern);
  if (match) {
    console.log(`✅ ${test.name}: PASS`);
    passed++;
  } else {
    console.log(`❌ ${test.name}: FAIL (expected ${test.expected})`);
    if (test.critical) failed++;
  }
});

console.log('');

// Test 2: Scene positioning
console.log('TEST 2: Scene Frame Positioning');
console.log('━'.repeat(50));

const sceneTests = [
  {
    name: 'Scene shell uses transform',
    pattern: /\.scene-shell[^}]*transform:/,
    critical: false
  },
  {
    name: 'Scene has transition',
    pattern: /\.scene-shell[^}]*transition:/,
    critical: false
  },
  {
    name: 'Scene has border-radius',
    pattern: /\.scene-shell[^}]*border-radius:\s*24px/,
    critical: true
  }
];

sceneTests.forEach(test => {
  const match = cssContent.match(test.pattern);
  if (match) {
    console.log(`✅ ${test.name}: PASS`);
    passed++;
  } else {
    console.log(`⚠️  ${test.name}: NOT FOUND`);
    if (test.critical) failed++;
  }
});

console.log('');

// Test 3: No layout transitions
console.log('TEST 3: Transition Safety');
console.log('━'.repeat(50));

const badTransitions = [
  'transition:[^}]*\\bleft\\b',
  'transition:[^}]*\\bright\\b',
  'transition:[^}]*\\bwidth\\b',
  'transition:[^}]*\\bheight\\b'
];

let transitionIssues = 0;
badTransitions.forEach(pattern => {
  const matches = cssContent.match(new RegExp(pattern, 'g'));
  if (matches && matches.length > 0) {
    console.log(`⚠️  Found ${matches.length} layout transition(s): ${pattern}`);
    transitionIssues += matches.length;
  }
});

if (transitionIssues === 0) {
  console.log(`✅ No layout transitions found (transform-only)`);
  passed++;
} else {
  console.log(`❌ Found ${transitionIssues} layout transitions (should use transform)`);
  failed++;
}

console.log('');

// Summary
console.log('SUMMARY');
console.log('━'.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('');

if (failed === 0) {
  console.log('🎉 All CSS audits passed!');
  process.exit(0);
} else {
  console.log('⚠️  Some audits failed. Review index.css');
  process.exit(1);
}
