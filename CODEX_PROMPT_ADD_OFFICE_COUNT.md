# Implementation Task: Add Private Offices Count to Suite Details

## Objective
Add a new data field "Private Offices" to the application that displays the number of individual closed-door offices in each suite. This data is already available in Column J of the Google Sheets CSV (row['Private Offices']).

## Background
We've analyzed all suite floorplans and counted individual closed-door offices. The counts are now in Column J of the Google Sheets:
- Google Sheets URL: https://docs.google.com/spreadsheets/d/1ebIypJ8_c9Uv2NFqzYTh-qRP53lWFk3LIa5FL9AH9qo
- Column J header: "Private Offices"
- Values: Numbers (0-15) representing count of individual offices with doors
- Updated CSV also saved locally: `public/floorplans/converted/lacs_sheets_with_offices.csv`

## Implementation Steps

### 1. Update TypeScript Type Definitions

**File: `src/types.ts`**

Add `private_offices` field to the `UnitData` interface:

```typescript
export interface UnitData {
  name: string;
  size: string;
  availability: boolean;
  floorPlanUrl?: string;
  unit_name: string;
  unit_key: string;
  building: string;
  floor: string;
  area_sqft: number;
  status: boolean;
  unit_type: string;
  kitchen_size?: string;
  height?: string;
  private_offices?: number;  // NEW: Number of individual closed-door offices
}
```

**File: `src/store/exploreState.ts`**

Add `private_offices` field to the `UnitRecord` interface:

```typescript
export interface UnitRecord {
  unit_key: string;
  building: string;
  floor: string;
  unit_name: string;
  status: UnitStatus;
  area_sqft?: number;
  price_per_sqft?: number;
  lease_term?: string;
  floorplan_url?: string;
  thumbnail_url?: string;
  node_name?: string;
  recipients: string[];
  notes?: string;
  kitchen_size?: string;
  unit_type?: string;
  private_offices?: number;  // NEW: Number of individual closed-door offices
}
```

### 2. Update CSV Data Parsing

**File: `src/hooks/useCsvUnitData.ts`**

Location: Around line 88-111, in the `Papa.parse` complete callback where `unitDataEntry` is created.

Add parsing for the "Private Offices" column:

```typescript
const unitDataEntry = {
  name: unitName,
  availability: isAvailable,
  size: row['Square Feet'] || row.Size_RSF || row.Size,
  floorPlanUrl: floorplanUrl,
  floorplan_url: floorplanUrl,
  unit_name: unitName,
  unit_key: unitNameLower,
  building: row.Building,
  floor: row.Floor || '',
  area_sqft: (() => {
    const rawSize = row['Square Feet'] || row.Size_RSF || row.Size || '';
    const cleanSize = rawSize.replace(/[,\s]/g, '').replace(/RSF/gi, '').replace(/sf/gi, '').replace(/[A-Za-z]/g, '');
    const parsed = parseInt(cleanSize);
    return parsed > 0 ? parsed : undefined;
  })(),
  status: isAvailable,
  unit_type: row.Type || row.Unit_Type || 'Commercial',
  kitchen_size: row.Kitchen || row.Kitchen_Size || 'None',
  height: row.Height || '',
  amenities: row.Amenities || 'Central Air',
  // NEW: Parse Private Offices column
  private_offices: (() => {
    const officeCount = row['Private Offices'];
    if (!officeCount || officeCount === '') return undefined;
    const parsed = parseInt(officeCount);
    return !isNaN(parsed) && parsed >= 0 ? parsed : undefined;
  })()
};
```

### 3. Display in Unit Details Popup

**File: `src/components/UnitDetailsPopup.tsx`**

Location: Around line 205-210, after the area_sqft display block.

Add a new detail row to display the office count:

```tsx
{/* Existing Square Feet display */}
{(displayUnit.area_sqft || displayUnit.size) && (
  <div className="flex items-center gap-3 text-gray-700">
    <Square className="w-5 h-5 text-blue-500 flex-shrink-0" />
    <div>
      <div className="text-sm text-gray-500">Square Feet</div>
      <div className="font-medium">
        {displayUnit.area_sqft ? 
          `${displayUnit.area_sqft.toLocaleString()} sq ft` :
          displayUnit.size}
      </div>
    </div>
  </div>
)}

{/* NEW: Private Offices display */}
{displayUnit.private_offices !== undefined && displayUnit.private_offices !== null && (
  <div className="flex items-center gap-3 text-gray-700">
    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
    <div>
      <div className="text-sm text-gray-500">Private Offices</div>
      <div className="font-medium">
        {displayUnit.private_offices === 0 
          ? 'Open Floor Plan' 
          : `${displayUnit.private_offices} ${displayUnit.private_offices === 1 ? 'Office' : 'Offices'}`}
      </div>
    </div>
  </div>
)}
```

### 4. Optional: Add to Explore Units Panel

**File: `src/ui/ExploreUnitsPanel.tsx`**

If you want to show office count in the units list, add it to the unit row display (this is optional).

## Testing Checklist

After implementation, verify:

1. ✅ TypeScript compiles without errors
2. ✅ CSV data loads correctly with "Private Offices" column
3. ✅ Unit details popup shows office count for units with offices
4. ✅ Units with 0 offices display "Open Floor Plan"
5. ✅ Units with 1 office show "1 Office" (singular)
6. ✅ Units with multiple offices show "X Offices" (plural)
7. ✅ Units without office data don't show the field at all

## Example Expected Output

**Suite F-350** (10 offices):
- Square Feet: 3,535 sq ft
- **Private Offices: 10 Offices** ← NEW

**Suite F-300** (0 offices):
- Square Feet: 2,856 sq ft  
- **Private Offices: Open Floor Plan** ← NEW

**Stage A** (0 offices):
- Square Feet: 2,500 sq ft
- **Private Offices: Open Floor Plan** ← NEW

## Data Reference

Sample office counts from the CSV:
- F-350: 10 offices
- M-230: 15 offices (highest)
- M-350: 12 offices
- F-200: 8 offices
- F-250: 6 offices
- F-10: 3 offices
- Most Tower units (T-*): 0 offices (open filming locations)
- All Stages: 0 offices

## Important Notes

1. **Do NOT change any existing fields or data structures** - only add the new `private_offices` field
2. **Do NOT modify the Google Sheets order or other columns** - only read Column J
3. **Handle missing data gracefully** - if office count is blank/null, don't display the field
4. **Use the existing Google Sheets CSV URL** - it already has the Private Offices column
5. The CSV parsing already handles the Google Sheets format correctly

## Files to Modify

1. `src/types.ts` - Add field to UnitData interface
2. `src/store/exploreState.ts` - Add field to UnitRecord interface  
3. `src/hooks/useCsvUnitData.ts` - Parse Private Offices column from CSV
4. `src/components/UnitDetailsPopup.tsx` - Display office count in UI

## Success Criteria

When complete, users should be able to:
- View the number of private offices for any suite in the unit details popup
- See "Open Floor Plan" for suites with 0 offices
- See proper singular/plural formatting ("1 Office" vs "5 Offices")
- Have this data automatically update when the Google Sheet is updated
