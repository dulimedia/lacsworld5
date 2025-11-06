# UI Auditor - Automated Layout Testing

## Overview
Automated headless browser testing to catch UI alignment issues before they reach production.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Playwright (one-time)
```bash
# Install Playwright
npm install --save-dev @playwright/test

# Install browsers (requires sudo on Linux/WSL)
npx playwright install chromium

# On WSL/Linux, install system dependencies:
sudo npx playwright install-deps
```

## Usage

### Run Full Audit
```bash
npm run audit:ui
```

This will:
1. Build the production app (`npm run build`)
2. Start the preview server
3. Run all UI tests
4. Generate reports in `ui-auditor/artifacts/`

### Run Tests Only (skip build)
```bash
npm run test:ui
```

### View Results
- **Screenshots**: `ui-auditor/artifacts/*.png`
- **Measurements**: `ui-auditor/artifacts/*.json`
- **Summary**: `ui-auditor/artifacts/summary.json`
- **HTML Report**: `ui-auditor/report/index.html`

## What It Tests

### Desktop States (1440x900)
1. **Collapsed** - Sidebar minimized (48px visible)
2. **Open** - Sidebar expanded (320px)
3. **Expanded** - Floorplan view (640px)
4. **Loading** - Initial load screen

### Measurements Per State
- ✅ CSS variables match reality (`--scene-left`: 48/320/640px)
- ✅ Scene frame positioning (no gaps > 2px)
- ✅ Canvas fills frame completely
- ✅ Toggle button aligned with frame edge (±24px tolerance)
- ✅ No layout transitions on key nodes
- ✅ Border radius applied correctly
- ✅ Loader visuals (size, centering, z-index)

### Failure Conditions
- CSS variable mismatch
- Frame gaps > 2px
- Toggle button outside valid range
- Layout transitions detected
- Loader size/position issues

## CI Integration

The `.github/workflows/ui-audit.yml` workflow runs on every push/PR:
- Builds the app
- Runs all tests
- Uploads artifacts
- Fails PR if tests don't pass

## Troubleshooting

### "Host system is missing dependencies"
On WSL/Linux:
```bash
sudo npx playwright install-deps
```

Or manually install:
```bash
sudo apt-get install libnspr4 libnss3 libasound2t64
```

### Preview server won't start
Make sure port 4173 is available:
```bash
lsof -ti:4173 | xargs kill -9
```

### Tests timing out
Increase timeout in `playwright.config.ts`:
```typescript
timeout: 60_000  // 60 seconds
```

## Extending Tests

Add new checks in `ui-auditor/tests/ui.spec.ts`:

```typescript
test('My custom check', async ({ page }) => {
  await page.goto('/');
  const element = await page.locator('.my-element');
  expect(await element.boundingBox()).toBeTruthy();
});
```

## Visual Regression (Optional)

To add pixel-perfect visual diffs:

```bash
npm install --save-dev @percy/cli @percy/playwright
```

Then wrap tests:
```bash
percy exec -- npm run audit:ui
```
