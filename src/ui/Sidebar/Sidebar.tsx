import React, { useEffect } from 'react';
import { ExploreTab } from './ExploreTab';
import { RequestTab } from './RequestTab';
import { SuiteDetailsTab } from './SuiteDetailsTab';
import { CameraFooter } from './CameraFooter';
import { useSidebarState } from './useSidebarState';
import { useExploreState } from '../../store/exploreState';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X } from 'lucide-react';
import { detectDevice } from '../../utils/deviceDetection';

export default function Sidebar() {
  const { tab, setTab, view, setView, floorPlanExpanded, setFloorPlanExpanded } = useSidebarState();
  const { drawerOpen, setDrawerOpen } = useExploreState();
  const isMobile = detectDevice().isMobile;

  const open = drawerOpen;
  const setOpen = setDrawerOpen;

  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, open]);

  if (isMobile) {
    return (
      <>
        <aside
          role="complementary"
          aria-label="Suite Controls"
          aria-expanded={open}
          className={`fixed left-0 right-0 bottom-0 z-50 
            bg-white rounded-t-2xl shadow-2xl
            transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]
            ${open ? 'translate-y-0' : 'translate-y-full'}
            h-[45vh] flex flex-col`}
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}
        >
          <div className="flex-shrink-0 px-3 pt-2 pb-1 border-b border-black/5">
            <div className="flex items-center justify-between mb-2">
              {view === 'details' ? (
                <button
                  onClick={() => {
                    setView('explore');
                    setFloorPlanExpanded(false);
                  }}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft size={16} />
                  <span>Back to Explore</span>
                </button>
              ) : (
                <div className="inline-flex rounded-lg bg-black/5 p-0.5 flex-1 mr-2">
                  <button
                    className={`flex-1 px-2 py-1 rounded text-xs font-medium transition
                      ${tab === 'explore' ? 'bg-white shadow' : 'opacity-70'}`}
                    onClick={() => { setTab('explore'); setView('explore'); }}
                  >
                    Explore
                  </button>
                  <button
                    className={`flex-1 px-2 py-1 rounded text-xs font-medium transition
                      ${tab === 'request' ? 'bg-white shadow' : 'opacity-70'}`}
                    onClick={() => { setTab('request'); setView('request'); }}
                  >
                    Request
                  </button>
                </div>
              )}
              <button
                onClick={() => setOpen(false)}
                className="h-6 w-6 rounded-full bg-black/5 grid place-items-center hover:bg-black/10 transition"
                aria-label="Close sidebar"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <div 
              className="absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{
                transform: view === 'details' ? 'translateX(-100%)' : 'translateX(0)'
              }}
            >
              <div className="h-full overflow-y-auto px-3 py-2">
                {tab === 'explore' ? <ExploreTab /> : <RequestTab />}
              </div>
            </div>
            <div 
              className="absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{
                transform: view === 'details' ? 'translateX(0)' : 'translateX(100%)'
              }}
            >
              <div className="h-full">
                <SuiteDetailsTab />
              </div>
            </div>
          </div>
        </aside>
      </>
    );
  }

  return (
    <>
      {/* Toggle button - positioned based on actual sidebar state */}
      <button
        aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        onClick={() => setOpen(!open)}
        className="fixed top-4 px-3 py-2 rounded-lg bg-white shadow-lg border border-black/10 flex items-center gap-2 hover:bg-gray-50 transition-all duration-300 z-50 text-sm font-medium"
        style={{ 
          left: open 
            ? (floorPlanExpanded ? 'calc(640px + 28px)' : 'calc(320px + 28px)') 
            : 'calc(48px + 28px)'
        }}
      >
        {open ? (
          <>
            <ChevronLeft size={16} />
            <span>Collapse</span>
          </>
        ) : (
          <>
            <ChevronRight size={16} />
            <span>Expand</span>
          </>
        )}
      </button>

      <aside
        role="complementary"
        aria-label="Suite Controls"
        aria-expanded={open}
        className={`fixed left-0 top-0 h-full z-30 
          bg-white/90 backdrop-blur-md shadow-xl border-r border-black/5
          transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)]
          ${open ? 'translate-x-0' : '-translate-x-[calc(100%-48px)]'}
          ${floorPlanExpanded ? 'w-[640px]' : 'w-[320px]'}`}
        style={{ willChange: 'width, transform', contain: 'layout style paint' }}
      >

      <div className="px-4 pt-4 pb-2 border-b border-black/5">
        {view === 'details' ? (
          <button
            onClick={() => {
              setView('explore');
              setFloorPlanExpanded(false);
            }}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft size={16} />
            <span>Back to Explore</span>
          </button>
        ) : (
          <div className="inline-flex rounded-xl bg-black/5 p-1">
            <button
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition
                ${tab === 'explore' ? 'bg-white shadow' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => { setTab('explore'); setView('explore'); }}
            >
              Explore Suites
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition
                ${tab === 'request' ? 'bg-white shadow' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => { setTab('request'); setView('request'); }}
            >
              Request Suites
            </button>
          </div>
        )}
      </div>

      <div className="h-[calc(100%-80px)] overflow-hidden relative">
        <div 
          className="absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{
            transform: view === 'details' ? 'translateX(-100%)' : 'translateX(0)'
          }}
        >
          <div className="h-full overflow-y-auto px-4 py-3">
            {tab === 'explore' ? <ExploreTab /> : <RequestTab />}
          </div>
        </div>
        <div 
          className="absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{
            transform: view === 'details' ? 'translateX(0)' : 'translateX(100%)'
          }}
        >
          <div className="h-full">
            <SuiteDetailsTab />
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
