import React, { useState, useMemo } from 'react';
import { useExploreState } from '../../store/exploreState';
import { useSidebarState } from './useSidebarState';
import { useGLBState } from '../../store/glbState';
import { ChevronDown, ChevronRight, Sliders, Home } from 'lucide-react';
import { detectDevice } from '../../utils/deviceDetection';

const SIZE_OPTIONS = [
  { value: 'any', label: 'Any Size', min: -1, max: -1 },
  { value: '<1500', label: '<1,500 sf', min: 0, max: 1499 },
  { value: '1500-4000', label: '1,500-4,000 sf', min: 1500, max: 4000 },
  { value: '5000-9000', label: '5,000-9,000 sf', min: 5000, max: 9000 },
  { value: '9001-19000', label: '9,001-19,000 sf', min: 9001, max: 19000 },
];

const KITCHEN_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'with', label: 'With Kitchen' },
];

export function ExploreTab() {
  const { 
    unitsByBuilding, 
    unitsData, 
    showAvailableOnly, 
    setShowAvailableOnly,
    setSelected,
    setHovered
  } = useExploreState();
  
  const { setView } = useSidebarState();
  const { selectUnit } = useGLBState();
  const isMobile = detectDevice().isMobile;

  const [sizeFilter, setSizeFilter] = useState<string>('any');
  const [kitchenFilter, setKitchenFilter] = useState<string>('any');
  const [filtersVisible, setFiltersVisible] = useState<boolean>(true);
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());

  const toggleBuilding = (building: string) => {
    const newExpanded = new Set(expandedBuildings);
    if (newExpanded.has(building)) {
      newExpanded.delete(building);
    } else {
      newExpanded.add(building);
    }
    setExpandedBuildings(newExpanded);
  };

  const toggleFloor = (floorKey: string) => {
    if (expandedFloors.has(floorKey)) {
      setExpandedFloors(new Set());
    } else {
      setExpandedFloors(new Set([floorKey]));
    }
  };

  const groupedByBuilding = useMemo(() => {
    const allBuildings = Object.keys(unitsByBuilding).sort();
    const allowedBuildings = ['Fifth Street Building', 'Maryland Building', 'Tower Building'];
    const buildings = allBuildings.filter(b => allowedBuildings.includes(b));
    
    return buildings.map(building => {
      const floors = unitsByBuilding[building];
      let totalSuiteCount = 0;
      const floorGroups: Array<{floorName: string, units: Array<{unitKey: string, unit: any}>}> = [];

      const buildingSeenUnits = new Set<string>();
      
      const isTowerBuilding = building === 'Tower Building';
      
      if (isTowerBuilding) {
        // Tower Building: display units directly without floor grouping
        const allTowerUnits: Array<{unitKey: string, unit: any}> = [];
        
        Object.values(floors).forEach(unitKeys => {
          const uniqueKeys = Array.from(new Set(unitKeys));
          
          uniqueKeys.forEach(unitKey => {
            if (buildingSeenUnits.has(unitKey)) return;
            buildingSeenUnits.add(unitKey);
            
            const unit = unitsData.get(unitKey);
            if (!unit) return;

            let passes = true;

            if (showAvailableOnly && !unit.status) {
              passes = false;
            }

            if (sizeFilter !== 'any' && unit.area_sqft) {
              const option = SIZE_OPTIONS.find(o => o.value === sizeFilter);
              if (option && option.min !== -1 && option.max !== -1) {
                if (unit.area_sqft < option.min || unit.area_sqft > option.max) {
                  passes = false;
                }
              }
            }

            if (kitchenFilter === 'with') {
              const hasKitchen = unit.kitchen_size && unit.kitchen_size.toLowerCase() !== 'none';
              if (!hasKitchen) {
                passes = false;
              }
            }

            if (passes) {
              totalSuiteCount++;
              allTowerUnits.push({ unitKey, unit });
            }
          });
        });
        
        // Sort Tower units numerically (T-100, T-110, T-200, etc.)
        allTowerUnits.sort((a, b) => {
          const getNumber = (unitName: string) => {
            const match = unitName.match(/T-?(\d+)/i);
            return match ? parseInt(match[1], 10) : 0;
          };
          return getNumber(a.unit.unit_name) - getNumber(b.unit.unit_name);
        });
        
        // Add units directly without a floor subfolder
        if (allTowerUnits.length > 0) {
          floorGroups.push({ floorName: '', units: allTowerUnits });
        }
      } else {
        const floorOrder = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor'];
        const sortedFloorEntries = Object.entries(floors).sort(([a], [b]) => {
          const aIndex = floorOrder.findIndex(f => a.toLowerCase().includes(f.toLowerCase()));
          const bIndex = floorOrder.findIndex(f => b.toLowerCase().includes(f.toLowerCase()));
          if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
        
        sortedFloorEntries.forEach(([floorName, unitKeys]) => {
          const floorUnits: Array<{unitKey: string, unit: any}> = [];
          
          const uniqueFloorKeys = Array.from(new Set(unitKeys));
          
          uniqueFloorKeys.forEach(unitKey => {
            if (buildingSeenUnits.has(unitKey)) return;
            buildingSeenUnits.add(unitKey);
            
            const unit = unitsData.get(unitKey);
            if (!unit) return;

            let passes = true;

            if (showAvailableOnly && !unit.status) {
              passes = false;
            }

            if (sizeFilter !== 'any' && unit.area_sqft) {
              const option = SIZE_OPTIONS.find(o => o.value === sizeFilter);
              if (option && option.min !== -1 && option.max !== -1) {
                if (unit.area_sqft < option.min || unit.area_sqft > option.max) {
                  passes = false;
                }
              }
            }

            if (kitchenFilter === 'with') {
              const hasKitchen = unit.kitchen_size && unit.kitchen_size.toLowerCase() !== 'none';
              if (!hasKitchen) {
                passes = false;
              }
            }

            if (passes) {
              totalSuiteCount++;
              floorUnits.push({ unitKey, unit });
            }
          });

          if (floorUnits.length > 0) {
            floorGroups.push({ floorName, units: floorUnits });
          }
        });
      }

      return {
        name: building,
        suiteCount: totalSuiteCount,
        floorGroups
      };
    }).filter(b => b.suiteCount > 0);
  }, [unitsByBuilding, unitsData, showAvailableOnly, sizeFilter, kitchenFilter]);

  return (
    <div className={isMobile ? "space-y-2" : "space-y-4"}>
      {isMobile ? (
        <div className="space-y-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-black/60 mb-1 block">Size</span>
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border border-black/10 bg-white"
            >
              {SIZE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-black/60 mb-1 block">Kitchen</span>
            <select
              value={kitchenFilter}
              onChange={(e) => setKitchenFilter(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded border border-black/10 bg-white"
            >
              {KITCHEN_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Sliders size={14} className="text-gray-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-black/60">Filters</span>
            </div>
            {filtersVisible && (
              <button
                onClick={() => setFiltersVisible(false)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
              >
                <span>Hide</span>
                <span>✕</span>
              </button>
            )}
            {!filtersVisible && (
              <button
                onClick={() => setFiltersVisible(true)}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                Show Filters
              </button>
            )}
          </div>

          {filtersVisible && (
            <div className="space-y-4 p-3 bg-gray-50 rounded-lg border border-black/10">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-black/60">Size</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
          {SIZE_OPTIONS.map((option) => {
            const isActive = sizeFilter === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setSizeFilter(option.value)}
                className={`text-xs px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Home size={14} className="text-gray-500" />
          <span className="text-xs font-semibold uppercase tracking-wide text-black/60">Kitchen</span>
        </div>
        <div className="flex space-x-2">
          {KITCHEN_OPTIONS.map((option) => {
            const isActive = kitchenFilter === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setKitchenFilter(option.value)}
                className={`flex-1 text-xs px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

            </div>
          )}
        </>
      )}

      <div className={isMobile ? "mt-2 space-y-1" : "mt-4 space-y-2"}>
        {groupedByBuilding.map(b => (
          <div key={b.name} className={isMobile ? "border border-black/5 rounded bg-white" : "border border-black/10 rounded-lg bg-white shadow-sm overflow-hidden"}>
            <button
              className={isMobile ? "w-full text-left px-2 py-1 hover:bg-black/5 transition flex items-center justify-between text-xs" : "w-full text-left px-3 py-2 hover:bg-black/5 transition flex items-center justify-between"}
              onClick={() => toggleBuilding(b.name)}
            >
              <div className="flex items-center space-x-1">
                {expandedBuildings.has(b.name) ? <ChevronDown size={isMobile ? 12 : 16} /> : <ChevronRight size={isMobile ? 12 : 16} />}
                <span className={isMobile ? "font-medium text-xs" : "font-medium text-sm"}>{b.name}</span>
              </div>
              <span className={isMobile ? "text-[10px] bg-black/5 rounded px-1 py-0.5" : "text-xs bg-black/5 rounded-md px-2 py-0.5"}>{b.suiteCount} Suites</span>
            </button>

            {expandedBuildings.has(b.name) && (
              <div className={isMobile ? "px-2 py-1 space-y-1 bg-black/[0.02]" : "px-3 py-2 space-y-2 bg-black/[0.02]"}>
                {b.floorGroups.map(floor => {
                  const floorKey = `${b.name}/${floor.floorName}`;
                  const isFloorExpanded = expandedFloors.has(floorKey);
                  const isTowerBuilding = b.name === 'Tower Building';
                  
                  // For Tower Building, render units directly without floor grouping
                  if (isTowerBuilding) {
                    return (
                      <div key={floor.floorName} className={isMobile ? "px-1 pb-0.5 grid grid-cols-2 gap-0.5" : "px-2 pb-1 space-y-1"}>
                        {floor.units.map(({unitKey, unit}) => (
                          <button
                            key={unitKey}
                            className={isMobile 
                              ? "text-left px-1 py-0.5 rounded hover:bg-black/5 transition text-[10px] flex flex-col"
                              : "w-full text-left px-2 py-1.5 rounded hover:bg-black/5 transition text-sm flex items-center justify-between"}
                            onClick={() => {
                              setSelected(unitKey);
                              setView('details');
                              
                              const unitData = unitsData.get(unitKey);
                              if (unitData) {
                                const normalizedUnit = unitData.unit_name.trim().toUpperCase();
                                selectUnit('Tower Building', 'Main Floor', normalizedUnit);
                              }
                            }}
                            onMouseEnter={() => setHovered(unitKey)}
                            onMouseLeave={() => setHovered(null)}
                          >
                            <span className={isMobile ? "font-medium truncate" : ""}>{unit.unit_name}</span>
                            {!isMobile && (
                              <span className={`text-xs px-2 py-0.5 rounded ${unit.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {unit.status ? 'Available' : 'Occupied'}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  }
                  
                  // For other buildings, show floor grouping
                  return (
                    <div key={floor.floorName} className="border border-black/5 rounded bg-white">
                      <button
                        onClick={() => toggleFloor(floorKey)}
                        className={isMobile ? "w-full text-left px-1.5 py-1 hover:bg-black/5 transition flex items-center justify-between" : "w-full text-left px-2 py-1.5 hover:bg-black/5 transition flex items-center justify-between"}
                      >
                        <div className="flex items-center space-x-1">
                          {isFloorExpanded ? <ChevronDown size={isMobile ? 10 : 14} /> : <ChevronRight size={isMobile ? 10 : 14} />}
                          <span className={isMobile ? "text-[10px] font-semibold text-black/70" : "text-xs font-semibold text-black/70"}>{floor.floorName}</span>
                        </div>
                        <span className={isMobile ? "text-[9px] text-black/40" : "text-xs text-black/40"}>({floor.units.length})</span>
                      </button>
                      
                      {isFloorExpanded && (
                        <div className={isMobile ? "px-1 pb-0.5 grid grid-cols-2 gap-0.5" : "px-2 pb-1 space-y-1"}>
                          {floor.units.map(({unitKey, unit}) => (
                            <button
                              key={unitKey}
                              className={isMobile 
                                ? "text-left px-1 py-0.5 rounded hover:bg-black/5 transition text-[10px] flex flex-col"
                                : "w-full text-left px-2 py-1.5 rounded hover:bg-black/5 transition text-sm flex items-center justify-between"}
                              onClick={() => {
                                setSelected(unitKey);
                                setView('details');
                                
                                const unitData = unitsData.get(unitKey);
                                if (unitData) {
                                  selectUnit(unitData.building, unitData.floor, unitData.unit_name);
                                }
                              }}
                              onMouseEnter={() => setHovered(unitKey)}
                              onMouseLeave={() => setHovered(null)}
                            >
                              <span className={isMobile ? "font-medium truncate" : ""}>{unit.unit_name}</span>
                              {!isMobile && (
                                <span className={`text-xs px-2 py-0.5 rounded ${unit.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {unit.status ? 'Available' : 'Occupied'}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
