import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  isSafari: boolean;
  isMobile: boolean;
}

export class SafariErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    
    const userAgent = navigator.userAgent;
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isMobile = /iPad|iPhone|iPod|Android|Mobi|Mobile/i.test(userAgent);
    
    this.state = {
      hasError: false,
      isSafari,
      isMobile
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const userAgent = navigator.userAgent;
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isMobile = /iPad|iPhone|iPod|Android|Mobi|Mobile/i.test(userAgent);
    
    return {
      hasError: true,
      error,
      isSafari,
      isMobile
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (!this.state.hasError) {
      console.error('Safari Error Boundary caught an error:', error, errorInfo);
      
      if (this.state.isSafari && this.state.isMobile) {
        console.error('Safari Mobile Error Details:', {
          userAgent: navigator.userAgent,
          memory: (performance as any).memory,
          error: error.message,
          stack: error.stack
        });
      }
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Safari-specific error message
      return (
        <div className="absolute inset-0 flex flex-col justify-center items-center z-50 bg-white">
          <div className="max-w-md p-6 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {this.state.isSafari && this.state.isMobile ? 'Safari Mobile Issue' : 'Something went wrong'}
              </h2>
              
              <p className="text-gray-600 text-sm mb-4">
                {this.state.isSafari && this.state.isMobile ? 
                  'The 3D viewer encountered a compatibility issue with Safari mobile. This can happen due to memory constraints or WebGL limitations.' :
                  'The application encountered an unexpected error.'
                }
              </p>
              
              {this.state.isSafari && this.state.isMobile && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
                  <h3 className="font-medium text-yellow-800 mb-2">Safari Mobile Tips:</h3>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Close other browser tabs to free memory</li>
                    <li>• Ensure you're on iOS 14+ for best compatibility</li>
                    <li>• Try enabling JavaScript if disabled</li>
                    <li>• Clear Safari cache and reload</li>
                  </ul>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Reload Page
              </button>
              
              {this.state.isSafari && this.state.isMobile && (
                <button
                  onClick={() => window.open('https://www.google.com/chrome/', '_blank')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Try Chrome Instead
                </button>
              )}
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}