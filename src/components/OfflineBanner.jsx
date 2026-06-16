import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import './OfflineBanner.css';

/**
 * OfflineBanner Component
 * Detects offline/online network status and displays a banner when offline.
 * Automatically shows/hides based on navigator.onLine API.
 */
export const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Dismiss the offline toast
        toast.dismiss('offline-toast');
        // Show success message
        toast.success('Connection restored! You are back online.', { 
          autoClose: 3000,
          position: 'top-right',
        });
        // Dispatch event for other components to listen for reconnection
        window.dispatchEvent(new Event('app:reconnected'));
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast.error('You are offline', { 
        autoClose: false, 
        closeButton: false,
        toastId: 'offline-toast',
        position: 'top-right',
      });
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state in case we're already offline
    if (!navigator.onLine) {
      handleOffline();
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Dismiss toast on unmount
      toast.dismiss('offline-toast');
    };
  }, [wasOffline]);

  // Don't render banner when online
  if (isOnline) return null;

  return (
    <div className="offline-banner">
      <div className="offline-banner-content">
        <span className="offline-icon">⚠️</span>
        <span className="offline-text">
          You are offline. Some features may be unavailable.
        </span>
      </div>
    </div>
  );
};
