# FIX: Prevent Canvas Resize When Floorplan Popup Opens

## Problem
The 3D canvas turns gray when expanding floorplan even with z-index: 1 applied. 

**Root cause**: The canvas is being **resized** when the popup opens, causing WebGL to lose context and turn gray.

## Solution
The FloorplanPopup should be a **pure overlay** that doesn't trigger any canvas resize events. The popup is already `position: fixed` so it shouldn't affect layout, but we need to ensure NO resize events fire.

## Implementation

### Step 1: Prevent resize trigger in FloorplanPopup

**File: `src/components/FloorplanPopup.tsx`**

Add a flag to prevent window resize events when popup opens.

**Add after line 47:**

```typescript
// Prevent canvas resize when popup opens
useEffect(() => {
  if (isOpen) {
    // Store original handler
    const originalOnResize = window.onresize;
    
    // Disable resize events temporarily
    window.onresize = null;
    
    return () => {
      // Restore original handler when closed
      window.onresize = originalOnResize;
    };
  }
}, [isOpen]);
```

### Step 2: Lock canvas dimensions when popup is open

**File: `src/App.tsx`**

Location: Find where `showFloorplanPopup` state changes (around line 975, 979)

**Add this useEffect after the existing floorPlanExpanded effect (around line 709):**

```typescript
// Lock canvas size when floorplan popup is open (prevent gray flash)
useEffect(() => {
  const canvas = document.querySelector('.scene-shell canvas') as HTMLCanvasElement;
  
  if (showFloorplanPopup && canvas) {
    // Lock current dimensions
    const currentWidth = canvas.width;
    const currentHeight = canvas.height;
    const currentStyle = canvas.style.cssText;
    
    // Prevent any resizing
    canvas.style.width = `${canvas.offsetWidth}px`;
    canvas.style.height = `${canvas.offsetHeight}px`;
    
    return () => {
      // Restore original styling when popup closes
      canvas.style.cssText = currentStyle;
      // Trigger one resize to fix dimensions
      window.dispatchEvent(new Event('resize'));
    };
  }
}, [showFloorplanPopup]);
```

### Step 3: Remove floorplan-expanded canvas resize

**File: `src/index.css`**

Location: Line 219

**Comment out or remove this block:**

```css
/* DISABLED: Prevents canvas resize when floorplan popup opens
body.sidebar-open.floorplan-expanded {
  --scene-offset: 0px;
  --scene-left: 0px;
  --scene-right: 0px;
  --scene-width: 100vw;
}
*/
```

### Step 4: Ensure FloorplanPopup is truly fixed overlay

**File: `src/components/FloorplanPopup.tsx`**

Line 129 - verify the className includes `pointer-events-auto`:

**Change:**
```tsx
<div 
  className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'bg-black' : 'bg-black bg-opacity-75'}`}
```

**To:**
```tsx
<div 
  className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-auto ${isFullscreen ? 'bg-black' : 'bg-black bg-opacity-75'}`}
```

And ensure the popup doesn't dispatch resize events:

**Add before line 134:**
```tsx
onClick={(e) => {
  // Prevent any propagation that might trigger canvas handlers
  e.stopPropagation();
}}
```

## Alternative Simpler Fix

If the above doesn't work, the simplest solution is to **completely isolate** the popup from the DOM flow:

**File: `src/components/FloorplanPopup.tsx`**

Line 128-134, wrap the return in a Portal to render outside the app:

```tsx
import ReactDOM from 'react-dom';

// ... existing code ...

if (!isOpen) return null;

return ReactDOM.createPortal(
  <div 
    className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-auto ${isFullscreen ? 'bg-black' : 'bg-black bg-opacity-75'}`}
    style={{ isolation: 'isolate' }}
    onClick={(e) => e.stopPropagation()}
  >
    {/* ... rest of popup content ... */}
  </div>,
  document.body
);
```

## Testing

1. ✅ Start dev server
2. ✅ Open any suite details
3. ✅ Click "Expand Floorplan"
4. ✅ **Canvas should NOT resize** - check dev tools to confirm canvas dimensions stay constant
5. ✅ Canvas should remain visible (darkened by overlay)
6. ✅ Close popup - canvas should still work
7. ✅ No gray flash at any point

## Why This Works

The gray flash happens because:
1. Popup opens → DOM layout shifts
2. Canvas resize event fires
3. WebGL loses context during resize
4. Canvas redraws with empty/gray buffer

By **preventing the resize event**, the canvas keeps its WebGL context and continues rendering normally under the overlay.

## Files to Modify

1. `src/components/FloorplanPopup.tsx` - Add resize prevention + portal
2. `src/App.tsx` - Add canvas dimension lock effect
3. `src/index.css` - Remove floorplan-expanded canvas resize (line 219)

## Success Criteria

- Expanding floorplan: NO gray flash
- Canvas dimensions: UNCHANGED when popup opens
- WebGL context: MAINTAINED throughout
- Popup: Renders correctly as overlay on z-50
