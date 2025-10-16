# Mobile Scene Alignment & Beveled Shell Implementation Guide

This document captures the exact code changes required to make the mobile 3D scene occupy the full safe viewport, remove the white gutters, and introduce beveled shell edges as referenced in the QA screenshot.

## 1. Create a dedicated viewport shell in `src/App.tsx`

1. Locate the root `<div>` returned from `App` (currently styled with an inline `height: '100vh'` and `position: 'fixed'`).
2. Replace the inline style object with a class name so that we can use responsive-safe-area rules. Wrap the 3D canvas area in a new `<div className="scene-shell">` container that will control the border radius and clipping:

```tsx
return (
  <SafariErrorBoundary>
    <div className="app-viewport">
      <div className="app-layout">
        <div className="scene-shell">
          <Canvas ... />
          {/* overlays remain inside */}
        </div>
        {/* existing drawers, popovers, etc. */}
      </div>
      {/* request + popup components */}
    </div>
  </SafariErrorBoundary>
);
```

3. Move the previous inline style attributes into the new CSS classes defined in the next section.
4. Ensure `Canvas` keeps `style={{ width: '100%', height: '100%', display: 'block' }}` so it fills the beveled shell with no overflow.
5. For the overlays that were absolutely positioned relative to the old flex container, keep them inside `.scene-shell` (they already use `fixed`, so no change is needed).

## 2. Add safe-area aware styling in `src/index.css`

Append the following rules near the bottom of `src/index.css` so that the shell consumes the full viewport on iOS and other mobile browsers while providing the desired beveled frame:

```css
html, body {
  height: 100%;
  background: #e7ebf0; /* prevent white gutters behind rounded shell */
}

.app-viewport {
  position: fixed;
  inset: 0;
  min-height: 100dvh;
  width: 100vw;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  display: flex;
  justify-content: center;
  align-items: center;
  background: radial-gradient(circle at top, #f6f7fb 0%, #d5dde7 100%);
}

.app-layout {
  flex: 1;
  max-width: 100%;
  display: flex;
  flex-direction: column;
}

.scene-shell {
  position: relative;
  flex: 1;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.22);
  background: linear-gradient(180deg, #cdd7e3 0%, #b8c4d2 100%);
}

.scene-shell canvas {
  display: block;
  width: 100%;
  height: 100%;
}

@supports (-webkit-touch-callout: none) {
  /* ensure older Safari expands to the dynamic viewport */
  .app-viewport {
    min-height: -webkit-fill-available;
  }
}
```

## 3. Respect safe-area padding for floating controls

1. For each mobile `fixed` control group in `src/App.tsx` (top buttons and bottom `NavigationControls`), add inline `style` paddings that use `env(safe-area-inset-*)` to prevent content from hugging the rounded edge:

```tsx
<div
  className="fixed top-6 left-6 right-6 z-40 flex justify-between items-start"
  style={{
    paddingTop: 'env(safe-area-inset-top)',
    paddingLeft: 'env(safe-area-inset-left)',
    paddingRight: 'env(safe-area-inset-right)'
  }}
>
  ...
</div>

<div
  className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40"
  style={{
    paddingBottom: 'env(safe-area-inset-bottom)'
  }}
>
  <NavigationControls ... />
</div>
```

2. Repeat the same pattern for the desktop layout wrappers if you want consistent behavior when the window is resized to tablet widths.

## 4. Verify the outcome

1. Run `npm run dev` and open the site in iOS Safari or Chrome responsive mode.
2. Confirm the white gutters are gone—the canvas should now clip to the rounded shell and the body background should not show through.
3. Check that the beveled corners look correct and that overlay components (drawers, popups, navigation controls) no longer bleed outside the radius.
4. Adjust the `border-radius` value in `.scene-shell` to match the desired curvature (20px–28px works well for the provided mockup).

Following these steps will align the 3D scene with the available mobile viewport, eliminate the white borders, and present the experience within a smooth beveled container.
