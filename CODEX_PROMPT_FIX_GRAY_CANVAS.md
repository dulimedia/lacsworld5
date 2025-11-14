# URGENT FIX: Gray Canvas Bug When Floorplan Expands

## Problem Description

When clicking "Expand Floorplan" on any suite, the 3D canvas turns completely gray. The floorplan popup opens correctly, but the 3D scene behind it disappears and shows only a gray background. This breaks the user experience.

**Screenshots provided showing the bug:**
- Before: 3D scene visible with sidebar and unit details
- After expanding floorplan: Canvas turns completely gray

## Root Cause Analysis

The issue is a **z-index layering problem**:

1. **FloorplanPopup** (src/components/FloorplanPopup.tsx line 129):
   - Has `z-50` which equals z-index: 50
   - This covers everything below it

2. **.scene-shell** (src/index.css line 132-136):
   - Has NO explicit z-index set
   - Defaults to z-index: auto (effectively 0)
   - Gets completely covered by the FloorplanPopup

3. **Result**: The popup's dark overlay (`bg-black bg-opacity-75`) blocks the canvas entirely, turning it gray.

## Solution

Add proper z-index layering to ensure the 3D canvas stays rendered behind popups.

### Implementation Steps

#### Fix 1: Add z-index to .scene-shell

**File: `src/index.css`**

Location: Line 132-136

**Current code:**
```css
.scene-shell {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
```

**Updated code:**
```css
.scene-shell {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 1; /* Ensure canvas renders above body but below UI overlays */
}
```

#### Fix 2: Verify FloorplanPopup z-index is higher

**File: `src/components/FloorplanPopup.tsx`**

Location: Line 129

**Current code** (should remain as-is):
```tsx
<div 
  className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'bg-black' : 'bg-black bg-opacity-75'}`}
```

This is correct - `z-50` (z-index: 50) is higher than the canvas z-index: 1, so it will properly overlay.

#### Fix 3: Ensure canvas stays mounted

**File: `src/App.tsx`**

Location: Around line 1391-1399

Verify that FloorplanPopup rendering doesn't unmount the canvas:

**Current code:**
```tsx
{showFloorplanPopup && floorplanPopupData && (
  <FloorplanPopup
    isOpen={showFloorplanPopup}
    onClose={handleCloseFloorplanPopup}
    floorplanUrl={floorplanPopupData.floorplanUrl}
    unitName={floorplanPopupData.unitName}
    unitData={floorplanPopupData.unitData}
  />
)}
```

This should be fine - the popup is rendered conditionally but doesn't affect the canvas. **No changes needed here.**

## Testing Checklist

After implementing the fix, verify:

1. ✅ 3D scene loads normally on page load
2. ✅ Click on any suite to open unit details
3. ✅ Click "Expand Floorplan" button
4. ✅ **CRITICAL**: 3D canvas should remain visible behind the floorplan popup (slightly darkened by overlay)
5. ✅ Floorplan popup displays correctly on top
6. ✅ Canvas controls (rotate, zoom) still visible and functional
7. ✅ Close floorplan popup - canvas should return to normal
8. ✅ Test on multiple units (F-240, F-350, M-230, etc.)
9. ✅ Test both normal and fullscreen modes of floorplan

## Expected Behavior After Fix

**Before Fix:**
- Expand floorplan → Gray canvas (bad)

**After Fix:**
- Expand floorplan → 3D scene visible behind semi-transparent black overlay (good)
- User can see both the floorplan popup AND the 3D building in the background
- Canvas continues rendering/animating in the background

## Additional Issue: Tower Building Floor Data Warnings

**Console warnings:**
```
⚠️ Tower Building unit T-100 has no floor data in CSV!
⚠️ Tower Building unit T-110 has no floor data in CSV!
... (repeats for all Tower units)
```

### Optional Fix

**File: Google Sheets**
URL: https://docs.google.com/spreadsheets/d/1ebIypJ8_c9Uv2NFqzYTh-qRP53lWFk3LIa5FL9AH9qo

Add floor data for Tower Building units in the "Floor" column:
- T-100, T-110: "First Floor" or "1"
- T-200, T-210, T-220, T-230: "Second Floor" or "2"  
- T-300, T-320, T-340: "Third Floor" or "3"
- T-400, T-410, T-420, T-430, T-450: "Fourth Floor" or "4"
- And so on...

**OR** suppress these warnings in code:

**File: `src/App.tsx`**
Location: Line 788

**Current:**
```typescript
if (!floorValue && unitData.building === 'Tower Building') {
  console.warn(`⚠️ Tower Building unit ${unitData.unit_name} has no floor data in CSV!`);
}
```

**Option 1 - Remove warning:**
```typescript
// Removed: Tower Building units don't have floor data yet
// if (!floorValue && unitData.building === 'Tower Building') {
//   console.warn(`⚠️ Tower Building unit ${unitData.unit_name} has no floor data in CSV!`);
// }
```

**Option 2 - Set default floor:**
```typescript
const floorValue = unitData.floor?.toString() || (unitData.building === 'Tower Building' ? 'Tower' : '');
```

## Priority

**CRITICAL - Fix gray canvas immediately**
- This breaks core functionality
- Users cannot view floorplans without losing the 3D scene

**LOW - Tower floor warnings**
- Just console noise, doesn't break anything
- Can be fixed later or ignored

## Files to Modify

**Required (gray canvas fix):**
1. `src/index.css` - Add z-index: 1 to .scene-shell

**Optional (suppress warnings):**
2. `src/App.tsx` - Remove or modify floor data warning (line 788-790)

## Success Criteria

When complete:
- Expanding floorplan no longer turns canvas gray
- 3D scene stays visible and animated behind all popups
- Z-index layering is correct: Canvas (z:1) < Popups (z:50)
- No visual regressions in other UI elements
- Optional: Tower Building warnings removed from console
