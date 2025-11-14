import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { detectDevice } from '../utils/deviceDetection';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  Circle, 
  Square, 
  Building, 
  MapPin,
  X,
  ArrowLeft,
  Expand,
  Share,
  MessageCircle,
  Sliders,
  Home,
  Send
} from 'lucide-react';
import { useExploreState, type UnitRecord } from '../store/exploreState';
import { useGLBState } from '../store/glbState';
import { useUnitStore } from '../stores/useUnitStore';
import { UnitHoverPreview } from '../components/UnitHoverPreview';
import { FloorplanViewer } from '../components/FloorplanViewer';
import { preloadFloorFloorplans } from '../services/floorplanService';
import { logger } from '../utils/logger';

/**
 * Utility: normalize a filename like "F-100.glb" => "f-100"
 * - removes extension
 * - trims spaces
 * - normalizes dashes and spaces to single dash
 * - lowercases
 */
const filenameToUnitName = (filename: string) => {
  let base = filename.replace(/\.glb$/i, '').trim();
  
  // Special case for Studio O.M. - preserve dots for matching with GLB_STRUCTURE
  if (base.toLowerCase().includes('studio') && base.toLowerCase().includes('o.m')) {
    return 'Studio O.M.';
  }
  
  // Normalize spaces around dashes and remaining spaces
  base = base.replace(/\s*-\s*/g, '-');
  base = base.replace(/\s+/g, '-');
  // Remove any characters except letters, numbers and dashes
  base = base.replace(/[^a-zA-Z0-9\-]/g, '');
  return base.toLowerCase();
};

type TreeNode = { name: string; children?: Array<TreeNode | string> };

interface ExploreUnitsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRequest?: (unitKey: string, unitName: string) => void;
  onExpandFloorplan?: (floorplanUrl: string, unitName: string, unitData?: any) => void;
  onCloseFilters?: () => void;
  pageType?: 'main' | 'events' | 'stages';
}

interface BuildingNodeProps {
  building: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onBuildingClick: () => void;
  onUnitSelect?: (unitData: any) => void;
}

interface FloorNodeProps {
  building: string;
  floor: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onFloorClick: () => void;
  onUnitSelect?: (unitData: any) => void;
}

interface UnitRowProps {
  unit: UnitRecord;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  onHover: (unitKey: string | null) => void;
  onSelect: (unitKey: string) => void;
}

const UnitRow: React.FC<UnitRowProps> = ({
  unit,
  isSelected,
  isHovered,
  isDimmed,
  onHover,
  onSelect
}) => {
  const isAvailable = unit.status === true;
  
  return (
    <div
      className={`
        px-4 py-2 cursor-pointer transition-all duration-150 border-l-4
        ${isSelected 
          ? 'bg-blue-50 border-blue-500 shadow-sm' 
          : isHovered 
            ? 'bg-gray-50 border-gray-300' 
            : 'border-transparent hover:bg-gray-25'
        }
        ${isDimmed ? 'opacity-40 pointer-events-none' : ''}
      `}
      onMouseEnter={() => onHover(unit.unit_key)}
      onMouseLeave={() => onHover(null)}
      onClick={() => {
        if (!isDimmed) {
          onHover(null); // Clear hover immediately on click
          onSelect(unit.unit_key);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isAvailable ? (
            <Circle size={8} className="text-green-500 fill-current" />
          ) : (
            <Square size={8} className="text-red-500 fill-current" />
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">
              {unit.unit_name}
            </div>
            <div className="text-xs text-gray-500">
              {unit.unit_key}
            </div>
          </div>
        </div>
        <div className="text-right">
          {/* Square footage removed per user request */}
        </div>
      </div>
    </div>
  );
};

const FloorNode: React.FC<FloorNodeProps> = ({
  building,
  floor,
  isExpanded,
  onToggleExpanded,
  onFloorClick,
  onUnitSelect
}) => {
  const { getUnitsByFloor, getUnitData, showAvailableOnly, hoveredUnitKey, selectedUnitKey, setHovered, setSelected } = useExploreState();
  const { selectUnit } = useGLBState();
  const { setHoveredUnit } = useUnitStore();
  
  // Wrapper function to handle both hover states
  const handleUnitHover = (unitKey: string | null) => {
    setHovered(unitKey); // For the explore panel UI state
    
    // Convert unitKey to unit name for the 3D highlighting
    if (unitKey) {
      const unitData = getUnitData(unitKey);
      
      if (unitData && unitData.unit_name) {
        setHoveredUnit(unitData.unit_name);
        
        // Also trigger GLB state hover for 3D scene highlighting
        const { hoverUnit } = useGLBState.getState();
        let glbUnitName = unitData.unit_name;
        
        // Convert CSV unit name to GLB structure format
        if (glbUnitName === "Studio O.M") {
          glbUnitName = "Studio O.M.";
        }
        
        hoverUnit(building, floor, glbUnitName);
      }
    } else {
      setHoveredUnit(null);
      // Clear GLB hover as well
      const { hoverUnit } = useGLBState.getState();
      hoverUnit(null, null, null);
    }
  };
  
  const handleUnitSelect = (unitKey: string) => {
    // Extract unit name from the unit data
    const unitData = getUnitData(unitKey);
    
    if (unitData) {
      // Call original selection handler
      setSelected(unitKey);
      
      // Update GLB state for 3D visualization (check if camera is not already animating)
      const { isCameraAnimating } = useGLBState.getState();
      
      if (!isCameraAnimating) {
        let glbUnitName = unitData.unit_name;
        
        // Convert CSV unit name to GLB structure format
        if (glbUnitName === "Studio O.M") {
          glbUnitName = "Studio O.M.";
        }
        
        logger.log('CAMERA', '🎯', 'Camera focusing on unit:', { 
          building: unitData.building, 
          floor: unitData.floor, 
          unit: glbUnitName 
        });
        selectUnit(unitData.building, unitData.floor, glbUnitName);
        
        const { centerCameraOnUnit } = useGLBState.getState();
        centerCameraOnUnit(unitData.building, unitData.floor, glbUnitName);
      }
      
      // Navigate to details view if we have the handler
      if (onUnitSelect) {
        // Clear hover state when selecting a unit
        handleUnitHover(null);
        onUnitSelect(unitData);
      }
    }
  };
  
  const unitKeys = getUnitsByFloor(building, floor);
  const units = unitKeys.map(key => getUnitData(key)).filter(Boolean) as UnitRecord[];
  
  // ALWAYS filter out unavailable units - they should never be shown in the UI
  const visibleUnits = useMemo(() => {
    // Always hide unavailable units completely (never show red dots)
    return units.filter(unit => unit.status === true);
  }, [units]);

  const availableCount = units.filter(unit => unit.status === true).length;
  const totalCount = availableCount; // Only show available units in total
  
  // Preload floorplans when floor is expanded
  useEffect(() => {
    if (isExpanded && units.length > 0) {
      preloadFloorFloorplans(units).catch(() => {
        // Silently handle failed preloads
      });
    }
  }, [isExpanded, units, building, floor]);

  return (
    <div className="border-t border-gray-100">
      <div 
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors duration-150"
        onClick={() => {
          onFloorClick();
          onToggleExpanded();
        }}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-400 transition-transform duration-200" />
          ) : (
            <ChevronRight size={16} className="text-gray-400 transition-transform duration-200" />
          )}
          <MapPin size={14} className="text-blue-500" />
          <span className="text-sm font-semibold text-gray-700">Floor {floor}</span>
        </div>
        <div className="text-xs text-gray-500">
          <span className="text-green-600 font-medium">{availableCount}</span>
          <span className="mx-1">/</span>
          <span>{totalCount}</span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="bg-gray-25">
          {visibleUnits.map(unit => (
            <UnitRow
              key={unit.unit_key}
              unit={unit}
              isSelected={selectedUnitKey === unit.unit_key}
              isHovered={hoveredUnitKey === unit.unit_key}
              isDimmed={false}
              onHover={handleUnitHover}
              onSelect={handleUnitSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const BuildingNode: React.FC<BuildingNodeProps> = ({
  building,
  isExpanded,
  onToggleExpanded,
  onBuildingClick,
  onUnitSelect
}) => {
  const { getFloorList, getUnitsByFloor, getUnitData } = useExploreState();
  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({});
  
  // Get filter state from parent component context
  const filters = useExploreState(state => ({
    minSqft: state.filters?.minSqft || 0,
    maxSqft: state.filters?.maxSqft || 20000
  }));
  
  const floors = getFloorList(building);
  
  // Calculate building stats with filters applied
  const { filteredCount, totalCount } = useMemo(() => {
    let filtered = 0;
    let total = 0;
    
    floors.forEach(floor => {
      const unitKeys = getUnitsByFloor(building, floor);
      const units = unitKeys.map(key => getUnitData(key)).filter(Boolean) as UnitRecord[];
      
      // Only count available units in total
      const availableUnits = units.filter(unit => unit.status === true);
      total += availableUnits.length;
      
      // Apply same filter logic as unitPassesFilters
      units.forEach(unit => {
        // Only count available units
        if (unit.status !== true) return;
        
        const sqft = unit.area_sqft || 0;
        
        if (filters.minSqft !== -1 && sqft < filters.minSqft) return;
        if (filters.maxSqft !== -1 && sqft > filters.maxSqft) return;
        
        // Kitchen filter
        if (filters.hasKitchen === 'yes') {
          const kitchenSize = unit.kitchen_size;
          const hasKitchen = kitchenSize && 
                            kitchenSize !== 'None' && 
                            kitchenSize !== 'N/A' && 
                            kitchenSize.toLowerCase() !== 'none';
          if (!hasKitchen) return;
        }
        
        filtered++;
      });
    });
    
    return { filteredCount: filtered, totalCount: total };
  }, [building, floors, getUnitsByFloor, getUnitData, filters]);

  const toggleFloorExpanded = (floor: string) => {
    setExpandedFloors(prev => {
      const floorKey = `${building}/${floor}`;
      const isCurrentlyExpanded = prev[floor];
      
      if (isCurrentlyExpanded) {
        return { ...prev, [floor]: false };
      } else {
        const buildingPrefix = `${building}/`;
        const newState: Record<string, boolean> = {};
        Object.keys(prev).forEach(key => {
          if (!key.startsWith(buildingPrefix)) {
            newState[key] = prev[key];
          }
        });
        return { ...newState, [floor]: true };
      }
    });
  };

  const handleFloorClick = (floor: string) => {
    const { selectFloor } = useGLBState.getState();
    selectFloor(building, floor);
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-2 overflow-hidden shadow-sm">
      <div 
        className="px-4 py-3 bg-white flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors duration-150"
        onClick={() => {
          onBuildingClick();
          onToggleExpanded();
        }}
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDown size={18} className="text-gray-500 transition-transform duration-200" />
          ) : (
            <ChevronRight size={18} className="text-gray-500 transition-transform duration-200" />
          )}
          <Building size={16} className="text-blue-600" />
          <div>
            <div className="text-sm font-semibold text-gray-900">{building}</div>
            <div className="text-xs text-gray-500">{filteredCount} suites</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-700">
            <span className="text-blue-600">{filteredCount}</span>
            <span className="text-gray-400 mx-1">/</span>
            <span>{totalCount}</span>
          </div>
          <div className="text-xs text-gray-500">suites shown</div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="bg-gray-50 border-t border-gray-100">
          {floors.map(floor => (
            <FloorNode
              key={floor}
              building={building}
              floor={floor}
              isExpanded={!!expandedFloors[floor]}
              onToggleExpanded={() => toggleFloorExpanded(floor)}
              onFloorClick={() => handleFloorClick(floor)}
              onUnitSelect={onUnitSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ExploreUnitsPanel: React.FC<ExploreUnitsPanelProps> = ({
  isOpen,
  onClose,
  onRequest,
  onExpandFloorplan,
  onCloseFilters,
  pageType = 'main'
}) => {
  const exploreState = useExploreState();
  const { 
    showAvailableOnly, 
    setShowAvailableOnly, 
    getBuildingList, 
    getFloorList,
    getUnitsByFloor,
    isLoadingUnits,
    selectedUnitKey,
    getUnitData,
    setSelected,
    setHovered,
    setUnitDetailsOpen,
    setShow3DPopup
  } = exploreState;
  
  
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({});
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  
  // Set fixed min/max range for better user experience  
  const { actualMinSqft, actualMaxSqft } = useMemo(() => {
    return {
      actualMinSqft: 0,      // Fixed minimum at 0
      actualMaxSqft: 20000   // Fixed maximum at 20k
    };
  }, []);

  // Filter state with fixed range
  const [filters, setFilters] = useState({
    minSqft: -1,     // Start with "any size"
    maxSqft: -1,     // Start with "any size" (show all units)
    hasKitchen: 'any' as 'any' | 'yes'
  });


  // Size filter presets based on client requirements
  const sizePresets = [
    { label: 'Any Size', minSqft: -1, maxSqft: -1 },
    { label: '<1,500 sf', minSqft: 0, maxSqft: 1500 },
    { label: '1,500-4,000 sf', minSqft: 1500, maxSqft: 4000 },
    { label: '5,000-9,000 sf', minSqft: 5000, maxSqft: 9000 },
    { label: '9,001-18,000 sf', minSqft: 9001, maxSqft: 18000 }
  ];
  const [hoveredUnit, setHoveredUnit] = useState<{
    unitName: string;
    unitData?: any;
    position: { x: number; y: number };
  } | null>(null);
  
  // Card navigation state
  const [currentView, setCurrentView] = useState<'explore' | 'details' | 'request'>('explore');
  const [selectedUnitDetails, setSelectedUnitDetails] = useState<any>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const detailsContentRef = useRef<HTMLDivElement>(null);
  
  // Unit request modal state (for single unit from details view)
  const [showUnitRequestModal, setShowUnitRequestModal] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    senderName: '',
    senderEmail: '',
    senderPhone: '',
    message: ''
  });
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  
  // Multi-unit request state (for request suites view)
  const [selectedRequestUnits, setSelectedRequestUnits] = useState(new Set<string>());
  const [requestExpandedBuildings, setRequestExpandedBuildings] = useState(new Set<string>());
  const [requestExpandedFloors, setRequestExpandedFloors] = useState(new Set<string>());
  
  // Function to send individual unit request via EmailJS
  const sendUnitRequest = async () => {
    if (!selectedUnitDetails || !requestFormData.senderName || !requestFormData.senderEmail) {
      alert('Please fill in your name and email address.');
      return;
    }
    
    setIsSendingRequest(true);
    
    try {
      // Load EmailJS if not already loaded
      if (!window.emailjs) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
        
        // Initialize EmailJS
        window.emailjs.init('7v5wJOSuv1p_PkcU5');
      }

      // Use the same recipient email as UnitRequestForm
      const recipientEmail = 'lacenterstudios3d@gmail.com';
      
      // Prepare template parameters for single unit request
      const templateParams = {
        from_name: requestFormData.senderName,
        from_email: requestFormData.senderEmail,
        phone: requestFormData.senderPhone || 'Not provided',
        message: requestFormData.message || 'No additional message provided.',
        selected_units: `• ${selectedUnitDetails.building}/${selectedUnitDetails.floor}/${selectedUnitDetails.unit_name}`,
        to_email: recipientEmail,
        reply_to: requestFormData.senderEmail
      };

      // Send email using EmailJS with same service and template
      const response = await window.emailjs.send(
        'service_q47lbr7', // Same service ID
        'template_0zeil8m', // Same template ID
        templateParams
      );

      logger.log('REQUEST', '✅', 'Individual unit request sent successfully:', response);
      
      setIsSendingRequest(false);
      alert('Your unit request has been sent successfully!');
      
      // Reset form and close modal
      setRequestFormData({
        senderName: '',
        senderEmail: '',
        senderPhone: '',
        message: ''
      });
      setShowUnitRequestModal(false);
      
    } catch (error) {
      logger.error('Unit request failed:', error);
      setIsSendingRequest(false);
      alert(`Failed to send request: ${error.text || error.message || 'Unknown error'}. Please try again.`);
    }
  };

  // Resizing state with mobile-responsive defaults
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? Math.min(340, window.innerWidth - 16) : 320;
    }
    return 320;
  });
  const [panelHeight, setPanelHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? Math.min(700, window.innerHeight - 120) : 625;
    }
    return 625;
  });
  const [isResizing, setIsResizing] = useState<'width' | 'height' | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{width: number, height: number, startX: number, startY: number} | null>(null);
  
  // Get selected unit data for popup
  const selectedUnit = selectedUnitKey ? getUnitData(selectedUnitKey) : null;
  // Performance: debug logging removed

  // Clear any auto-selection on component mount
  useEffect(() => {
    // Force clear any auto-selected unit on panel mount
    setSelected(null);
  }, [setSelected]);

  // Sync selectedUnitDetails with the actual selected unit from explore state
  useEffect(() => {
    if (selectedUnitKey && currentView === 'details') {
      // Always try to get fresh data when viewing details
      const freshData = getUnitData(selectedUnitKey);
      
      if (freshData) {
        setSelectedUnitDetails(freshData);
      }
    }
  }, [selectedUnit, currentView, selectedUnitKey, getUnitData]);
  
  // Load GLB file tree structure
  useEffect(() => {
    // Floor sorting function
    const sortFloors = (tree: TreeNode): TreeNode => {
      const sortedTree = { ...tree };
      
      if (sortedTree.children) {
        sortedTree.children = sortedTree.children.map((building) => {
          if (typeof building === 'string') return building;
          
          const sortedBuilding = { ...building };
          if (sortedBuilding.children) {
            // Sort floors within each building
            sortedBuilding.children = [...sortedBuilding.children].sort((a, b) => {
              if (typeof a === 'string' || typeof b === 'string') return 0;
              
              const aName = a.name.toLowerCase();
              const bName = b.name.toLowerCase();
              
              // Define floor order priority
              const getFloorPriority = (floorName: string) => {
                if (floorName.includes('ground')) return 0;
                if (floorName.includes('first')) return 1;
                if (floorName.includes('second')) return 2;
                if (floorName.includes('third')) return 3;
                return 999;
              };
              
              const aPriority = getFloorPriority(aName);
              const bPriority = getFloorPriority(bName);
              
              
              if (aPriority !== bPriority) {
                return aPriority - bPriority;
              }
              
              return a.name.localeCompare(b.name);
            });
          }
          
          return sortedBuilding;
        });
      }
      
      return sortedTree;
    };

    // Fetch the pre-generated index in public/
    fetch(import.meta.env.BASE_URL + 'models/boxes_index.json')
      .then((res) => res.json())
      .then((data: TreeNode) => {
        const sortedTree = sortFloors(data);
        setTree(sortedTree);
      })
      .catch(() => {
        setTree(null);
      });
  }, []);

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        const newWidth = Math.min(340, window.innerWidth - 16);
        const newHeight = Math.min(700, window.innerHeight - 120);
        setPanelWidth(newWidth);
        setPanelHeight(newHeight);
      } else {
        setPanelWidth(320);
        setPanelHeight(625);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Resize handlers
  const handleMouseDown = useCallback((direction: 'width' | 'height') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(direction);
    resizeStartRef.current = {
      width: panelWidth,
      height: panelHeight,
      startX: e.clientX,
      startY: e.clientY
    };
  }, [panelWidth, panelHeight]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !panelRef.current || !resizeStartRef.current) return;

    const startData = resizeStartRef.current;
    
    if (isResizing === 'width') {
      // Right edge - calculate width based on mouse movement from start
      const deltaX = e.clientX - startData.startX;
      const newWidth = Math.max(200, Math.min(800, startData.width + deltaX));
      
      // Apply directly to DOM for smooth performance, no state updates
      panelRef.current.style.width = `${newWidth}px`;
    } else if (isResizing === 'height') {
      // Top edge - calculate height based on mouse movement from start  
      const deltaY = startData.startY - e.clientY; // Inverted for top edge
      const newHeight = Math.max(200, Math.min(window.innerHeight - 100, startData.height + deltaY));
      
      // Apply directly to DOM for smooth performance, no state updates
      panelRef.current.style.height = `${newHeight}px`;
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    if (!panelRef.current) return;
    
    // Update state with final dimensions
    const rect = panelRef.current.getBoundingClientRect();
    setPanelWidth(rect.width);
    setPanelHeight(rect.height);
    
    setIsResizing(null);
    resizeStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);
  
  
  const buildings = getBuildingList();
  
  // Toggle tree path expansion - simple toggle behavior
  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const isCurrentlyExpanded = prev[path];
      
      if (!isCurrentlyExpanded) {
        // Opening a folder - just set it to expanded
        return { ...prev, [path]: true };
      } else {
        // Closing the folder - clear selections and toggle it off
        const { clearSelection } = useGLBState.getState();
        clearSelection();
        
        return { ...prev, [path]: false };
      }
    });
  };
  
  // Filter buildings based on search term and exclude other/stages folders
  const filteredBuildings = useMemo(() => {
    // Only include the main three buildings, exclude "other" and "stages"
    const allowedBuildings = ['Fifth Street Building', 'Maryland Building', 'Tower Building'];
    const mainBuildings = buildings.filter(building => allowedBuildings.includes(building));
    
    if (!searchTerm.trim()) return mainBuildings;
    
    const lowerSearch = searchTerm.toLowerCase();
    return mainBuildings.filter(building => 
      building.toLowerCase().includes(lowerSearch)
    );
  }, [buildings, searchTerm]);

  const toggleBuildingExpanded = (building: string) => {
    setExpandedBuildings(prev => {
      const isCurrentlyExpanded = prev[building];
      if (isCurrentlyExpanded) {
        return { ...prev, [building]: false };
      } else {
        const newState = Object.keys(prev).reduce((acc, key) => ({...acc, [key]: false}), {} as Record<string, boolean>);
        return { ...newState, [building]: true };
      }
    });
    
    if (!expandedBuildings[building]) {
      setExpandedFloors({});
    }
  };

  const handleBuildingClick = (building: string) => {
    const { selectBuilding } = useGLBState.getState();
    selectBuilding(building);
  };

  // Filter function to check if unit passes current filters
  const unitPassesFilters = useCallback((unitData: UnitRecord | null) => {
    // Allow units without data when filters are set to "any size"
    const showUnitsWithoutData = filters.minSqft === -1 && filters.maxSqft === -1;
    if (!unitData) {
      return showUnitsWithoutData;
    }
    
    // Always filter out unavailable units (but only if we have data)
    if (unitData.status !== true) return false;
    
    // Square footage filter
    const sqft = unitData.area_sqft || 0;
    if (filters.minSqft !== -1 && sqft < filters.minSqft) return false;
    if (filters.maxSqft !== -1 && sqft > filters.maxSqft) return false;
    
    // Kitchen filter
    if (filters.hasKitchen === 'yes') {
      const kitchenSize = unitData.kitchen_size;
      const hasKitchen = kitchenSize && 
                        kitchenSize !== 'None' && 
                        kitchenSize !== 'N/A' && 
                        kitchenSize.toLowerCase() !== 'none';
      if (!hasKitchen) return false;
    }
    
    return true;
  }, [filters]);

  // Helper function to calculate filtered units for building in dropdown
  const getBuildingFilteredCount = useCallback((buildingName: string): { filteredCount: number; totalCount: number } => {
    const floors = getFloorList(buildingName);
    const uniqueAvailableUnits = new Set<string>();
    const filteredUnits = new Set<string>();
    
    floors.forEach(floor => {
      const unitKeys = getUnitsByFloor(buildingName, floor);
      const units = unitKeys.map(key => getUnitData(key)).filter(Boolean) as UnitRecord[];
      
      // Deduplicate units by their unit_name, only count available units
      units.forEach(unit => {
        const unitName = unit.unit_name || unit.name;
        if (!unitName) return;
        
        // Only count available units in total
        if (unit.status !== true) return;
        
        uniqueAvailableUnits.add(unitName);
        
        // Apply same filter logic
        const sqft = unit.area_sqft || 0;
        
        if (filters.minSqft !== -1 && sqft < filters.minSqft) return;
        if (filters.maxSqft !== -1 && sqft > filters.maxSqft) return;
        
        // Kitchen filter
        if (filters.hasKitchen === 'yes') {
          const kitchenSize = unit.kitchen_size;
          const hasKitchen = kitchenSize && 
                            kitchenSize !== 'None' && 
                            kitchenSize !== 'N/A' && 
                            kitchenSize.toLowerCase() !== 'none';
          if (!hasKitchen) return;
        }
        
        filteredUnits.add(unitName);
      });
    });
    
    return { filteredCount: filteredUnits.size, totalCount: uniqueAvailableUnits.size };
  }, [getFloorList, getUnitsByFloor, getUnitData, filters]);

  // Calculate total filtered units across all buildings
  const totalFilteredUnits = useMemo(() => {
    return buildings.reduce((total, building) => {
      const { filteredCount } = getBuildingFilteredCount(building);
      return total + filteredCount;
    }, 0);
  }, [buildings, getBuildingFilteredCount]);

  // Render tree nodes from GLB structure
  const renderGLBNode = (node: TreeNode | string, path: string, parentPath: string[] = []): React.ReactNode => {
    if (typeof node === 'string') {
      // This is a GLB file (unit)
      const displayName = node;
      const unitName = filenameToUnitName(displayName);
      const building = parentPath[0];
      const floor = parentPath[1];
      
      
      // Try to find unit data - first try with the normalized name, then with building/floor context
      let unitData = getUnitData(unitName);
      let actualUnitKey = unitName; // Track the key that actually worked
      
      if (!unitData) {
        // Try alternative lookups if needed
        const alternateKeys = [
          `${building}-${floor}-${unitName}`,
          `${building}/${floor}/${unitName}`,
          displayName.replace(/\.glb$/i, '')
        ];
        for (const key of alternateKeys) {
          unitData = getUnitData(key);
          if (unitData) {
            actualUnitKey = key; // Remember which key worked
            break;
          }
        }
      }
      
      // Blacklist of non-unit items that should never be shown (only actual restrooms/utility spaces)
      const nonUnitKeywords = [
        'restroom', 'bathroom', 'toilet', 'washroom',
        'elevator', 'stair', 'mechanical',
        'utility', 'storage room', 'janitor',
        'electrical', 'hvac', 'boiler'
      ];
      
      const normalizedDisplayName = displayName.toLowerCase();
      const isNonUnit = nonUnitKeywords.some(keyword => 
        normalizedDisplayName.includes(keyword.toLowerCase())
      );
      
      // Always hide non-unit items completely
      if (isNonUnit) {
        return null;
      }
      
      const isSelected = selectedUnitKey === actualUnitKey || selectedUnitKey === unitName;
      const isAvailable = unitData ? unitData.status === true : false;

      // Only show units that have CSV data and are available - no showing of units without data
      const shouldShowUnit = isAvailable;

      // Hide units that are specifically marked as unavailable or don't meet criteria
      if (!shouldShowUnit) {
        return null;
      }
      
      // Apply filters - hide units that don't pass
      if (!unitPassesFilters(unitData)) {
        return null;
      }

      const isDimmed = false; // No longer dimming since we hide completely

      return (
        <div
          key={path}
          className={`px-2 py-1 cursor-pointer transition-all duration-150 rounded text-xs border relative ${isSelected 
              ? 'bg-blue-100 border-blue-300 text-blue-800' 
              : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-gray-700'
            }
            ${isDimmed ? 'opacity-40 pointer-events-none' : ''}
          `}
          onMouseEnter={(e) => {
            if (!isDimmed) {
              const hoverData = {
                unitName: displayName.replace(/\.glb$/i, ''),
                unitData,
                position: { x: e.clientX, y: e.clientY }
              };
              setHoveredUnit(hoverData);
              
              // Dispatch global hover event for App-level rendering
              window.dispatchEvent(new CustomEvent('unit-hover-update', { 
                detail: hoverData 
              }));
              
              // Trigger scene highlighting (but NO camera movement)
              const { hoverUnit } = useGLBState.getState();
              const normalizedUnitName = displayName.replace(/\.glb$/i, '');
              
              // Pass the floor as-is - let hoverUnit handle the key construction logic
              hoverUnit(building, floor, normalizedUnitName);
            }
          }}
          onMouseMove={(e) => {
            if (!isDimmed && hoveredUnit) {
              setHoveredUnit({
                ...hoveredUnit,
                position: { x: e.clientX, y: e.clientY }
              });
            }
          }}
          onMouseLeave={() => {
            setHoveredUnit(null);
            
            // Dispatch clear hover event
            window.dispatchEvent(new CustomEvent('unit-hover-clear'));
            
            // Clear scene highlighting (but NO camera movement)
            const { hoverUnit } = useGLBState.getState();
            hoverUnit(null, null, null);
          }}
          onClick={() => {
            if (!isDimmed) {
              // Set the selected unit using the correct key
              const normalizedUnitName = displayName.replace(/\.glb$/i, '');
              
              // Check if this unit is already selected - if so, still open details
              if (selectedUnitKey === actualUnitKey) {
                // Don't return - continue to open details view
              }
              
              setSelected(actualUnitKey);
              
              // Update GLB state for 3D visualization
              const { selectUnit, isCameraAnimating } = useGLBState.getState();
              
              
              // Only proceed if camera is not already animating (prevent duplicate calls)
              if (!isCameraAnimating) {
                // Special cases for buildings with undefined/empty floors
                let effectiveFloor = floor;
                if (building === "Tower Building" && !floor) {
                  effectiveFloor = "Main Floor";
                } else if (building === "Stages" && !floor) {
                  effectiveFloor = ""; // Stages uses empty string for main stages
                }
                selectUnit(building, effectiveFloor, normalizedUnitName);
              }
              
              // Slide to details view instead of showing 3D popup
              
              // Use the actualUnitKey that was already looked up (line 884-900)
              // This is the key that successfully found the unitData
              const finalUnitData = unitData || getUnitData(actualUnitKey);
              
              // Add console log to debug
              logger.log('UI', '🔍', 'Setting suite details:', {
                actualUnitKey,
                normalizedUnitName,
                hasUnitData: !!unitData,
                finalUnitData
              });
              
              setSelectedUnitDetails(finalUnitData);
              setCurrentView('details');
              // Clear the hover state when showing details
              setHoveredUnit(null);
              const { hoverUnit } = useGLBState.getState();
              hoverUnit(null, null, null);
              
              // Close filter dropdown when unit is selected
              if (onCloseFilters) {
                onCloseFilters();
              }
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {unitData ? (
                isAvailable ? (
                  <Circle size={4} className="text-green-500 fill-current" />
                ) : (
                  <Square size={4} className="text-red-500 fill-current" />
                )
              ) : (
                <Circle size={4} className="text-gray-400 fill-current" />
              )}
              <span className={`font-medium truncate ${isSelected ? 'text-blue-800' : ''}`}>
                {displayName.replace(/\.glb$/i, '')}
              </span>
              {!unitData && (
                <span className="text-xs text-gray-400 ml-1">*</span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {/* Square footage display removed per user request */}
            </div>
          </div>
        </div>
      );
    } else {
      // This is a folder node (building or floor)
      const nodePath = path;
      const expanded = !!expandedPaths[nodePath];
      const currentPath = [...parentPath, node.name];
      const isBuilding = parentPath.length === 0;
      const isFloor = parentPath.length === 1;
      
      if (isBuilding) {
        // Get filtered unit count for this building
        const { filteredCount, totalCount } = getBuildingFilteredCount(node.name);
        
        // Building card for vertical layout
        return (
          <div key={nodePath} className="w-full bg-white bg-opacity-50 backdrop-blur-md border border-white border-opacity-50 rounded-lg shadow-sm overflow-hidden">
            <div
              className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100"
              onMouseEnter={() => {
                const { selectBuilding } = useGLBState.getState();
                selectBuilding(node.name);
              }}
              onMouseLeave={() => {
                const { clearSelection } = useGLBState.getState();
                clearSelection();
              }}
              onClick={() => {
                const isCurrentlyExpanded = !!expandedPaths[nodePath];
                if (isCurrentlyExpanded) {
                  // Collapsing - clear all selections
                  const { clearSelection } = useGLBState.getState();
                  clearSelection();
                } else {
                  // Expanding - do NOT select building (only hover does that)
                }
                toggleExpand(nodePath);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building size={14} className="text-blue-600" />
                  <div>
                    <div className="font-semibold text-gray-900 text-xs">{node.name}</div>
                    <div className="text-xs text-gray-500">
                      showing {filteredCount} suites
                    </div>
                  </div>
                </div>
                {expanded ? (
                  <ChevronDown size={14} className="text-gray-500 transition-transform duration-200" />
                ) : (
                  <ChevronRight size={14} className="text-gray-500 transition-transform duration-200" />
                )}
              </div>
            </div>
            
            {expanded && node.children && (
              <div className="bg-gray-50 max-h-64 overflow-y-auto">
                {node.children
                  .sort((a, b) => {
                    // Special sorting for Tower Building units
                    if (node.name === "Tower Building") {
                      const getUnitNumber = (item: TreeNode | string) => {
                        const name = typeof item === 'string' ? item : item.name;
                        const match = name.match(/^T-(\d+)$/i);
                        return match ? parseInt(match[1], 10) : 0;
                      };
                      
                      const aNum = getUnitNumber(a);
                      const bNum = getUnitNumber(b);
                      return aNum - bNum;
                    }
                    
                    // For building floors, sort by floor priority: Ground → First → Second → Third
                    if (typeof a !== 'string' && typeof b !== 'string') {
                      const aName = a.name.toLowerCase();
                      const bName = b.name.toLowerCase();
                      
                      const getFloorPriority = (floorName: string) => {
                        if (floorName.includes('ground')) return 0;
                        if (floorName.includes('first')) return 1;
                        if (floorName.includes('second')) return 2;
                        if (floorName.includes('third')) return 3;
                        return 999;
                      };
                      
                      const aPriority = getFloorPriority(aName);
                      const bPriority = getFloorPriority(bName);
                      
                      if (aPriority !== bPriority) {
                        return aPriority - bPriority;
                      }
                    }
                    
                    // Default alphabetical sort for other items
                    const aName = typeof a === 'string' ? a : a.name;
                    const bName = typeof b === 'string' ? b : b.name;
                    return aName.localeCompare(bName);
                  })
                  .map((child, idx) => 
                  renderGLBNode(
                    child, 
                    `${nodePath}/${typeof child === 'string' ? child : child.name}-${idx}`, 
                    currentPath
                  )
                )}
              </div>
            )}
          </div>
        );
      } else {
        // Floor/unit rendering (simplified for horizontal cards)
        return (
          <div key={nodePath} className="border-b border-gray-100 last:border-b-0">
            <div
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors duration-150"
              onMouseEnter={() => {
                if (isFloor) {
                  const building = parentPath[0];
                  const { hoverFloor } = useGLBState.getState();
                  hoverFloor(building, node.name);
                }
              }}
              onMouseLeave={() => {
                if (isFloor) {
                  const { hoverFloor } = useGLBState.getState();
                  hoverFloor(null, null);
                }
              }}
              onClick={() => {
                if (isFloor) {
                  const building = parentPath[0];
                  const { selectedBuilding, selectedFloor, selectFloor } = useGLBState.getState();
                  
                  // Check if this floor is already selected - if so, just toggle expand
                  if (selectedBuilding === building && selectedFloor === node.name) {
                    // Floor already selected, just toggling expansion
                  } else {
                    selectFloor(building, node.name);
                  }
                }
                toggleExpand(nodePath);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin size={10} className="text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">
                    {parentPath[0] === "Stages" && node.name === "Production" 
                      ? "Production" 
                      : node.name}
                  </span>
                </div>
                {expanded ? (
                  <ChevronDown size={10} className="text-gray-400 transition-transform duration-200" />
                ) : (
                  <ChevronRight size={10} className="text-gray-400 transition-transform duration-200" />
                )}
              </div>
            </div>
            
            {expanded && node.children && (
              <div className="bg-gray-100 px-2 py-1">
                <div className={`gap-1 text-xs ${
                  parentPath[0] === "Stages" && node.name === "Production" 
                    ? "flex flex-col" 
                    : "grid grid-cols-2"
                }`}>
                  {node.children
                    .sort((a, b) => {
                      // Special sorting for Tower Building units
                      if (parentPath[0] === "Tower Building") {
                        const getUnitNumber = (item: TreeNode | string) => {
                          const name = typeof item === 'string' ? item : item.name;
                          const match = name.match(/^T-(\d+)$/i);
                          return match ? parseInt(match[1], 10) : 0;
                        };
                        
                        const aNum = getUnitNumber(a);
                        const bNum = getUnitNumber(b);
                        return aNum - bNum;
                      }
                      
                      // Default alphabetical sort for units within floors
                      const aName = typeof a === 'string' ? a : a.name;
                      const bName = typeof b === 'string' ? b : b.name;
                      return aName.localeCompare(bName);
                    })
                    .map((child, idx) => 
                    renderGLBNode(
                      child, 
                      `${nodePath}/${typeof child === 'string' ? child : child.name}-${idx}`, 
                      currentPath
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }
    }
  };

  // Detect if we're on mobile for positioning
  const deviceCapabilities = useMemo(() => detectDevice(), []);
  const isMobile = deviceCapabilities.isMobile;

  return (
    <div 
      ref={panelRef}
      className={`fixed bg-white bg-opacity-90 backdrop-blur-md shadow-xl border border-white border-opacity-50 z-50 flex flex-col transition-all duration-500 ease-in-out transform rounded-2xl overflow-hidden ${
        isMobile 
          ? `left-10 right-10 ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`
          : `left-14 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`
      }`}
      style={{
        width: isMobile ? 'auto' : `${panelWidth}px`,
        height: `${panelHeight}px`,
        ...(isMobile 
          ? { 
              top: '80px', // Below the top buttons on mobile
              maxHeight: 'calc(100vh - 160px)' 
            }
          : { 
              bottom: window.innerWidth < 768 ? '80px' : '80px',
              maxHeight: window.innerWidth < 768 ? 'calc(100vh - 160px)' : 'calc(100vh - 160px)'
            }
        )
      }}
    >
      {/* Top resize handle */}
      <div
        className="absolute top-0 left-0 right-0 h-1 cursor-n-resize hover:bg-blue-500 hover:bg-opacity-30 transition-colors duration-150 z-10"
        onMouseDown={handleMouseDown('height')}
      />
      
      {/* Right resize handle */}
      <div
        className="absolute top-0 bottom-0 right-0 w-1 cursor-e-resize hover:bg-blue-500 hover:bg-opacity-30 transition-colors duration-150 z-10"
        onMouseDown={handleMouseDown('width')}
      />
      {/* Header */}
      <div className={`bg-white bg-opacity-90 backdrop-blur-md border-b border-white border-opacity-50 px-4 py-2 transition-all duration-300 delay-75 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}>
        <div className="flex items-center justify-between">
          {/* Tab/Toggle UI for Explore vs Request when not in details view */}
          {currentView !== 'details' ? (
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setCurrentView('explore')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                  currentView === 'explore'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Explore Suites
              </button>
              <button
                onClick={() => setCurrentView('request')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                  currentView === 'request'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Request Suites
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <h2 className="text-xs font-semibold text-gray-900">Suite Details</h2>
            </div>
          )}
          
          {currentView === 'explore' && (
            <span className="text-xs text-gray-500">
              Showing {totalFilteredUnits} suite{totalFilteredUnits !== 1 ? 's' : ''}
            </span>
          )}
          
          <button
            onClick={onClose}
            className="flex items-center justify-center w-4 h-4 bg-gray-100 hover:bg-gray-200 
                       rounded-md transition-colors duration-150"
            title="Close Panel"
          >
            <X size={10} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Sliding Content Container */}
      <div className="flex-1 relative overflow-hidden">
        {logger.log('UI', '🎬', 'SLIDING TRANSFORM:', { 
          currentView, 
          transform: currentView === 'explore' ? '0%' : currentView === 'details' ? '-100%' : '-200%'
        })}
        <div 
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ 
            transform: `translateX(${
              currentView === 'explore' ? '0%' : 
              currentView === 'details' ? '-100%' : 
              '-200%'
            })` 
          }}
        >
          {/* Explore Units Panel - Left side */}
          <div className="w-full flex-shrink-0 flex flex-col">
            {/* Filter Section - Now inside the sliding container */}
            <div className="bg-white bg-opacity-90 backdrop-blur-md border-b border-gray-200 px-3 py-1.5">
              <div className="space-y-1">
                {/* Square Footage Filter - Button-based Presets */}
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1">
                    <Sliders size={12} className="text-gray-500" />
                    <span className="text-xs font-medium text-gray-700">Size:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {sizePresets.map((preset, index) => {
                      const isActive = filters.minSqft === preset.minSqft && filters.maxSqft === preset.maxSqft;
                      return (
                        <button
                          key={index}
                          onClick={() => setFilters(prev => ({ 
                            ...prev, 
                            minSqft: preset.minSqft, 
                            maxSqft: preset.maxSqft 
                          }))}
                          className={`text-xs px-2 py-1 rounded transition-colors duration-150 ${
                            isActive
                              ? 'bg-blue-500 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Kitchen Filter */}
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1">
                    <Home size={12} className="text-gray-500" />
                    <span className="text-xs font-medium text-gray-700">Kitchen:</span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, hasKitchen: 'any' }))}
                      className={`flex-1 text-xs px-2 py-1 rounded transition-colors duration-150 ${
                        filters.hasKitchen === 'any'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Any
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, hasKitchen: 'yes' }))}
                      className={`flex-1 text-xs px-2 py-1 rounded transition-colors duration-150 ${
                        filters.hasKitchen === 'yes'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      With Kitchen
                    </button>
                  </div>
                </div>
                
              </div>
            </div>
            
            {/* Units List */}
            <div className={`flex-1 overflow-y-auto transition-opacity duration-300 ${
              isOpen ? 'opacity-100' : 'opacity-0'
            }`}>
              {!tree ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <div className="text-sm">Loading GLB files...</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 p-3">
                  {tree.children && tree.children
                    .sort((a, b) => {
                      // Building-level sorting - keep alphabetical  
                      const aName = typeof a === 'string' ? a : a.name;
                      const bName = typeof b === 'string' ? b : b.name;
                      return aName.localeCompare(bName);
                    })
                    .map((child, idx) => 
                    renderGLBNode(
                      child, 
                      `${tree.name}/${typeof child === 'string' ? child : child.name}-${idx}`, 
                      []
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Details Panel - Middle */}
          <div 
            className="w-full flex-shrink-0 overflow-y-auto"
            ref={detailsContentRef}
            onScroll={(e) => {
              const target = e.target as HTMLDivElement;
              setShowBackToTop(target.scrollTop > 200);
            }}
          >
            <div className="h-full bg-white">
              {/* Details Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setCurrentView('explore')}
                      className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-150"
                      title="Back to Explore"
                    >
                      <ArrowLeft size={14} className="text-gray-600" />
                    </button>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedUnitDetails?.unit_name || 'Unit Details'}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedUnitDetails?.building} • {selectedUnitDetails?.floor}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Content */}
              <div className="p-6 space-y-6 relative">
                {/* Back to Top Button */}
                {showBackToTop && (
                  <button
                    onClick={() => {
                      detailsContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="fixed bottom-24 right-6 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-50 flex items-center justify-center"
                    title="Back to Top"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                )}

                {/* Unit Info Card */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Suite Number</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedUnitDetails?.unit_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {selectedUnitDetails?.status === true ? (
                          <Circle size={8} className="text-green-500 fill-current" />
                        ) : (
                          <Square size={8} className="text-red-500 fill-current" />
                        )}
                        <span className={`text-sm font-medium ${
                          selectedUnitDetails?.status === true 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {selectedUnitDetails?.status === true ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Area</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedUnitDetails?.area_sqft 
                          ? `${selectedUnitDetails.area_sqft.toLocaleString()} RSF`
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Type</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedUnitDetails?.unit_type || 'Suite'}
                      </p>
                    </div>
                    {/* Only show kitchen info if unit actually has a kitchen */}
                    {(() => {
                      const kitchenSize = selectedUnitDetails?.kitchen_size;
                      
                      // Don't show kitchen section at all if no kitchen
                      if (!kitchenSize || kitchenSize === 'None' || kitchenSize === 'N/A') {
                        return null;
                      }
                      
                      return (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Kitchen</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {kitchenSize === 'Full' ? 'Full Kitchen' :
                             kitchenSize === 'Compact' ? 'Compact Kitchen' :
                             kitchenSize === 'Kitchenette' ? 'Kitchenette' :
                             kitchenSize}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Floorplan Section - Only show if unit is NOT in "Other" category */}
                {selectedUnitDetails?.building !== 'Other' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Floorplan</h3>
                    </div>
                    
                    {/* Floorplan Viewer */}
                    {selectedUnitDetails ? (
                      <>
                        {logger.log('FLOORPLAN', '📋', 'Rendering FloorplanViewer for:', {
                          unit: selectedUnitDetails.unit_name,
                          floorplan_url: selectedUnitDetails.floorplan_url,
                          floorPlanUrl: selectedUnitDetails.floorPlanUrl,
                          building: selectedUnitDetails.building,
                          floor: selectedUnitDetails.floor
                        })}
                        <FloorplanViewer
                          floorplanUrl={selectedUnitDetails.floorplan_url || selectedUnitDetails.floorPlanUrl || null}
                          unitName={selectedUnitDetails.unit_name}
                          onExpand={onExpandFloorplan}
                          unitData={selectedUnitDetails}
                        />
                      </>
                    ) : (
                      <div className="text-center text-gray-500 p-4">
                        Select a unit to view floorplan
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {selectedUnitDetails?.status === true && (
                    <button
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-150 flex items-center justify-center space-x-2"
                      onClick={() => {
                        setShowUnitRequestModal(true);
                      }}
                    >
                      <MessageCircle size={16} />
                      <span>Lease this space</span>
                    </button>
                  )}
                  
                  <button
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-150 flex items-center justify-center space-x-2"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}${window.location.pathname}?sel=${selectedUnitDetails?.unit_key}`;
                      const shareData = {
                        title: `Unit ${selectedUnitDetails?.unit_name} - ${selectedUnitDetails?.building}`,
                        text: `Check out this unit: ${selectedUnitDetails?.unit_name} in ${selectedUnitDetails?.building}`,
                        url: shareUrl
                      };

                      // Check if Web Share API is supported
                      if (navigator.share) {
                        navigator.share(shareData)
                          .catch(() => {});
                      } else {
                        // Fallback for browsers that don't support Web Share API
                        navigator.clipboard.writeText(shareUrl)
                          .then(() => {
                            // Show temporary feedback
                            const button = event.target.closest('button');
                            const originalText = button.innerHTML;
                            button.innerHTML = '<span class="text-sm">Link Copied!</span>';
                            setTimeout(() => {
                              button.innerHTML = originalText;
                            }, 2000);
                          })
                          .catch(() => {
                            // Failed to copy link
                          });
                      }
                    }}
                  >
                    <Share size={16} />
                    <span>Share Suite</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Request Suites Panel - Right side */}
          <div className="w-full flex-shrink-0 overflow-y-auto bg-white">
            <div className="h-full">
              {/* Request Panel Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setCurrentView('explore')}
                      className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-150"
                      title="Back to Explore"
                    >
                      <ArrowLeft size={14} className="text-gray-600" />
                    </button>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Request Suites</h2>
                      <p className="text-sm text-gray-500">Select multiple suites to request</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Request Panel Content */}
              <div className="p-6 space-y-6">
                {/* Contact Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg text-gray-900">Contact Information</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      placeholder="Your Name *"
                      value={requestFormData.senderName}
                      onChange={(e) => setRequestFormData(prev => ({ ...prev, senderName: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Your Email *"
                      value={requestFormData.senderEmail}
                      onChange={(e) => setRequestFormData(prev => ({ ...prev, senderEmail: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={requestFormData.senderPhone}
                      onChange={(e) => setRequestFormData(prev => ({ ...prev, senderPhone: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Unit Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg text-gray-900">Select Units</h3>
                    <span className="text-sm text-gray-600">
                      {selectedRequestUnits.size} unit{selectedRequestUnits.size !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  
                  {/* Units tree with checkboxes */}
                  <div className="border rounded-lg p-3 space-y-2 max-h-96 overflow-y-auto bg-gray-50">
                    {buildings.map(building => {
                      const floors = getFloorList(building);
                      const isExpanded = requestExpandedBuildings.has(building);
                      
                      return (
                        <div key={building} className="border rounded-lg bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              const newExpanded = new Set(requestExpandedBuildings);
                              if (isExpanded) {
                                newExpanded.delete(building);
                              } else {
                                newExpanded.add(building);
                              }
                              setRequestExpandedBuildings(newExpanded);
                            }}
                            className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                              <span className="font-medium text-sm">{building}</span>
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="px-3 pb-2">
                              {floors.map(floor => {
                                const floorKey = `${building}/${floor}`;
                                const isFloorExpanded = requestExpandedFloors.has(floorKey);
                                const unitKeys = getUnitsByFloor(building, floor);
                                const units = unitKeys.map(key => getUnitData(key)).filter(Boolean) as UnitRecord[];
                                const availableUnits = units.filter(u => u.status === true);
                                
                                return (
                                  <div key={floor} className="ml-4 mt-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newExpanded = new Set(requestExpandedFloors);
                                        if (isFloorExpanded) {
                                          newExpanded.delete(floorKey);
                                        } else {
                                          newExpanded.add(floorKey);
                                        }
                                        setRequestExpandedFloors(newExpanded);
                                      }}
                                      className="flex items-center gap-2 mb-1 text-sm hover:text-blue-600"
                                    >
                                      {isFloorExpanded ? (
                                        <ChevronDown size={14} />
                                      ) : (
                                        <ChevronRight size={14} />
                                      )}
                                      <span className="font-medium">{floor}</span>
                                      <span className="text-gray-500 text-xs">({availableUnits.length} available)</span>
                                    </button>
                                    
                                    {isFloorExpanded && (
                                      <div className="ml-6 space-y-1">
                                        {availableUnits.map(unit => {
                                          const unitId = `${building}/${floor}/${unit.unit_name}`;
                                          const isSelected = selectedRequestUnits.has(unitId);
                                          
                                          return (
                                            <label 
                                              key={unit.unit_key}
                                              className="flex items-center gap-2 py-1 px-2 hover:bg-blue-50 rounded cursor-pointer"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {
                                                  const newSelected = new Set(selectedRequestUnits);
                                                  if (isSelected) {
                                                    newSelected.delete(unitId);
                                                  } else {
                                                    newSelected.add(unitId);
                                                  }
                                                  setSelectedRequestUnits(newSelected);
                                                }}
                                                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                                              />
                                              <span className="text-sm">{unit.unit_name}</span>
                                              {unit.area_sqft && (
                                                <span className="text-xs text-gray-500">
                                                  ({unit.area_sqft.toLocaleString()} sf)
                                                </span>
                                              )}
                                            </label>
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

                {/* Message */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Additional Message
                  </label>
                  <textarea
                    value={requestFormData.message}
                    onChange={(e) => setRequestFormData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    rows={4}
                    placeholder="Tell us about your space requirements..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={async () => {
                    if (!requestFormData.senderName || !requestFormData.senderEmail) {
                      alert('Please fill in your name and email address.');
                      return;
                    }
                    
                    if (selectedRequestUnits.size === 0) {
                      alert('Please select at least one unit.');
                      return;
                    }
                    
                    setIsSendingRequest(true);
                    
                    try {
                      // Load EmailJS if not already loaded
                      if (!window.emailjs) {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
                        document.head.appendChild(script);
                        await new Promise(resolve => script.onload = resolve);
                        window.emailjs.init('7v5wJOSuv1p_PkcU5');
                      }

                      const recipientEmail = 'lacenterstudios3d@gmail.com';
                      const selectedUnitsList = Array.from(selectedRequestUnits);
                      
                      const templateParams = {
                        from_name: requestFormData.senderName,
                        from_email: requestFormData.senderEmail,
                        phone: requestFormData.senderPhone || 'Not provided',
                        message: requestFormData.message || 'No additional message provided.',
                        selected_units: selectedUnitsList.map(unit => `• ${unit}`).join('\n'),
                        to_email: recipientEmail,
                        reply_to: requestFormData.senderEmail
                      };

                      await window.emailjs.send(
                        'service_q47lbr7',
                        'template_0zeil8m',
                        templateParams
                      );

                      setIsSendingRequest(false);
                      alert('Request has been successfully sent!');
                      
                      // Reset form
                      setSelectedRequestUnits(new Set());
                      setRequestFormData({
                        senderName: '',
                        senderEmail: '',
                        senderPhone: '',
                        message: ''
                      });
                      setCurrentView('explore');
                      
                    } catch (error) {
                      logger.error('Email sending failed:', error);
                      setIsSendingRequest(false);
                      alert(`Failed to send request. Please try again.`);
                    }
                  }}
                  disabled={isSendingRequest || !requestFormData.senderName || !requestFormData.senderEmail || selectedRequestUnits.size === 0}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSendingRequest ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Request for {selectedRequestUnits.size} Unit{selectedRequestUnits.size !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Hover Preview moved to App.tsx for global positioning */}
      
      {/* Unit Request Modal */}
      {showUnitRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Request Suite</h2>
              <button
                onClick={() => setShowUnitRequestModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Unit Info */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="font-semibold text-gray-900">{selectedUnitDetails?.unit_name}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedUnitDetails?.building} • {selectedUnitDetails?.floor}
                  </p>
                </div>

                {/* Contact Form */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={requestFormData.senderName}
                      onChange={(e) => setRequestFormData(prev => ({ ...prev, senderName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter your name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={requestFormData.senderEmail}
                      onChange={(e) => setRequestFormData(prev => ({ ...prev, senderEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={requestFormData.senderPhone}
                      onChange={(e) => setRequestFormData(prev => ({ ...prev, senderPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={requestFormData.message}
                      onChange={(e) => setRequestFormData(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      rows={3}
                      placeholder="Tell us about your interest in this unit..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t">
              <button
                type="button"
                onClick={() => setShowUnitRequestModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendUnitRequest}
                disabled={isSendingRequest || !requestFormData.senderName || !requestFormData.senderEmail}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSendingRequest ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageCircle size={16} />
                    Send Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};