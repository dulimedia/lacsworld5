import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UnitHoverPreviewProps {
  unitName: string;
  unitData?: any;
  position: { x: number; y: number };
  isVisible: boolean;
}

export const UnitHoverPreview: React.FC<UnitHoverPreviewProps> = ({
  unitName,
  unitData,
  position,
  isVisible
}) => {

  if (!isVisible) return null;

  // Calculate position to follow mouse cursor
  const calculatePosition = () => {
    const previewWidth = 180;
    const previewHeight = 80; // Much smaller without floorplan image
    const offset = 15; // Small offset from cursor
    
    let left = position.x + offset;
    let top = position.y + offset;
    
    // Check if window is available (client-side)
    if (typeof window !== 'undefined') {
      // Check if preview would go off the right edge
      if (left + previewWidth > window.innerWidth - 20) {
        // Show on the left side of cursor instead
        left = position.x - previewWidth - offset;
      }
      
      // Check if preview would go off the bottom
      if (top + previewHeight > window.innerHeight - 20) {
        // Show above cursor instead
        top = position.y - previewHeight - offset;
      }
      
      // Ensure it doesn't go off the top
      if (top < 20) {
        top = 20;
      }
      
      // Ensure it doesn't go off the left
      if (left < 20) {
        left = 20;
      }
    }
    
    return { left, top };
  };
  
  const { left, top } = calculatePosition();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed z-[9999] pointer-events-none"
        style={{
          left: `${left}px`,
          top: `${top}px`,
          maxWidth: '180px'
        }}
      >
        <div className="bg-white bg-opacity-98 backdrop-blur-sm border border-gray-300 rounded-lg shadow-xl overflow-hidden">
          {/* Unit Info - Name and Square Footage */}
          <div className="px-3 py-2">
            <div className="text-sm font-semibold text-gray-900 mb-1">{unitName}</div>
            {unitData?.area_sqft && (
              <div className="text-xs text-gray-600 font-medium">
                {unitData.area_sqft.toLocaleString()}sf
              </div>
            )}
            {unitData?.status && (
              <div className={`text-xs font-medium mt-1 ${
                unitData.status === true ? 'text-green-600' : 'text-red-600'
              }`}>
                {unitData.status === true ? 'Available' : 'Unavailable'}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};