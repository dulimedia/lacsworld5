// Intelligent floorplan mapping service
// Maps unit names to available floorplan files with fuzzy matching

import { logger } from '../utils/logger';

interface FloorplanMapping {
  unitPattern: string;
  fileName: string;
  confidence: number;
}

// Available floorplan files (update this list when new files are added)
const AVAILABLE_FLOORPLANS = [
  // Site map for stages and production areas
  'LACS_Site Map_M1_Color_page_1.png',
  // First Street Building floorplans
  'FGFloor_LACS_page_1.png',
  'F1_Floorplan.png',
  'f10.png', 'f100.png', 'f105.png', 'f115.png', 'f140.png', 'f150.png',
  'f160.png', 'f170.png', 'f175.png', 'f180.png', 'f185.png', 'f187.png',
  'f190.png', 'f200.png', 'f240.png', 'f250.png', 'f280.png', 'f290.png',
  'f300.png', 'f330.png', 'f340.png', 'f345.png', 'f350.png', 'f360.png',
  'f363.png', 'f365.png', 'f380.png', 'm120.png', 'm130.png', 'm140.png',
  'm145.png', 'm150.png', 'm160.png', 'm170.png', 'm180.png', 'm210.png',
  'm220.png', 'm230.png', 'm240.png', 'm250.png', 'm260.png', 'm270.png',
  'm300.png', 'm320.png', 'm340.png', 'm345.png', 'm350.png', 't200.png',
  't210.png', 't220.png', 't230.png', 't310.png', 't320.png', 't340.png',
  't400.png', 't410.png', 't420.png', 't430.png', 't450.png', 't500.png', 
  't530.png', 't550.png', 't900.png', 't950.png',
  // New Tower Building colored floorplans (PNG format)
  'LACS_Floor 1_M1_Color_page_1.png',
  'LACS_Floor 2_M1_Color_page_1.png', 
  'LACS_Floor 3_Color_page_1.png',
  'LACS_Floor 4_M1_Color_page_1.png',
  'LACS_Floor 5_M1_Color_page_1.png',
  'LACS_Floor 6_M1_Color_page_1.png',
  'LACS_Floor 7_M1_Color_page_1.png',
  'LACS_Floor 8_M1_Color_page_1.png',
  'LACS_Floor 9_M1_Color_page_1.png',
  'LACS_Floor 10_M1_Color_page_1.png',
  'LACS_Floor 11_M1_Color_page_1.png',
  'LACS_Floor 12_M1_Color_page_1.png',
  // Individual tower unit floorplans
  'LACS_T-200_M1_Color_page_1.png',
  'LACS_T-210_M1_Color_page_1.png',
  'LACS_T-220_M1_Color_page_1.png',
  'LACS_T-230_M1_Color_page_1.png',
  'LACS_T-310_M1_Color_Compressed_page_1.png',
  'LACS_T-340_M1_Color_Compressed_page_1.png',
  'LACS_T-400_M1_Color_Compressed_page_1.png',
  'LACS_T-410_M1_Color_Compressed_page_1.png',
  'LACS_T-420_M1_Color_Compressed_page_1.png',
  'LACS_T-430_M1_Color_Compressed_page_1.png',
  'LACS_T-450_M1_Color_Compressed_page_1.png'
];

// Function to check if unit is a stage or production unit
export function isStageOrProductionUnit(unitName: string): boolean {
  if (!unitName) return false;
  const cleanName = cleanUnitName(unitName).toLowerCase();
  
  // Check for stage patterns
  const stagePatterns = [
    /^stage\s*[1-8a-f]?$/i,
    /^stage[1-8a-f]$/i,
    /^s[1-8a-f]$/i
  ];
  
  // Check for production patterns  
  const productionPatterns = [
    /production/i,
    /prod/i,
    /office/i
  ];
  
  const isStage = stagePatterns.some(pattern => pattern.test(cleanName));
  const isProduction = productionPatterns.some(pattern => pattern.test(cleanName));
  
  return isStage || isProduction;
}

// Clean unit name for matching (remove spaces, dashes, special chars, make lowercase)
function cleanUnitName(unitName: string): string {
  if (!unitName) return '';
  const result = unitName
    .toLowerCase()
    .replace(/[\s\-_\.]+/g, '')
    .replace(/[^a-z0-9]/g, '');
  return result;
}

// Extract number from unit name (e.g., "F-100" -> "100", "T-200" -> "200")
function extractUnitNumber(unitName: string): string | null {
  const match = unitName.match(/([a-z]?)[\-\s]*(\d+)/i);
  return match ? match[2] : null;
}

// Extract building prefix (e.g., "F-100" -> "f", "T-200" -> "t") 
function extractBuildingPrefix(unitName: string): string | null {
  const match = unitName.match(/^([a-z])/i);
  return match ? match[1].toLowerCase() : null;
}

// Tower unit to floor mapping - maps individual tower units to their floor-level floorplans
const TOWER_UNIT_FLOOR_MAPPINGS: { [key: string]: { floorFloorplan: string; individualFloorplan?: string } } = {
  // 1st Floor Tower Units
  't100': { floorFloorplan: 'LACS_Floor 1_M1_Color_page_1.png' },
  't110': { floorFloorplan: 'LACS_Floor 1_M1_Color_page_1.png' },
  
  // 2nd Floor Tower Units
  't200': { floorFloorplan: 'LACS_Floor 2_M1_Color_page_1.png', individualFloorplan: 'LACS_T-200_M1_Color_page_1.png' },
  't210': { floorFloorplan: 'LACS_Floor 2_M1_Color_page_1.png', individualFloorplan: 'LACS_T-210_M1_Color_page_1.png' },
  't220': { floorFloorplan: 'LACS_Floor 2_M1_Color_page_1.png', individualFloorplan: 'LACS_T-220_M1_Color_page_1.png' },
  't230': { floorFloorplan: 'LACS_Floor 2_M1_Color_page_1.png', individualFloorplan: 'LACS_T-230_M1_Color_page_1.png' },
  
  // 3rd Floor Tower Units  
  't300': { floorFloorplan: 'LACS_Floor 3_Color_page_1.png' },
  't310': { floorFloorplan: 'LACS_Floor 3_Color_page_1.png', individualFloorplan: 'LACS_T-310_M1_Color_Compressed_page_1.png' },
  't320': { floorFloorplan: 'LACS_Floor 3_Color_page_1.png' },
  't340': { floorFloorplan: 'LACS_Floor 3_Color_page_1.png', individualFloorplan: 'LACS_T-340_M1_Color_Compressed_page_1.png' },
  
  // 4th Floor Tower Units
  't400': { floorFloorplan: 'LACS_Floor 4_M1_Color_page_1.png', individualFloorplan: 'LACS_T-400_M1_Color_Compressed_page_1.png' },
  't410': { floorFloorplan: 'LACS_Floor 4_M1_Color_page_1.png', individualFloorplan: 'LACS_T-410_M1_Color_Compressed_page_1.png' },
  't420': { floorFloorplan: 'LACS_Floor 4_M1_Color_page_1.png', individualFloorplan: 'LACS_T-420_M1_Color_Compressed_page_1.png' },
  't430': { floorFloorplan: 'LACS_Floor 4_M1_Color_page_1.png', individualFloorplan: 'LACS_T-430_M1_Color_Compressed_page_1.png' },
  't450': { floorFloorplan: 'LACS_Floor 4_M1_Color_page_1.png', individualFloorplan: 'LACS_T-450_M1_Color_Compressed_page_1.png' },
  
  // 5th Floor Tower Units
  't500': { floorFloorplan: 'LACS_Floor 5_M1_Color_page_1.png' },
  't530': { floorFloorplan: 'LACS_Floor 5_M1_Color_page_1.png' },
  't550': { floorFloorplan: 'LACS_Floor 5_M1_Color_page_1.png' },
  
  // 6th Floor Tower Units  
  't600': { floorFloorplan: 'LACS_Floor 6_M1_Color_page_1.png' },
  
  // 7th Floor Tower Units
  't700': { floorFloorplan: 'LACS_Floor 7_M1_Color_page_1.png' },
  
  // 8th Floor Tower Units
  't800': { floorFloorplan: 'LACS_Floor 8_M1_Color_page_1.png' },
  
  // 9th Floor Tower Units
  't900': { floorFloorplan: 'LACS_Floor 9_M1_Color_page_1.png' },
  't950': { floorFloorplan: 'LACS_Floor 9_M1_Color_page_1.png' },
  
  // 10th Floor Tower Units
  't1000': { floorFloorplan: 'LACS_Floor 10_M1_Color_page_1.png' },
  
  // 11th Floor Tower Units
  't1100': { floorFloorplan: 'LACS_Floor 11_M1_Color_page_1.png' },
  
  // 12th Floor Tower Units
  't1200': { floorFloorplan: 'LACS_Floor 12_M1_Color_page_1.png' }
};

// Special mappings for units that don't follow normal patterns
const SPECIAL_MAPPINGS: { [key: string]: string } = {
  'et lab': 'mg floorplan.jpg',
  'etlab': 'mg floorplan.jpg',
  'studio o.m.': 'mg floorplan.jpg',
  'studio o.m': 'mg floorplan.jpg',
  'studioom': 'mg floorplan.jpg',
  'club 76': 'FGFloor_LACS_page_1.png',
  'club76': 'FGFloor_LACS_page_1.png',
  // Maryland Building Ground Floor units use the mg floorplan
  'm20': 'mg-floorplan.png',
  'm40': 'mg-floorplan.png', 
  'm45': 'mg-floorplan.png',
  'm50': 'mg-floorplan.png',
  // First Street Building 1st floor units use F1_Floorplan.png fallback
  'f110': 'F1_Floorplan.png',
  'f110cr': 'F1_Floorplan.png',
  'f120': 'F1_Floorplan.png',
  'f130': 'F1_Floorplan.png',
  // All First Street Building Ground Floor units use the same floorplan
  'f10': 'FGFloor_LACS_page_1.png',
  'f15': 'FGFloor_LACS_page_1.png',
  'f20': 'FGFloor_LACS_page_1.png',
  'f25': 'FGFloor_LACS_page_1.png',
  'f30': 'FGFloor_LACS_page_1.png',
  'f35': 'FGFloor_LACS_page_1.png',
  'f40': 'FGFloor_LACS_page_1.png',
  'f50': 'FGFloor_LACS_page_1.png',
  'f60': 'FGFloor_LACS_page_1.png',
  'f70': 'FGFloor_LACS_page_1.png',
  'fglibrary': 'FGFloor_LACS_page_1.png',
  'fgrestroom': 'FGFloor_LACS_page_1.png',
  // All stages (1-8, A-F) use the site map
  'stage 1': 'LACS_Site Map_M1_Color_page_1.png',
  'stage1': 'LACS_Site Map_M1_Color_page_1.png',
  'stage 2': 'LACS_Site Map_M1_Color_page_1.png',
  'stage2': 'LACS_Site Map_M1_Color_page_1.png',
  'stage 3': 'LACS_Site Map_M1_Color_page_1.png',
  'stage3': 'LACS_Site Map_M1_Color_page_1.png',
  'stage 4': 'LACS_Site Map_M1_Color_page_1.png',
  'stage4': 'LACS_Site Map_M1_Color_page_1.png',
  'stage 5': 'LACS_Site Map_M1_Color_page_1.png',
  'stage5': 'LACS_Site Map_M1_Color_page_1.png',
  'stage 6': 'LACS_Site Map_M1_Color_page_1.png',
  'stage6': 'LACS_Site Map_M1_Color_page_1.png',
  'stage 7': 'LACS_Site Map_M1_Color_page_1.png',
  'stage7': 'LACS_Site Map_M1_Color_page_1.png',
  'stage 8': 'LACS_Site Map_M1_Color_page_1.png',
  'stage8': 'LACS_Site Map_M1_Color_page_1.png',
  'stage a': 'LACS_Site Map_M1_Color_page_1.png',
  'stagea': 'LACS_Site Map_M1_Color_page_1.png',
  'stage b': 'LACS_Site Map_M1_Color_page_1.png',
  'stageb': 'LACS_Site Map_M1_Color_page_1.png',
  'stage c': 'LACS_Site Map_M1_Color_page_1.png',
  'stagec': 'LACS_Site Map_M1_Color_page_1.png',
  'stage d': 'LACS_Site Map_M1_Color_page_1.png',
  'staged': 'LACS_Site Map_M1_Color_page_1.png',
  'stage e': 'LACS_Site Map_M1_Color_page_1.png',
  'stagee': 'LACS_Site Map_M1_Color_page_1.png',
  'stage f': 'LACS_Site Map_M1_Color_page_1.png',
  'stagef': 'LACS_Site Map_M1_Color_page_1.png',
  
  // Production houses and offices use the site map
  'production office': 'LACS_Site Map_M1_Color_page_1.png',
  'productionoffice': 'LACS_Site Map_M1_Color_page_1.png',
  'production house': 'LACS_Site Map_M1_Color_page_1.png',
  'productionhouse': 'LACS_Site Map_M1_Color_page_1.png',
  'prod office': 'LACS_Site Map_M1_Color_page_1.png',
  'prodoffice': 'LACS_Site Map_M1_Color_page_1.png',
  'prod house': 'LACS_Site Map_M1_Color_page_1.png',
  'prodhouse': 'LACS_Site Map_M1_Color_page_1.png',
  // Additional production variations
  'production': 'LACS_Site Map_M1_Color_page_1.png',
  'prod': 'LACS_Site Map_M1_Color_page_1.png',
  'production office 1': 'LACS_Site Map_M1_Color_page_1.png',
  'production office 2': 'LACS_Site Map_M1_Color_page_1.png',
  'production office 3': 'LACS_Site Map_M1_Color_page_1.png',
  'production office 4': 'LACS_Site Map_M1_Color_page_1.png',
  'production office 5': 'LACS_Site Map_M1_Color_page_1.png',
  'production office 6': 'LACS_Site Map_M1_Color_page_1.png',
  'productionoffice1': 'LACS_Site Map_M1_Color_page_1.png',
  'productionoffice2': 'LACS_Site Map_M1_Color_page_1.png',
  'productionoffice3': 'LACS_Site Map_M1_Color_page_1.png',
  'productionoffice4': 'LACS_Site Map_M1_Color_page_1.png',
  'productionoffice5': 'LACS_Site Map_M1_Color_page_1.png',
  'productionoffice6': 'LACS_Site Map_M1_Color_page_1.png'
};

// Check if unit is a First Street Building ground floor unit
export function isFifthStreetGroundFloorUnit(unitName: string): boolean {
  if (!unitName) return false;
  const cleanName = cleanUnitName(unitName);
  
  // All F-## units that are ground floor units
  const groundFloorUnits = [
    'f10', 'f15', 'f20', 'f25', 'f30', 'f35', 'f40', 'f50', 'f60', 'f70',
    'club76', 'fglibrary', 'fgrestroom'
  ];
  
  const isGroundFloor = groundFloorUnits.includes(cleanName) || cleanName.includes('club76');
  return isGroundFloor;
}

// Check if unit is a tower unit with individual floorplan
export function isTowerUnit(unitName: string): boolean {
  if (!unitName) return false;
  const cleanName = cleanUnitName(unitName);
  return TOWER_UNIT_FLOOR_MAPPINGS.hasOwnProperty(cleanName);
}

// Get tower unit floorplan mapping (returns both floor and individual floorplans)
export function getTowerUnitFloorplans(unitName: string): { floorFloorplan: string; individualFloorplan?: string } | null {
  if (!unitName) return null;
  const cleanName = cleanUnitName(unitName);
  return TOWER_UNIT_FLOOR_MAPPINGS[cleanName] || null;
}

// Get floor-level floorplan for tower unit (main floorplan to show by default)
export function getTowerUnitFloorFloorplan(unitName: string): string | null {
  const mapping = getTowerUnitFloorplans(unitName);
  return mapping ? mapping.floorFloorplan : null;
}

// Get individual unit floorplan for tower unit (for side navigation)
export function getTowerUnitIndividualFloorplan(unitName: string): string | null {
  const mapping = getTowerUnitFloorplans(unitName);
  return mapping ? mapping.individualFloorplan || null : null;
}

// Find floorplan with intelligent matching
export function findFloorplanForUnit(unitName: string, unitData?: any): string | null {
  // Validate inputs
  if (!unitName && !unitData) {
    return null;
  }
  
  // Check First Street Building ground floor units FIRST (highest priority)
  if (isFifthStreetGroundFloorUnit(unitName)) {
    const floorplanPath = `floorplans/converted/FGFloor_LACS_page_1.png`;
    return floorplanPath;
  }

  // Check special mappings SECOND (high priority - overrides CSV data)
  const cleanName = cleanUnitName(unitName);
  if (cleanName && SPECIAL_MAPPINGS[cleanName]) {
    return `floorplans/converted/${SPECIAL_MAPPINGS[cleanName]}`;
  }
  
  // Check tower unit mappings THIRD (high priority - override existing floorplan_url for tower units)
  const towerFloorplan = getTowerUnitFloorFloorplan(unitName);
  if (towerFloorplan) {
    return `floorplans/converted/${towerFloorplan}`;
  }
  
  // Check stage/production unit mappings FOURTH (high priority - use site map for all stages and production)
  if (isStageOrProductionUnit(unitName)) {
    return `floorplans/converted/LACS_Site Map_M1_Color_page_1.png`;
  }
  
  // If no unit name provided, can't do matching
  if (!unitName) {
    return null;
  }

  // Try direct matching approaches in order of confidence (BEFORE checking CSV)
  const mappings: FloorplanMapping[] = [];
  
  const buildingPrefix = extractBuildingPrefix(unitName);
  const unitNumber = extractUnitNumber(unitName);

  // 1. Exact clean match (highest confidence)
  for (const fileName of AVAILABLE_FLOORPLANS) {
    const fileBase = fileName.replace(/\.(jpg|png|webp)$/, '');
    if (cleanName === fileBase) {
      mappings.push({ unitPattern: unitName, fileName, confidence: 1.0 });
    }
  }

  // 2. Building prefix + number match (high confidence)
  if (buildingPrefix && unitNumber) {
    // Only use PNG - highest quality format
    const targetFilePng = `${buildingPrefix}${unitNumber}.png`;
    
    if (AVAILABLE_FLOORPLANS.includes(targetFilePng)) {
      mappings.push({ unitPattern: unitName, fileName: targetFilePng, confidence: 0.95 });
    }
  }

  // 3. Number-only match within same building (medium confidence)
  if (unitNumber && buildingPrefix) {
    for (const fileName of AVAILABLE_FLOORPLANS) {
      if (fileName.startsWith(buildingPrefix) && fileName.includes(unitNumber)) {
        mappings.push({ unitPattern: unitName, fileName, confidence: 0.7 });
      }
    }
  }

  // 4. Partial number match (e.g., F-15 -> f150.jpg, f10.jpg -> F-10) (lower confidence)
  if (unitNumber) {
    for (const fileName of AVAILABLE_FLOORPLANS) {
      const fileNumber = fileName.match(/(\d+)/)?.[1];
      if (fileNumber) {
        // Check if unit number is a prefix or suffix of file number
        if (fileNumber.startsWith(unitNumber) || unitNumber.startsWith(fileNumber)) {
          mappings.push({ unitPattern: unitName, fileName, confidence: 0.5 });
        }
      }
    }
  }

  // Return the highest confidence match
  if (mappings.length > 0) {
    const bestMatch = mappings.sort((a, b) => b.confidence - a.confidence)[0];
    return `floorplans/converted/${bestMatch.fileName}`;
  }

  // CSV fallback - ONLY if intelligent mapping found nothing
  if (unitData?.floorplan_url && unitData.floorplan_url.trim()) {
    let path = unitData.floorplan_url.trim();
    const originalPath = path;
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    // Fix extension if CSV has wrong extension - convert all to PNG
    const beforeCorrection = path;
    path = path.replace(/\.jpg$/, '.png').replace(/\.jpeg$/, '.png').replace(/\.webp$/, '.png');
    if (beforeCorrection !== path) {
    }
    return path;
  }

  // Final fallback: First Street Building 1st floor units (F-1xx) use F1_Floorplan.png
  if (buildingPrefix === 'f' && unitNumber && unitNumber.startsWith('1')) {
    return `floorplans/converted/F1_Floorplan.png`;
  }

  logger.warn('FLOORPLAN', '❌', `No floorplan found for: ${unitName}`);
  return null;
}

// Get floorplan URL for a unit (main export function)
export function getFloorplanUrl(unitName: string, unitData?: any): string | null {
  const result = findFloorplanForUnit(unitName, unitData);
  return result;
}

// Batch update function to get all mappings for debugging
export function getAllFloorplanMappings(): { [unitName: string]: string | null } {
  // Common unit patterns to test
  const testUnits = [
    'F-100', 'F-105', 'F-110 CR', 'F-115', 'F-140', 'F-150', 'F-160', 'F-170',
    'F-175', 'F-180', 'F-200', 'F-240', 'F-250', 'F-280', 'F-290', 'F-10', 'F-15',
    'M-120', 'M-130', 'M-140', 'M-150', 'M-160', 'T-200', 'T-210', 'T-220', 'T-300'
  ];
  
  const mappings: { [unitName: string]: string | null } = {};
  for (const unitName of testUnits) {
    mappings[unitName] = getFloorplanUrl(unitName);
  }
  
  return mappings;
}