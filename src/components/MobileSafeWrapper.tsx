import { ReactNode, useEffect, useState } from 'react';

interface MobileSafeWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const MobileSafeWrapper = ({ children, fallback }: MobileSafeWrapperProps) => {
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Set ready after a brief delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn('Unhandled promise rejection:', event.reason);
      // Don't prevent default, just log it
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  try {
    return <>{children}</>;
  } catch (error) {
    console.error('Component render error:', error);
    setHasError(true);
    return fallback || null;
  }
};