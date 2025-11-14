// Global console bridge + guardrails for mobile/dev
// - Deduplicates and rate-limits noisy logs
// - Optionally forwards warn/error to a local log server in dev
(function initLogBridge() {
  const isDev = !!(import.meta as any)?.env?.DEV;
  const disablePatch = (import.meta as any)?.env?.VITE_DISABLE_CONSOLE_PATCH === 'true';
  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  // Levels: debug < info < log < warn < error
  const order = ['debug', 'info', 'log', 'warn', 'error'] as const;
  type Level = typeof order[number];
  const levelFromEnv = (import.meta as any)?.env?.VITE_LOG_LEVEL as Level | undefined;
  const mobileLevelFromEnv = (import.meta as any)?.env?.VITE_MOBILE_LOG_LEVEL as Level | undefined;
  const effectiveLevel: Level = (isMobile ? (mobileLevelFromEnv || 'warn') : (levelFromEnv || (isDev ? 'info' : 'warn')));

  // Optional log forwarding for desktop dev
  const BRIDGE_ENABLED = isDev && ((import.meta as any)?.env?.VITE_LOG_BRIDGE === 'true');
  const ENDPOINT = ((import.meta as any)?.env?.VITE_LOG_BRIDGE_URL as string) || 'http://127.0.0.1:4545/log';
  let serverAvailable = true;
  const forwardCache = new Map<string, number>();
  const FORWARD_THROTTLE_MS = 5000;

  function forward(payload: any) {
    if (!BRIDGE_ENABLED || !serverAvailable) return;
    const key = JSON.stringify([payload.level, payload.args?.[0]]);
    const now = Date.now();
    const last = forwardCache.get(key) || 0;
    if (now - last < FORWARD_THROTTLE_MS) return;
    forwardCache.set(key, now);
    try {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      if ((navigator as any).sendBeacon) {
        (navigator as any).sendBeacon(ENDPOINT, blob);
      } else {
        fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {
          serverAvailable = false;
        });
      }
    } catch {
      // ignore
    }
  }

  function safeToString(x: any): string {
    try {
      if (typeof x === 'string') return x;
      if (x instanceof Error) return `${x.name}: ${x.message}\n${x.stack}`;
      return JSON.stringify(x);
    } catch {
      return String(x);
    }
  }

  if (disablePatch) {
    if (isDev) {
      console.info('Log bridge: console patch disabled by VITE_DISABLE_CONSOLE_PATCH');
    }
    return;
  }

  const original: Record<Level, (...args: any[]) => void> = {
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  const allowIndex = order.indexOf(effectiveLevel);

  // Per-level quotas per second (tighter on mobile)
  const baseQuota: Record<Level, number> = isMobile
    ? { debug: 5, info: 8, log: 10, warn: 12, error: 15 }
    : { debug: 20, info: 30, log: 40, warn: 30, error: 30 };

  const counters = new Map<Level, { used: number; suppressed: number }>();
  order.forEach(l => counters.set(l, { used: 0, suppressed: 0 }));
  let lastTick = Date.now();

  // Per-message suppression window
  const seen = new Map<string, { count: number; last: number }>();
  const SUPPRESS_WINDOW_MS = isMobile ? 2000 : 1000;

  function flushSummaries() {
    const now = Date.now();
    if (now - lastTick >= 1000) {
      order.forEach(l => {
        const c = counters.get(l)!;
        if (c.suppressed > 0 && (order.indexOf(l) >= allowIndex)) {
          original[l](`[console.${l}] ${c.suppressed} messages suppressed in last 1s`);
          c.suppressed = 0;
        }
        c.used = 0;
      });
      lastTick = now;
    }

    for (const [key, meta] of seen) {
      if (now - meta.last > SUPPRESS_WINDOW_MS * 3) {
        seen.delete(key);
      }
    }
  }
  setInterval(flushSummaries, 500);

  function shouldAllow(level: Level) {
    return order.indexOf(level) >= allowIndex;
  }

  function wrap(level: Level) {
    (console as any)[level] = (...args: any[]) => {
      if (!shouldAllow(level)) return;
      const ctr = counters.get(level)!;
      if (ctr.used >= baseQuota[level]) { ctr.suppressed++; return; }

      const key = args.map(a => typeof a === 'string' ? a : safeToString(a)).join('|');
      const meta = seen.get(key);
      const now = Date.now();
      if (meta && (now - meta.last) < SUPPRESS_WINDOW_MS) {
        meta.count++; meta.last = now; ctr.suppressed++; return;
      } else {
        if (meta && meta.count > 0) {
          original[level](`${args[0]} (+${meta.count} repeats suppressed)`);
        }
        seen.set(key, { count: 0, last: now });
      }

      if (level === 'warn' || level === 'error') {
        try { forward({ t: now, level, args: args.map(safeToString) }); } catch {}
      }

      ctr.used++;
      original[level](...args);
    };
  }

  (['debug', 'info', 'log', 'warn', 'error'] as Level[]).forEach(wrap);

  window.addEventListener('error', (e) => {
    forward({ t: Date.now(), level: 'error', msg: (e as any).message, stack: (e as any).error?.stack, src: (e as any).filename, line: (e as any).lineno, col: (e as any).colno });
  });
  window.addEventListener('unhandledrejection', (e: any) => {
    forward({ t: Date.now(), level: 'error', type: 'unhandledRejection', reason: safeToString(e.reason) });
  });

  if (isDev) {
    console.info(`Log bridge initialized (level=${effectiveLevel}, mobile=${isMobile})`);
    if (BRIDGE_ENABLED) console.info(`Log forwarding enabled -> ${ENDPOINT}`);
  }
})();