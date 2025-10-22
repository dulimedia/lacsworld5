import React, { useState } from 'react';
import { Building, MessageCircle, X, Menu } from 'lucide-react';
import { SimpleSuitesList } from './SimpleSuitesList';

interface UnifiedSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleSidebar: () => void;
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  isOpen,
  onClose,
  onToggleSidebar
}) => {
  const [activeTab, setActiveTab] = useState<'explore' | 'request'>('explore');

  return (
    <>
      {/* Toggle Button - Fixed on left side */}
      {!isOpen && (
        <button
          onClick={onToggleSidebar}
          className="fixed top-6 left-6 z-40 bg-white hover:bg-gray-50 shadow-lg p-3 rounded-lg transition-all duration-200 border border-gray-200"
          title="Open Menu"
        >
          <Menu size={20} className="text-gray-700" />
        </button>
      )}
      
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-screen w-96 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Tab Navigation */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('explore')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === 'explore'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Building size={18} />
              <span>Explore</span>
            </button>
            
            <button
              onClick={() => setActiveTab('request')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === 'request'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <MessageCircle size={18} />
              <span>Request</span>
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'explore' && (
            <div className="h-full p-4">
              <SimpleSuitesList />
            </div>
          )}
          
          {activeTab === 'request' && (
            <div className="h-full overflow-y-auto p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Request a Suite</h2>
              <p className="text-gray-600 mb-6">
                Fill out the form below to submit a leasing request.
              </p>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Suite Type
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Any Available</option>
                    <option>Small ({"<"} 500 sq ft)</option>
                    <option>Medium (500-1000 sq ft)</option>
                    <option>Large ({">"}1000 sq ft)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us about your needs..."
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Submit Request
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
