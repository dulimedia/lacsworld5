export class MobileLogger {
  private logs: string[] = [];
  private maxLogs = 100;

  constructor() {
    this.captureConsole();
    this.captureErrors();
    this.captureWarnings();
  }

  private captureConsole() {
    // DON'T intercept console - causes infinite loops
    // Just capture errors via window.addEventListener
  }

  private captureErrors() {
    window.addEventListener('error', (event) => {
      this.addLog('ERROR', [`Uncaught: ${event.error?.message || event.message}`]);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('ERROR', [`Unhandled Promise: ${event.reason}`]);
    });
  }

  private captureWarnings() {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    this.addLog('DEVICE', [
      `User Agent: ${userAgent}`,
      `Is Mobile: ${isMobile}`,
      `Screen: ${window.innerWidth}x${window.innerHeight}`,
      `DPR: ${window.devicePixelRatio}`
    ]);
  }

  private addLog(type: string, args: any[]) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    this.logs.push(`[${timestamp}] [${type}] ${message}`);
    
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.updateDisplay();
  }

  private updateDisplay() {
    // Throttle updates to prevent performance issues
    if (this.logs.length % 5 !== 0 && this.logs.length > 0) return;
    
    const existingDisplay = document.getElementById('mobile-debug-logs');
    if (existingDisplay) {
      existingDisplay.innerHTML = this.logs.slice(-50).reverse().map(log => 
        `<div style="font-size: 10px; padding: 2px; border-bottom: 1px solid #333; word-break: break-all;">${this.escapeHtml(log)}</div>`
      ).join('');
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public showDebugPanel() {
    const existing = document.getElementById('mobile-debug-panel');
    if (existing) return;

    const panel = document.createElement('div');
    panel.id = 'mobile-debug-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 200px;
      background: rgba(0, 0, 0, 0.95);
      color: #0f0;
      font-family: monospace;
      z-index: 999999;
      overflow-y: auto;
      padding: 5px;
      font-size: 10px;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      background: #222;
      padding: 5px;
      font-weight: bold;
      position: sticky;
      top: 0;
      display: flex;
      justify-content: space-between;
    `;
    header.innerHTML = `
      <span>📱 Mobile Debug Logs</span>
      <button id="close-debug" style="background: red; color: white; border: none; padding: 2px 8px; cursor: pointer;">✕</button>
    `;

    const logsContainer = document.createElement('div');
    logsContainer.id = 'mobile-debug-logs';

    panel.appendChild(header);
    panel.appendChild(logsContainer);
    document.body.appendChild(panel);

    document.getElementById('close-debug')?.addEventListener('click', () => {
      panel.remove();
    });

    this.updateDisplay();
  }

  public getLogs(): string[] {
    return [...this.logs];
  }

  public downloadLogs() {
    const blob = new Blob([this.logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const mobileLogger = new MobileLogger();

if (typeof window !== 'undefined') {
  (window as any).__mobileLogger = mobileLogger;
  (window as any).__showDebugLogs = () => mobileLogger.showDebugPanel();
  (window as any).__downloadLogs = () => mobileLogger.downloadLogs();
}
