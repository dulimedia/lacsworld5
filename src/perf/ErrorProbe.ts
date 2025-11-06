export function installErrorProbe() {
  let degradeCount = 0;
  const MAX_DEGRADES = 1; // Only degrade once
  
  const degrade = () => {
    if (degradeCount >= MAX_DEGRADES) return; // Prevent infinite loops
    degradeCount++;
    console.warn('[ErrorProbe] Fatal error detected, triggering degradation');
    window.dispatchEvent(new CustomEvent('perf:degrade', { detail: 99 }));
  };
  
  window.addEventListener('error', (e) => {
    const errorMsg = e.error?.message || e.message || '';
    
    // Ignore React error boundary errors (they're handled by SafariErrorBoundary)
    if (errorMsg.includes('Portal') || errorMsg.includes('ErrorBoundary')) {
      console.warn('[ErrorProbe] Ignoring React boundary error:', errorMsg);
      return;
    }
    
    console.error('[ErrorProbe] Uncaught error:', errorMsg); 
    degrade(); 
  }, { passive: true });
  
  window.addEventListener('unhandledrejection', (e: any) => { 
    const reason = e?.reason?.toString() || '';
    
    // Ignore React error boundary rejections
    if (reason.includes('Portal') || reason.includes('ErrorBoundary')) {
      console.warn('[ErrorProbe] Ignoring React boundary rejection');
      return;
    }
    
    console.error('[ErrorProbe] Unhandled rejection:', reason); 
    degrade(); 
  });
  
  console.log('[ErrorProbe] Global error monitoring installed (max degrades: 1)');
}
