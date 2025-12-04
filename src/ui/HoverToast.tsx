import React, { useEffect, useState } from 'react';
import { useExploreState } from '../store/exploreState';

// Helper to detect mobile devices
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth <= 768;
};

interface HoverToastProps {
  className?: string;
}

export const HoverToast: React.FC<HoverToastProps> = ({ className = '' }) => {
  const { hoveredUnitKey, getUnitData } = useExploreState();
  const [visible, setVisible] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  // Get unit data for the hovered unit
  const hoveredUnit = hoveredUnitKey ? getUnitData(hoveredUnitKey) : null;

  useEffect(() => {
    // Clear existing timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }

    if (hoveredUnitKey && hoveredUnit) {
      // Show immediately when hovering
      setVisible(true);
    } else {
      // Hide with delay when hover stops
      const timeout = setTimeout(() => {
        setVisible(false);
      }, 800);
      setHideTimeout(timeout);
    }

    // Cleanup timeout on unmount
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [hoveredUnitKey, hoveredUnit]);

  // Don't show on mobile devices
  if (!visible || !hoveredUnit || isMobile()) {
    return null;
  }

  return (
    <div 
      className={`
        fixed bottom-6 z-50 pointer-events-none
        bg-white bg-opacity-95 backdrop-blur-sm 
        rounded-lg shadow-xl border border-gray-300 
        px-4 py-3
        transition-all duration-300 ease-in-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        ${className}
      `}
      style={{ left: 12 }}
    >
      <div className="text-sm font-semibold text-gray-900">
        {hoveredUnit.unit_name}
      </div>
      {hoveredUnit.area_sqft && (
        <div className="text-xs text-gray-600 mt-1">
          {hoveredUnit.area_sqft.toLocaleString()} sf
        </div>
      )}
      {hoveredUnit.status && (
        <div className={`text-xs font-medium mt-1 ${
          hoveredUnit.status === 'Available' || hoveredUnit.status === true 
            ? 'text-green-600' 
            : 'text-red-600'
        }`}>
          {hoveredUnit.status === true ? 'Available' : hoveredUnit.status}
        </div>
      )}
      <div className="text-xs text-gray-500 mt-1">
        {hoveredUnit.building} · Floor {hoveredUnit.floor}
      </div>
    </div>
  );
};