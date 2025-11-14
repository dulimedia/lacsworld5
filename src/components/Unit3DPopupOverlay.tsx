import React, { useEffect, useState, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { motion } from 'framer-motion';
import { Expand, X, MessageCircle } from 'lucide-react';
import { useExploreState } from '../store/exploreState';
import { useGLBState } from '../store/glbState';

interface Unit3DPopupOverlayProps {
  onExpand: () => void;
  onRequest: (unitKey: string) => void;
  onClose: () => void;
}

export const Unit3DPopupOverlay: React.FC<Unit3DPopupOverlayProps> = ({
  onExpand,
  onRequest,
  onClose
}) => {
  const [unitData, setUnitData] = useState<any>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [worldPosition, setWorldPosition] = useState<THREE.Vector3 | null>(null);
  
  const { selectedUnitKey, getUnitData, show3DPopup } = useExploreState();
  const { selectedBuilding, selectedFloor, selectedUnit, glbNodes } = useGLBState();
  
  // Find the GLB object and get its world position
  useEffect(() => {
    if (!show3DPopup || !selectedUnitKey) {
      setWorldPosition(null);
      return;
    }
    
    const data = getUnitData(selectedUnitKey);
    setUnitData(data);
    
    // Reset image states
    setImageLoaded(false);
    setImageError(false);
    
    // Find the GLB object for this unit
    let unitGLB = null;
    
    // Try different key formats to find the GLB
    const possibleKeys = [
      selectedUnitKey,
      `${selectedBuilding}/${selectedFloor}/${selectedUnit}`,
      `${selectedBuilding}/${selectedUnit}`,
    ];
    
    for (const key of possibleKeys) {
      const node = glbNodes.get(key);
      if (node?.object) {
        unitGLB = node.object;
        break;
      }
    }
    
    if (unitGLB) {
      // Get the world position of the unit
      const worldPos = new THREE.Vector3();
      unitGLB.getWorldPosition(worldPos);
      
      // Add offset above the unit
      worldPos.y += 3;
      
      setWorldPosition(worldPos);
    } else {
      // Default position at origin with offset
      setWorldPosition(new THREE.Vector3(0, 3, 0));
    }
  }, [show3DPopup, selectedUnitKey, selectedBuilding, selectedFloor, selectedUnit, glbNodes, getUnitData]);
  
  if (!show3DPopup || !worldPosition || !unitData) {
    return null;
  }
  
  
  const getFloorPlanUrl = (unitName: string) => {
    if (unitData?.floorplan_url) {
      return unitData.floorplan_url;
    }
    return `/floorplans/${unitName?.toLowerCase()}.png`;
  };
  
  const floorPlanUrl = getFloorPlanUrl(unitData?.unit_name);
  const isAvailable = unitData?.status === 'Available';
  
  return (
    <Html
      position={worldPosition}
      center
      distanceFactor={10}
      occlude
      style={{
        pointerEvents: 'auto',
        userSelect: 'none'
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-white rounded-lg shadow-2xl overflow-hidden border-4 border-blue-500 min-w-[320px] max-w-[380px]"
        style={{
          transform: 'translate(-50%, -100%)',
          outline: '3px solid orange'
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">{unitData?.unit_name || 'Unit Details'}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm">{isAvailable ? 'Available' : 'Occupied'}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Floor Plan Image */}
        <div className="relative bg-gray-100 h-40">
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
                <div className="text-sm text-gray-500 mb-1">Floor Plan</div>
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
        <div className="p-4 space-y-3 bg-gray-50">
          {unitData?.area_sqft && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Size:</span>
              <span className="font-semibold">{unitData.area_sqft.toLocaleString()} sq ft</span>
            </div>
          )}
          
          {unitData?.price_per_sqft && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Price/sqft:</span>
              <span className="font-semibold">${unitData.price_per_sqft}</span>
            </div>
          )}
          
          {unitData?.lease_term && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Lease:</span>
              <span className="font-semibold">{unitData.lease_term}</span>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-gray-200 flex gap-3">
          <button
            onClick={onExpand}
            className="flex-1 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow"
          >
            <Expand size={16} />
            Expand Details
          </button>
          
          {isAvailable && (
            <button
              onClick={() => onRequest(selectedUnitKey!)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow"
              title="Request this unit"
            >
              <MessageCircle size={16} />
              Request
            </button>
          )}
        </div>
      </motion.div>
    </Html>
  );
};