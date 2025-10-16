import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Square, Circle } from 'lucide-react';
import { UnitData } from '../types';
import { useUnitStore } from '../stores/useUnitStore';
import { useFilterStore, FilterSelection } from '../stores/useFilterStore';

interface FilterDropdownProps {
  unitData: Record<string, UnitData>;
  onUnitHover: (unitName: string | null) => void;
  isOpen?: boolean;
  onToggleOpen?: (isOpen: boolean) => void;
  dropDirection?: 'up' | 'down'; // New prop to control dropdown direction
}

/**
 * Utility: normalize a filename like "F-100.glb" => "f-100"
 * - removes extension
 * - trims spaces
 * - normalizes dashes and spaces to single dash
 * - lowercases
 */
const filenameToUnitName = (filename: string) => {
  let base = filename.replace(/\.glb$/i, '').trim();
  // Normalize spaces around dashes and remaining spaces
  base = base.replace(/\s*-\s*/g, '-');
  base = base.replace(/\s+/g, '-');
  // Remove any characters except letters, numbers and dashes
  base = base.replace(/[^a-zA-Z0-9\-]/g, '');
  return base.toLowerCase();
};

type TreeNode = { name: string; children?: Array<TreeNode | string> };

export const FilterDropdown: React.FC<FilterDropdownProps> = React.memo(({
  unitData,
  onUnitHover,
  isOpen: externalIsOpen,
  onToggleOpen,
  dropDirection = 'up' // Default to 'up' for backward compatibility
}) => {
  // Debug: Log unit data on mount
  useEffect(() => {
    console.log(`📊 FilterDropdown received ${Object.keys(unitData).length} units`);
    if (Object.keys(unitData).length > 0) {
      console.log('📋 Sample units:', Object.keys(unitData).slice(0, 5));
    }
  }, [unitData]);
  const { selectedUnit, setSelectedUnit } = useUnitStore();
  const { activeFilter, setFilter, clearFilter } = useFilterStore();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const [tree, setTree] = useState<TreeNode | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Fetch the pre-generated index in public/
    fetch(import.meta.env.BASE_URL + 'models/boxes_index.json')
      .then((res) => res.json())
      .then((data: TreeNode) => setTree(data))
      .catch((err) => {
        console.warn('Failed to load boxes_index.json', err);
        setTree(null);
      });
  }, []);

  const handleToggleOpen = () => {
    const newIsOpen = !isOpen;
    if (onToggleOpen) onToggleOpen(newIsOpen);
    else setInternalIsOpen(newIsOpen);
  };

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => ({ ...prev, [path]: !prev[path] }));
  };

  // Flatten files to a list for optional filtering/sorting (if desired)
  const flattenedFiles = useMemo(() => {
    const out: string[] = [];
    const walk = (node?: TreeNode | string) => {
      if (!node) return;
      if (typeof node === 'string') {
        out.push(node);
        return;
      }
      if (node.children) {
        node.children.forEach(child => walk(child));
      }
    };
    if (tree) walk(tree);
    return out;
  }, [tree]);

  const getDropdownClasses = () => {
    const positioning = dropDirection === 'down' 
      ? "absolute top-14 left-0" // Drop down from top
      : "absolute bottom-14 left-0"; // Drop up from bottom (original behavior)
    
    const base = `${positioning} bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-96 overflow-auto transition-all duration-200 ease-in-out z-50`;
    
    const transformDirection = dropDirection === 'down' ? 'translate-y-2' : 'translate-y-2';
    return isOpen 
      ? `${base} opacity-100 translate-y-0 scale-100` 
      : `${base} opacity-0 pointer-events-none ${transformDirection} scale-95`;
  };

  const renderNode = (node: TreeNode | string, path: string, parentPath: string[] = []) => {
    if (typeof node === 'string') {
      // This is a GLB file (unit)
      const displayName = node;
      const unitName = filenameToUnitName(displayName);
      const isSelected = selectedUnit === unitName;
      const unitMeta = unitData[unitName];
      
      // Debug logging for unit matching
      if (!unitMeta) {
        console.log(`🔍 UNIT NOT FOUND: "${unitName}" (from ${displayName})`);
        console.log(`Available units:`, Object.keys(unitData).slice(0, 10), '...');
      }
      
      const isAvailable = unitMeta ? !!unitMeta.availability : false;

      return (
        <div
          key={path}
          className={`px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
          onMouseEnter={() => onUnitHover(unitName)}
          onMouseLeave={() => onUnitHover(null)}
          onClick={() => {
            // Set individual unit filter
            const building = parentPath[0];
            const floor = parentPath[1] || 'All Floors'; // For flat structures like Tower Building
            
            const unitFilter: FilterSelection = {
              level: 'unit',
              building,
              floor,
              unit: unitName,
              path: `${building}${floor ? '/' + floor : ''}/${displayName}`
            };
            
            setFilter(unitFilter);
            setSelectedUnit(unitName);
            if (onToggleOpen) onToggleOpen(false);
            else setInternalIsOpen(false);
          }}
        >
          <div className="flex items-center space-x-2">
            {isAvailable ? <Circle size={10} className="text-green-500" /> : <Square size={10} className="text-red-500" />}
            <span className="text-sm font-medium">{displayName.replace(/\.glb$/i, '')}</span>
          </div>
          <div className="text-xs text-gray-500">
            {unitMeta?.area_sqft ? `${unitMeta.area_sqft.toLocaleString()}sf` : unitMeta?.size ?? ''}
          </div>
        </div>
      );
    } else {
      // This is a folder node (building or floor)
      const nodePath = path;
      const expanded = !!expandedPaths[nodePath];
      const currentPath = [...parentPath, node.name];
      const isBuilding = parentPath.length === 0; // Top level = building
      const isFloor = parentPath.length === 1; // Second level = floor
      
      // Check if this building has a flat structure (direct GLB files as children)
      const hasFlatStructure = isBuilding && node.children && node.children.some(child => typeof child === 'string');
      
      return (
        <div key={nodePath} className="border-t border-gray-100">
          <div
            className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50"
            onClick={() => {
              // Handle hierarchical selection
              if (isBuilding) {
                // Building-level selection
                const buildingFilter: FilterSelection = {
                  level: 'building',
                  building: node.name
                };
                setFilter(buildingFilter);
                console.log(`🏢 CLICKED BUILDING: ${node.name}`);
              } else if (isFloor) {
                // Floor-level selection
                const building = parentPath[0];
                const floorFilter: FilterSelection = {
                  level: 'floor',
                  building: building,
                  floor: node.name
                };
                setFilter(floorFilter);
                console.log(`🏠 CLICKED FLOOR: ${building}/${node.name}`);
              }
              
              // Also toggle expansion
              toggleExpand(nodePath);
            }}
          >
            <div className="flex items-center space-x-2">
              <ChevronDown className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`} />
              <span className="text-sm font-semibold">{node.name}</span>
              {(isBuilding || isFloor) && (
                <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                  {isBuilding ? 'Click to activate building' : 'Click to activate floor'}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">{node.children ? node.children.length : 0}</div>
          </div>
          {expanded && node.children && (
            <div className={hasFlatStructure ? "pl-4" : "pl-4"}>
              {node.children.map((child, idx) => renderNode(child, `${nodePath}/${typeof child === 'string' ? child : child.name}-${idx}`, currentPath))}
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="relative">
      <div className="w-full">
        <button
          onClick={handleToggleOpen}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md"
        >
          <span className="text-sm font-medium">Explore Suites</span>
          <ChevronDown />
        </button>
      </div>

      <div className={getDropdownClasses()} role="menu" aria-hidden={!isOpen}>
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">Suites organized by folder (from public/models/boxes)</div>
            {activeFilter && (
              <button
                onClick={() => {
                  clearFilter();
                  setSelectedUnit(null);
                }}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
              >
                Clear Filter
              </button>
            )}
          </div>
          {activeFilter && (
            <div className="text-xs text-blue-600 mt-1">
              Active: {activeFilter.level === 'building' ? `Building - ${activeFilter.building}` 
                     : activeFilter.level === 'floor' ? `Floor - ${activeFilter.building}/${activeFilter.floor}`
                     : `Suite - ${activeFilter.unit}`}
            </div>
          )}
        </div>

        {tree ? (
          <div>
            {tree.children && tree.children
              .filter((child) => {
                // Filter out "other" and "stages" folders
                if (typeof child === 'string') return true;
                const allowedBuildings = ['Fifth Street Building', 'Maryland Building', 'Tower Building'];
                return allowedBuildings.includes(child.name);
              })
              .map((child, idx) => renderNode(child, `${tree.name}/${typeof child === 'string' ? child : child.name}-${idx}`, []))}
          </div>
        ) : (
          <div className="p-4 text-sm text-gray-500">Loading suites...</div>
        )}
      </div>
    </div>
  );
});