import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Expand, X, MessageCircle } from 'lucide-react';
import { useExploreState } from '../store/exploreState';

interface Unit3DPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onExpand: () => void;
  onRequest: (unitKey: string) => void;
  position?: { x: number; y: number };
}

export const Unit3DPopup: React.FC<Unit3DPopupProps> = ({
  isOpen,
  onClose,
  onExpand,
  onRequest,
  position
}) => {
  const [unitData, setUnitData] = useState<any>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const { selectedUnitKey, getUnitData } = useExploreState();
  
  useEffect(() => {
    if (!isOpen || !selectedUnitKey) return;
    
    // Get unit data from explore state
    const data = getUnitData(selectedUnitKey);
    setUnitData(data);
    
    // Reset image states
    setImageLoaded(false);
    setImageError(false);
  }, [isOpen, selectedUnitKey, getUnitData]);
  
  if (!isOpen || !unitData || !position) return null;
  
  const getFloorPlanUrl = (unitName: string) => {
    // Use floorplan URL from unit data if available
    if (unitData?.floorplan_url) {
      return unitData.floorplan_url;
    }
    // Fallback to local placeholder
    return `/floorplans/${unitName?.toLowerCase()}.png`;
  };
  
  const floorPlanUrl = getFloorPlanUrl(unitData?.unit_name);
  const isAvailable = unitData?.status === 'Available';
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed z-50"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-2 border-slate-600 min-w-[280px] max-w-[320px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">{unitData?.unit_name || 'Unit Details'}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-xs">{isAvailable ? 'Available' : 'Occupied'}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Floor Plan Image */}
          <div className="relative bg-gray-100 h-32">
            {!imageError ? (
              <img
                src={floorPlanUrl}
                alt={`${unitData?.unit_name} floor plan`}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <div className="text-center">
                  <div className="text-sm text-gray-500">Floor Plan</div>
                  <div className="text-xs text-gray-400">Not Available</div>
                </div>
              </div>
            )}
            
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
          
          {/* Details */}
          <div className="p-3 space-y-2 bg-gray-50">
            {unitData?.area_sqft && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Size:</span>
                <span className="font-medium">{unitData.area_sqft.toLocaleString()} sq ft</span>
              </div>
            )}
            
            {unitData?.price_per_sqft && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Price/sqft:</span>
                <span className="font-medium">${unitData.price_per_sqft}</span>
              </div>
            )}
            
            {unitData?.lease_term && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Lease:</span>
                <span className="font-medium">{unitData.lease_term}</span>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
            <button
              onClick={onExpand}
              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Expand size={14} />
              Expand Details
            </button>
            
            {isAvailable && (
              <button
                onClick={() => onRequest(selectedUnitKey!)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
                title="Request this unit"
              >
                <MessageCircle size={14} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};