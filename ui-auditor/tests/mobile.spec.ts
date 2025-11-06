import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 412, height: 915 },
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Mobile Safari/537.36'
});

test('mobile stability: no crashes with performance degradation', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', m => { 
    if (m.type() === 'error') errors.push(m.text()); 
  });

  await page.goto('/');
  
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveCount(1, { timeout: 10000 });
  
  await page.evaluate(() => {
    const t = performance.now();
    while (performance.now() - t < 400) {}
  });
  
  await page.waitForTimeout(1500);
  
  await expect(canvas).toBeVisible();
  
  const criticalErrors = errors.filter(e => 
    e.match(/RangeError|Out of memory|context lost repeatedly|WebGL.*lost/i)
  );
  expect(criticalErrors.length).toBe(0);
  
  console.log('[MobileTest] Guards installed:', errors.filter(e => e.includes('Guard')).length > 0);
});

test('mobile canvas DPR clamped correctly', async ({ page }) => {
  await page.goto('/');
  
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 10000 });
  
  const dpr = await page.evaluate(() => window.devicePixelRatio);
  const canvasDpr = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    return canvas.width / canvas.clientWidth;
  });
  
  expect(canvasDpr).toBeLessThanOrEqual(1.5);
  console.log(`[MobileTest] Device DPR: ${dpr}, Canvas DPR: ${canvasDpr.toFixed(2)}`);
});
