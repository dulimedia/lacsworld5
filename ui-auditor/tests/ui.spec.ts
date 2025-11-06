import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const S = {
  scene: '.scene-shell',
  canvas: '.scene-shell canvas, canvas',
  sidebar: 'aside[role="complementary"], aside',
  toggle: 'button[aria-label*="sidebar" i]',
  loader: '[style*="zIndex: 9999"], .fixed.inset-0',
  loaderLogo: 'img[src*="333999"]',
  loaderBar: '[style*="width:"][style*="%"]',
};

interface MeasureResult {
  rect: { x: number; y: number; w: number; h: number };
  z: string;
  pos: string;
  of: string;
  tf: string;
  br: string;
  objfit: string;
  trans: string;
}

async function measure(page: any, label: string) {
  const js = async (sel: string): Promise<MeasureResult | null> => page.evaluate((s: string) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      z: cs.zIndex,
      pos: cs.position,
      of: cs.overflow,
      tf: cs.transform,
      br: cs.borderRadius,
      objfit: (el as HTMLImageElement).style?.objectFit || '',
      trans: cs.transitionProperty
    };
  }, sel);

  const vars = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      sceneLeft: cs.getPropertyValue('--scene-left').trim() || null,
      sceneRight: cs.getPropertyValue('--scene-right').trim() || null
    };
  });

  const data = {
    label,
    vars,
    scene: await js(S.scene),
    canvas: await js(S.canvas),
    sidebar: await js(S.sidebar),
    toggle: await js(S.toggle),
    loader: await js(S.loader),
    loaderLogo: await js(S.loaderLogo),
    loaderBar: await js(S.loaderBar),
    bodyClass: await page.evaluate(() => document.body.className)
  };

  // Save JSON
  const artifactsDir = path.join(process.cwd(), 'ui-auditor', 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(artifactsDir, `${label}.json`),
    JSON.stringify(data, null, 2)
  );

  return data;
}

async function expectNoLayoutTransitions(page: any, selector: string) {
  const prop = await page.evaluate((s: string) => {
    const el = document.querySelector(s);
    if (!el) return '';
    const cs = getComputedStyle(el);
    return cs.transitionProperty;
  }, selector);

  const bad = ['left', 'right', 'top', 'bottom', 'width', 'height'].some(p => prop?.includes(p));
  expect(bad, `Disallowed transition on ${selector}: ${prop}`).toBeFalsy();
}

test.describe('Desktop UI States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1440, height: 900 });
    // Wait for app to be ready
    await page.waitForTimeout(2000);
  });

  const states = [
    { label: 'collapsed', classes: [] },
    { label: 'open', classes: ['sidebar-open'] },
    { label: 'expanded', classes: ['sidebar-open', 'floorplan-expanded'] }
  ];

  for (const st of states) {
    test(`State: ${st.label}`, async ({ page }) => {
      // Set body classes
      await page.evaluate((cls) => {
        document.body.className = cls.join(' ');
      }, st.classes);

      // Wait for transitions
      await page.waitForTimeout(500);

      const d = await measure(page, st.label);
      
      // Take screenshot
      await page.screenshot({
        path: `ui-auditor/artifacts/${st.label}.png`,
        fullPage: false
      });

      // Test 1: CSS variables match expected state
      if (d.vars.sceneLeft) {
        const expected = st.label === 'collapsed' ? '48px' :
                        st.label === 'open' ? '320px' : '640px';
        expect(d.vars.sceneLeft, `CSS var --scene-left should be ${expected} in ${st.label} state`).toBe(expected);
      }

      if (d.vars.sceneRight) {
        expect(d.vars.sceneRight, `CSS var --scene-right should be 40px`).toBe('40px');
      }

      // Test 2: Canvas fills scene frame (no gaps > 2px)
      if (d.scene && d.canvas) {
        const gapL = Math.abs(d.canvas.rect.x - d.scene.rect.x);
        const gapR = Math.abs((d.scene.rect.x + d.scene.rect.w) - (d.canvas.rect.x + d.canvas.rect.w));
        expect(gapL, `Canvas left gap should be ≤ 2px, got ${gapL}px`).toBeLessThanOrEqual(2);
        expect(gapR, `Canvas right gap should be ≤ 2px, got ${gapR}px`).toBeLessThanOrEqual(2);
      }

      // Test 3: Toggle button visible and near frame-left (±24px tolerance)
      if (d.toggle && d.scene) {
        expect(d.toggle.rect.x, `Toggle x=${d.toggle.rect.x} should be near scene left=${d.scene.rect.x}`).toBeGreaterThanOrEqual(d.scene.rect.x - 24);
        expect(d.toggle.rect.x).toBeLessThanOrEqual(d.scene.rect.x + 24);
        
        // Toggle should be visible
        expect(d.toggle.rect.w, 'Toggle button should have width').toBeGreaterThan(0);
        expect(d.toggle.rect.h, 'Toggle button should have height').toBeGreaterThan(0);
      }

      // Test 4: No layout transitions on key nodes
      await expectNoLayoutTransitions(page, S.scene);
      await expectNoLayoutTransitions(page, S.sidebar);

      // Test 5: Scene has border radius (desktop)
      if (d.scene) {
        expect(d.scene.br, 'Scene should have border-radius').not.toBe('0px');
      }

      console.log(`✅ ${st.label}: All checks passed`);
    });
  }
});

test('Loader Visuals', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 1440, height: 900 });

  // Wait for initial render
  await page.waitForTimeout(500);

  const d = await measure(page, 'loading');
  
  await page.screenshot({
    path: 'ui-auditor/artifacts/loading.png'
  });

  // Test: Loader exists and visible
  if (d.loader) {
    expect(d.loader.rect.w, 'Loader should cover viewport width').toBeGreaterThan(1000);
    expect(d.loader.rect.h, 'Loader should cover viewport height').toBeGreaterThan(500);
    expect(d.loader.z, 'Loader should have high z-index').toBe('9999');
  }

  // Test: Logo reasonable size and rounded
  if (d.loaderLogo) {
    expect(d.loaderLogo.rect.w, 'Logo width should be reasonable').toBeGreaterThan(80);
    expect(d.loaderLogo.rect.w, 'Logo width should not be too large').toBeLessThan(400);
  }

  console.log('✅ Loading: All checks passed');
});

test.afterAll(async () => {
  // Generate summary report
  const artifactsDir = path.join(process.cwd(), 'ui-auditor', 'artifacts');
  const files = fs.readdirSync(artifactsDir).filter(f => f.endsWith('.json'));
  
  const summary = {
    timestamp: new Date().toISOString(),
    states: files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(artifactsDir, f), 'utf-8'));
      return {
        state: data.label,
        vars: data.vars,
        sceneRect: data.scene?.rect,
        toggleRect: data.toggle?.rect,
        bodyClass: data.bodyClass
      };
    })
  };

  fs.writeFileSync(
    path.join(artifactsDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('\n📊 UI Audit Summary written to ui-auditor/artifacts/summary.json');
});
