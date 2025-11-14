# Claude Code Instructions for LACSWORLD2

## Starting the Development Server

**IMPORTANT: Always run npm commands from Windows CMD/PowerShell, NOT from WSL/Linux terminal.**

### Quick Start
```cmd
cd C:\Users\drews\2026_lacs\LACSWORLD2
npm run dev
```

Then access: **http://localhost:20500**

## Port Configuration
- Default dev server port: **20500** (configured in vite.config.ts)
- Do NOT use port 5173 or just "localhost" without the port number

## Troubleshooting "Connection Refused" Errors

### Problem: Browser shows `ERR_CONNECTION_REFUSED`

**Root Causes:**
1. Dev server is not running
2. Corrupted node_modules (especially Rollup native binaries)
3. Accessing wrong port

**Solution:**
```cmd
cd C:\Users\drews\2026_lacs\LACSWORLD2
rmdir /s /q node_modules
del package-lock.json
npm install
npm run dev
```

Access at: **http://localhost:20500**

## Environment Requirements

### Node Version
- **Current:** Node v18.15.0 (too old)
- **Required:** Node 20.19.0 or higher
- **Reason:** Dependencies like Cesium, jsdom require Node 20+

### Platform Notes
- This project is in a Windows directory (`C:\Users\drews\2026_lacs\LACSWORLD2`)
- Accessed via WSL2 at `/mnt/c/Users/drews/2026_lacs/LACSWORLD2`
- **CRITICAL:** npm operations must run from Windows, not WSL
- **Why:** WSL file operations on `/mnt/c/` are slow and can corrupt native binaries

## Common Commands

### Start Dev Server
```cmd
npm run dev
```

### Build for Production
```cmd
npm run build
```

### Preview Production Build
```cmd
npm run start
```

## Known Issues

1. **Rollup native binary errors** - Caused by installing from WSL instead of Windows
2. **Node version warnings** - Update to Node 20+ to resolve dependency warnings
3. **Slow file operations** - Always use Windows CMD for file-heavy operations (npm install, etc.)
