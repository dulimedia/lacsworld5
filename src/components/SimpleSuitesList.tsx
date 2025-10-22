import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Building, MapPin, Home, Sliders } from 'lucide-react';
import { useExploreState } from '../store/exploreState';
import { useGLBState } from '../store/glbState';

export const SimpleSuitesList: React.FC = () => {
  const { getBuildingList, getFloorList, getUnitsByFloor, getUnitData } = useExploreState();
  const { selectUnit, selectFloor, hoverUnit, hoverFloor } = useGLBState();
  
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(null);
  const [expandedFloor, setExpandedFloor] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    minSqft: -1,
    maxSqft: -1,
    hasKitchen: 'any' as 'any' | 'yes'
  });

  const buildings = useMemo(() => {
    const all = getBuildingList();
    const allowed = ['Fifth Street Building', 'Maryland Building', 'Tower Building'];
    return all.filter(b => allowed.includes(b));
  }, [getBuildingList]);

  const sizePresets = [
    { label: 'Any Size', minSqft: -1, maxSqft: -1 },
    { label: 'Small', minSqft: 0, maxSqft: 500 },
    { label: 'Medium', minSqft: 500, maxSqft: 1000 },
    { label: 'Large', minSqft: 1000, maxSqft: 20000 }
  ];

  const filterUnits = (units: string[]) => {
    return units.filter(unitKey => {
      const data = getUnitData(unitKey);
      if (!data) return false;

      if (filters.minSqft !== -1 && data.area_sqft < filters.minSqft) return false;
      if (filters.maxSqft !== -1 && data.area_sqft > filters.maxSqft) return false;
      if (filters.hasKitchen === 'yes' && !data.has_kitchen) return false;

      return true;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="border-b border-gray-200 pb-4 mb-4">
        <div className="space-y-3">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Sliders size={14} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Size</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sizePresets.map((preset, idx) => {
                const isActive = filters.minSqft === preset.minSqft && filters.maxSqft === preset.maxSqft;
                return (
                  <button
                    key={idx}
                    onClick={() => setFilters(prev => ({ ...prev, minSqft: preset.minSqft, maxSqft: preset.maxSqft }))}
                    className={`text-xs px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Home size={14} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Kitchen</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, hasKitchen: 'any' }))}
                className={`flex-1 text-xs px-3 py-2 rounded-lg transition-colors ${
                  filters.hasKitchen === 'any'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Any
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, hasKitchen: 'yes' }))}
                className={`flex-1 text-xs px-3 py-2 rounded-lg transition-colors ${
                  filters.hasKitchen === 'yes'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                With Kitchen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Buildings List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {buildings.map(building => {
          const floors = getFloorList(building);
          const isExpanded = expandedBuilding === building;
          
          const totalUnits = floors.reduce((sum, floor) => {
            return sum + getUnitsByFloor(building, floor).length;
          }, 0);
          
          const filteredCount = floors.reduce((sum, floor) => {
            const units = getUnitsByFloor(building, floor);
            return sum + filterUnits(units).length;
          }, 0);

          return (
            <div key={building} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => {
                  if (isExpanded) {
                    setExpandedBuilding(null);
                    setExpandedFloor(null);
                  } else {
                    setExpandedBuilding(building);
                    setExpandedFloor(null);
                  }
                }}
                className="w-full p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building size={16} className="text-blue-600" />
                    <div className="text-left">
                      <div className="font-semibold text-sm text-gray-900">{building}</div>
                      <div className="text-xs text-gray-500">
                        {filteredCount} suite{filteredCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  {floors.map(floor => {
                    const units = getUnitsByFloor(building, floor);
                    const filteredUnits = filterUnits(units);
                    const isFloorExpanded = expandedFloor === `${building}-${floor}`;

                    return (
                      <div key={floor}>
                        <button
                          onClick={() => {
                            if (isFloorExpanded) {
                              setExpandedFloor(null);
                            } else {
                              setExpandedFloor(`${building}-${floor}`);
                              selectFloor(building, floor);
                            }
                          }}
                          onMouseEnter={() => hoverFloor(building, floor)}
                          onMouseLeave={() => hoverFloor(null, null)}
                          className="w-full px-4 py-2 hover:bg-gray-100 transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <MapPin size={12} className="text-blue-500" />
                              <span className="text-xs font-medium text-gray-700">{floor}</span>
                            </div>
                            {isFloorExpanded ? (
                              <ChevronDown size={12} className="text-gray-400" />
                            ) : (
                              <ChevronRight size={12} className="text-gray-400" />
                            )}
                          </div>
                        </button>

                        {isFloorExpanded && (
                          <div className="bg-white px-4 py-2 space-y-1">
                            {filteredUnits.map(unitKey => {
                              const data = getUnitData(unitKey);
                              if (!data) return null;

                              return (
                                <button
                                  key={unitKey}
                                  onClick={() => selectUnit(building, floor, data.unit_name)}
                                  onMouseEnter={() => hoverUnit(unitKey)}
                                  onMouseLeave={() => hoverUnit(null)}
                                  className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-900">{data.unit_name}</span>
                                    <span className="text-xs text-gray-500">
                                      {data.area_sqft ? `${data.area_sqft} RSF` : 'N/A'}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
