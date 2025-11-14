export type WarehouseSection = 'roof' | 'panels' | 'flooring';

// New types for unit-based system
export type UnitName = string; // e.g., 'a1', 'c10'

export interface UnitData {
  name: string; // Unit identifier (e.g., 'a1')
  size: string; // Size from Google Sheets
  availability: boolean; // Availability status as boolean
  floorPlanUrl?: string; // Optional floor plan image
  // Additional fields for the app
  unit_name: string; // Display name
  unit_key: string; // Unique identifier
  building: string; // Building name
  floor: string; // Floor number/name
  area_sqft: number; // Square footage
  status: boolean; // Availability status as boolean
  unit_type: string; // Suite, Stage, etc.
  kitchen_size?: string; // Kitchen size
  height?: string; // Max height for stages and other units
  private_offices?: number; // Number of individual closed-door offices
}

export interface LoadedModel {
  name: string;
  object: any; // THREE.Group - using any to avoid THREE import issues
  isUnit: boolean;
  isBridge: boolean;
}

// Keep existing interfaces for backwards compatibility
export interface SectionInfo {
  title: string;
  description: string;
  details: {
    size: string;
    capacity: string;
    features: string[];
  };
  imageUrl: string;
}

export interface WarehouseSectionProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color: string;
  highlightColor: string;
  name: WarehouseSection;
  onSelect: (name: WarehouseSection) => void;
  isSelected: boolean;
  isAvailable: boolean;
}
