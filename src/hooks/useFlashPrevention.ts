import { useEffect, useState, useRef } from 'react';
import { useGLBState } from '../store/glbState';

export const useFlashPrevention = () => {
  const { selectedUnit, selectedBuilding, selectedFloor } = useGLBState();
  const [preventFlash, setPreventFlash] = useState(false);
  const lastSelectionRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failsafeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Create a selection signature
    const currentSelection = `${selectedBuilding || ''}-${selectedFloor || ''}-${selectedUnit || ''}`;
    
    if (!currentSelection) {
      // No selection, just clear any pending freeze frame
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setPreventFlash(false);
      lastSelectionRef.current = currentSelection;
      return;
    }

    if (currentSelection !== lastSelectionRef.current) {
      console.log('🚨 SELECTION CHANGE DETECTED - Activating flash prevention');
      console.log('Previous:', lastSelectionRef.current);
      console.log('Current:', currentSelection);
      console.log('🧊 FlashKiller will be ACTIVATED for 500ms');

      setPreventFlash(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (failsafeTimeoutRef.current) {
        clearTimeout(failsafeTimeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        console.log('⏰ Flash prevention timeout reached - disabling FlashKiller');
        setPreventFlash(false);
        timeoutRef.current = null;
        console.log('✅ Flash prevention window ended');
      }, 500);

      // FAILSAFE: Force disable flash prevention after 3 seconds maximum
      failsafeTimeoutRef.current = setTimeout(() => {
        console.warn('⚠️ useFlashPrevention FAILSAFE: Force disabling flash prevention after 3 seconds');
        setPreventFlash(false);
        timeoutRef.current = null;
        failsafeTimeoutRef.current = null;
      }, 3000);
    }

    lastSelectionRef.current = currentSelection;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (failsafeTimeoutRef.current) {
        clearTimeout(failsafeTimeoutRef.current);
        failsafeTimeoutRef.current = null;
      }
    };
  }, [selectedUnit, selectedBuilding, selectedFloor]);

  return {
    preventFlash,
    activateFlashPrevention: () => setPreventFlash(true)
  };
};