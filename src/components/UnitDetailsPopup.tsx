/** Spec reference:
 * See ./docs/AGENT_SPEC.md (Ã¢â€Â¬Ã‚Âº10 Acceptance) and ./docs/INTERACTION_CONTRACT.md (Ã¢â€Â¬Ã‚Âº3-4).
 * Do not change ids/schema without updating docs.
 */
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MapPin, 
  Square, 
  FileText, 
  ExternalLink,
  Share,
  Copy,
  CheckCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { type UnitRecord } from '../store/exploreState';
import { emitEvent, getTimestamp } from '../lib/events';
import { isTowerUnit, getTowerUnitIndividualFloorplan, getTowerUnitFloorFloorplan, getFloorplanUrl as getIntelligentFloorplanUrl } from '../services/floorplanMappingService';
import { getFloorplanUrl as encodeFloorplanUrl } from '../services/floorplanService';

interface UnitDetailsPopupProps {
  unit: UnitRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UnitDetailsPopup: React.FC<UnitDetailsPopupProps> = ({
  unit,
  isOpen,
  onClose
}) => {
  const [floorPlanOpen, setFloorPlanOpen] = useState(false);
  const [shareUrlCopied, setShareUrlCopied] = useState(false);
  const [showIndividualFloorplan, setShowIndividualFloorplan] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Don't render if not open
  if (!isOpen) return null;

  // Create a fallback unit if none provided
  const displayUnit = unit || {
    unit_key: 'unknown',
    unit_name: 'Unknown Unit',
    status: 'Unknown',
    recipients: []
  } as UnitRecord;


  // Check if this is a tower unit with individual floorplan
  const isTower = isTowerUnit(displayUnit.unit_name || '');
  const individualFloorplan = getTowerUnitIndividualFloorplan(displayUnit.unit_name || '');
  const hasIndividualFloorplan = isTower && individualFloorplan;
  
  // Get the appropriate floorplan URL based on current view mode
  const getFloorplanUrl = () => {
    if (!displayUnit.unit_name) {
      return null;
    }
    
    if (isTower && showIndividualFloorplan && hasIndividualFloorplan) {
      // Show individual unit floorplan
      const individualFloorplan = getTowerUnitIndividualFloorplan(displayUnit.unit_name);
      const rawUrl = individualFloorplan ? `floorplans/converted/${individualFloorplan}` : null;
      return rawUrl ? encodeFloorplanUrl(rawUrl) : null;
    } else {
      // Use the intelligent mapping service (handles tower floor floorplans and regular units)
      const rawUrl = getIntelligentFloorplanUrl(displayUnit.unit_name, displayUnit);
      return rawUrl ? encodeFloorplanUrl(rawUrl) : null;
    }
  };

  const currentFloorplanUrl = getFloorplanUrl();

  const handleClose = () => {
    onClose();
    setFloorPlanOpen(false);
    setShareUrlCopied(false);
    setShowIndividualFloorplan(false);
  };

  const toggleFloorplanView = () => {
    setShowIndividualFloorplan(prev => !prev);
  };

  const handleFloorPlanClick = () => {
    setFloorPlanOpen(true);
    
    // Emit floor plan opened event
    emitEvent('evt.ui.floorplan.opened', {
      ts: getTimestamp(),
      unit_key: displayUnit.unit_key,
      source: 'unit_details'
    });
  };

  const handleShareClick = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?sel=${displayUnit.unit_key}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareUrlCopied(true);
      
      // Emit share copied event
      emitEvent('evt.share.copied', {
        ts: getTimestamp(),
        url: shareUrl,
        unit_key: displayUnit.unit_key
      });
      
      // Reset copied state after 3 seconds
      setTimeout(() => setShareUrlCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy share URL:', err);
    }
  };

  const isAvailable = displayUnit.status === true;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Drag Constraints Container */}
          <div ref={constraintsRef} className="fixed inset-4 pointer-events-none z-40" />
          
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 pointer-events-auto"
            onClick={handleClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag
            dragConstraints={constraintsRef}
            dragMomentum={false}
            dragElastic={0.1}
            className="fixed top-1/2 left-1/2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 w-full max-w-lg pointer-events-auto"
            whileDrag={{ scale: 1.02, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
          >
            {/* Header - Drag Handle */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-4 rounded-t-lg cursor-move select-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-md ${
                    isAvailable ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <MapPin size={20} className={
                      isAvailable ? 'text-green-600' : 'text-red-600'
                    } />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {displayUnit.unit_name}
                    </h2>
                    <p className="text-sm text-gray-600">{displayUnit.unit_key}</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="flex items-center justify-center w-8 h-8 bg-white hover:bg-gray-100 
                             rounded-md transition-colors duration-150 shadow-sm"
                  title="Close Details"
                >
                  <X size={16} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Status */}
              <div className={`mb-4 p-3 rounded-lg flex items-center ${
                isAvailable 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  isAvailable ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div>
                  <div className="font-medium">
                    {displayUnit.status === true ? 'Available' : 'Unavailable'}
                  </div>
                  {!isAvailable && (
                    <div className="text-sm opacity-90">
                      This unit is currently unavailable
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                {(displayUnit.area_sqft || displayUnit.size) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Area</span>
                    <span className="text-sm text-gray-900">
                      {displayUnit.area_sqft ? 
                        `${displayUnit.area_sqft.toLocaleString()} sq ft` : 
                        displayUnit.size || 'N/A'
                      }
                    </span>
                  </div>
                )}

                {displayUnit.height && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Max Height</span>
                    <span className="text-sm text-gray-900">
                      {displayUnit.height}
                    </span>
                  </div>
                )}

                {displayUnit.price_per_sqft && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Price per sq ft</span>
                    <span className="text-sm text-gray-900">
                      ${displayUnit.price_per_sqft.toFixed(2)}
                    </span>
                  </div>
                )}

                {displayUnit.lease_term && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Lease Term</span>
                    <span className="text-sm text-gray-900">{displayUnit.lease_term}</span>
                  </div>
                )}

                {(displayUnit.floor || displayUnit.private_offices !== undefined) && (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Floor</div>
                      <div className="text-sm text-gray-900">{displayUnit.floor || 'N/A'}</div>
                    </div>
                    <div className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap">
                      {displayUnit.private_offices === undefined || displayUnit.private_offices === null
                        ? 'Private Offices: N/A'
                        : displayUnit.private_offices === 0
                          ? 'Open Floor Plan'
                          : `${displayUnit.private_offices} ${displayUnit.private_offices === 1 ? 'Office' : 'Offices'}`}
                    </div>
                  </div>
                )}

                {displayUnit.notes && (
                  <div>
                    <span className="text-sm font-medium text-gray-700 block mb-2">Notes</span>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      {displayUnit.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Floor Plan Preview */}
            <div className="px-6 pb-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Floor Plan</h3>
                  {isTower && (
                    <div className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded">
                      {showIndividualFloorplan ? 'Individual Unit' : 'Full Floor'}
                    </div>
                  )}
                </div>
                <div className="relative bg-white border border-gray-100 rounded-md overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  {/* Navigation arrows for tower units */}
                  {hasIndividualFloorplan && (
                    <>
                      <button
                        onClick={toggleFloorplanView}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 shadow-md transition-all duration-200"
                        title={showIndividualFloorplan ? "Show Full Floor Plan" : "Show Individual Unit Plan"}
                      >
                        <ChevronLeft size={16} className="text-gray-700" />
                      </button>
                      <button
                        onClick={toggleFloorplanView}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 shadow-md transition-all duration-200"
                        title={showIndividualFloorplan ? "Show Full Floor Plan" : "Show Individual Unit Plan"}
                      >
                        <ChevronRight size={16} className="text-gray-700" />
                      </button>
                    </>
                  )}
                  
                  {currentFloorplanUrl ? (
                    <img
                      src={currentFloorplanUrl}
                      alt={`${displayUnit.unit_name} floor plan`}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={handleFloorPlanClick}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500"
                    style={{ display: currentFloorplanUrl ? 'none' : 'flex' }}
                  >
                    <div className="text-center">
                      <FileText size={24} className="mx-auto mb-2 text-gray-400" />
                      <div className="text-sm font-medium">Floor Plan Preview</div>
                      <div className="text-xs text-gray-400">Click to view full size</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleFloorPlanClick}
                  className="mt-3 w-full flex items-center justify-center space-x-2 px-4 py-2 
                             bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium 
                             rounded-md transition-colors duration-150"
                >
                  <FileText size={16} />
                  <span>View Full Floor Plan</span>
                </button>
                {hasIndividualFloorplan && (
                  <div className="mt-2 text-center">
                    <p className="text-xs text-gray-500">
                      Use the arrows to switch between floor and individual unit plans
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 rounded-b-lg">
              <div className="flex items-center justify-center space-x-3">

                {/* Share Button */}
                <button
                  onClick={handleShareClick}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium 
                             rounded-md transition-colors duration-150 ${
                    shareUrlCopied
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  {shareUrlCopied ? (
                    <>
                      <CheckCircle size={16} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share size={16} />
                      <span>Share</span>
                    </>
                  )}
                </button>
              </div>

              {/* Contact Info */}
              {displayUnit.recipients.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Contact</p>
                  <p className="text-sm text-gray-700">
                    {displayUnit.recipients.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Floor Plan Modal */}
          <AnimatePresence>
            {floorPlanOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black bg-opacity-75 z-60"
                  onClick={() => setFloorPlanOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                             bg-white rounded-lg shadow-xl z-60 max-w-4xl max-h-[80vh] w-full mx-4"
                >
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {displayUnit.unit_name} Floor Plan
                      </h3>
                      {isTower && (
                        <p className="text-sm text-gray-600">
                          {showIndividualFloorplan ? 'Individual Unit View' : 'Full Floor View'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {hasIndividualFloorplan && (
                        <button
                          onClick={toggleFloorplanView}
                          className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 
                                     hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                        >
                          <ChevronLeft size={14} />
                          <span>{showIndividualFloorplan ? 'Floor View' : 'Unit View'}</span>
                          <ChevronRight size={14} />
                        </button>
                      )}
                      {currentFloorplanUrl && (
                        <a
                          href={currentFloorplanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 
                                     hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                        >
                          <ExternalLink size={14} />
                          <span>Open Original</span>
                        </a>
                      )}
                      <button
                        onClick={() => setFloorPlanOpen(false)}
                        className="flex items-center justify-center w-8 h-8 bg-gray-100 
                                   hover:bg-gray-200 rounded-md transition-colors"
                      >
                        <X size={16} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6 flex items-center justify-center bg-gray-50" style={{ minHeight: '400px' }}>
                    {currentFloorplanUrl ? (
                      <img
                        src={currentFloorplanUrl}
                        alt={`${displayUnit.unit_name} Floor Plan`}
                        className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="flex items-center justify-center text-gray-500"
                      style={{ display: currentFloorplanUrl ? 'none' : 'flex' }}
                    >
                      <div className="text-center">
                        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                        <div className="text-lg font-medium text-gray-700 mb-2">Floor Plan Not Available</div>
                        <div className="text-sm text-gray-500">
                          Floor plan for {displayUnit.unit_name} is currently being processed.
                          <br />
                          Please check back later or contact us for more information.
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};
