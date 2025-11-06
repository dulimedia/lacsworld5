export default async function pageAudit(page) {
  await page.addInitScript(() => {
    window.__frames = 0;
    window.__start = performance.now();
    window.__longTasks = 0;
    
    const loop = () => {
      window.__frames++;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        new PerformanceObserver((list) => {
          const long = list.getEntries().filter(e => e.duration > 50).length;
          window.__longTasks = (window.__longTasks || 0) + long;
        }).observe({ entryTypes: ['longtask'] });
      } catch (err) {
        console.warn('Long task observer not supported:', err);
      }
    }
  });
  
  await page.waitForTimeout(5000);
  
  const fps = await page.evaluate(() => {
    const elapsed = performance.now() - window.__start;
    return elapsed > 0 ? (1000 * window.__frames) / elapsed : 0;
  });
  
  const longTasks = await page.evaluate(() => window.__longTasks || 0);
  
  const memoryMB = await page.evaluate(() => {
    if (performance.memory) {
      return (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
    }
    return 'N/A';
  });
  
  return {
    fps: Number(fps.toFixed(1)),
    longTasks,
    memoryMB
  };
};
