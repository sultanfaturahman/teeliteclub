import { useState, useEffect, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { MaintenanceNotice } from "@/components/MaintenanceNotice";
import { useAuth } from "@/hooks/useAuth";

interface MaintenanceSettings {
  is_enabled: boolean;
  maintenance_start: string | null;
  maintenance_end: string | null;
}

interface MaintenanceWrapperProps {
  children: ReactNode;
}

// Cache maintenance settings to prevent timing vulnerabilities
let cachedSettings: MaintenanceSettings | null = null;
let settingsPromise: Promise<MaintenanceSettings> | null = null;

// Define routes that should be blocked during maintenance
const BLOCKED_ROUTES = [
  '/shop',
  '/product/',
  '/cart',
  '/checkout',
  '/orders',
  '/account',
  '/payment-success',
  '/finish-payment',
  '/payment-error'
];

// Routes that are always allowed (even during maintenance)
const ALLOWED_ROUTES = [
  '/',
  '/auth',
  '/admin',
  '/test-connection',
  '/debug-products',
  '/simple-test',
  '/maintenance-test',
  '/route-test',
  '/maintenance-debug',
  '/database-test'
];

export const MaintenanceWrapper = ({ children }: MaintenanceWrapperProps) => {
  const [settings, setSettings] = useState<MaintenanceSettings | null>(cachedSettings);
  const [loading, setLoading] = useState(!cachedSettings);
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Optimized maintenance settings loader with caching
  const loadMaintenanceSettings = async (): Promise<MaintenanceSettings> => {
    // Return cached settings if available
    if (cachedSettings) {
      return cachedSettings;
    }

    // Return existing promise if already loading
    if (settingsPromise) {
      return settingsPromise;
    }

    // Create new promise for loading settings
    settingsPromise = (async () => {
      try {
        logger.info('Loading maintenance settings from database...');

        // Query maintenance settings table
        const { data, error } = await supabase
          .from('maintenance_settings')
          .select('is_enabled, maintenance_start, maintenance_end')
          .single();

        if (error) {
          logger.error('Failed to load maintenance settings', error);
          // If error, assume maintenance is off to prevent blocking access
          const fallbackSettings = { is_enabled: false, maintenance_start: null, maintenance_end: null };
          cachedSettings = fallbackSettings;
          logger.warn('Using fallback maintenance settings (disabled)');
          return fallbackSettings;
        }

        if (!data) {
          logger.warn('No maintenance settings found in database');
          const fallbackSettings = { is_enabled: false, maintenance_start: null, maintenance_end: null };
          cachedSettings = fallbackSettings;
          return fallbackSettings;
        }

        const settings = data as MaintenanceSettings;
        cachedSettings = settings;
        logger.info('Maintenance settings loaded:', settings);
        return settings;
      } catch (error) {
        logger.error('Exception while loading maintenance settings', error);
        // If error, assume maintenance is off to prevent blocking access
        const fallbackSettings = { is_enabled: false, maintenance_start: null, maintenance_end: null };
        cachedSettings = fallbackSettings;
        return fallbackSettings;
      }
    })();

    return settingsPromise;
  };

  // Route protection logic
  const isRouteBlocked = (pathname: string): boolean => {
    // Check if route is explicitly allowed
    if (ALLOWED_ROUTES.includes(pathname)) {
      return false;
    }

    // Check if route starts with any blocked route pattern
    return BLOCKED_ROUTES.some(blockedRoute =>
      pathname.startsWith(blockedRoute) ||
      (blockedRoute.endsWith('/') && pathname.startsWith(blockedRoute.slice(0, -1)))
    );
  };

  // Initialize settings immediately on mount
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        const loadedSettings = await loadMaintenanceSettings();
        setSettings(loadedSettings);

        // Check if current route should be blocked
        if (isMaintenanceActive(loadedSettings) &&
            !shouldBypassMaintenance() &&
            isRouteBlocked(location.pathname)) {
          navigate('/', { replace: true });
        }
      } catch (error) {
        logger.error('Failed to initialize maintenance settings', error);
        // Set safe fallback
        const fallbackSettings = { is_enabled: false, maintenance_start: null, maintenance_end: null };
        setSettings(fallbackSettings);
      } finally {
        setLoading(false);
      }
    };

    initializeSettings();
  }, []);

  // Set up real-time subscription after initial load
  useEffect(() => {
    if (!settings) return;

    const subscription = supabase
      .channel('maintenance_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_settings'
        },
        async () => {
          // Clear cache and reload
          cachedSettings = null;
          settingsPromise = null;
          const newSettings = await loadMaintenanceSettings();
          setSettings(newSettings);

          // Check if current route should be blocked after settings change
          if (isMaintenanceActive(newSettings) &&
              !shouldBypassMaintenance() &&
              isRouteBlocked(location.pathname)) {
            navigate('/', { replace: true });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [settings, location.pathname, navigate]);

  // Monitor route changes and block access if needed
  useEffect(() => {
    if (!settings || loading) return;

    if (isMaintenanceActive(settings) &&
        !shouldBypassMaintenance() &&
        isRouteBlocked(location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, settings, loading, navigate]);

  const isMaintenanceActive = (settingsToCheck?: MaintenanceSettings | null) => {
    const currentSettings = settingsToCheck || settings;
    if (!currentSettings?.is_enabled) return false;

    const now = new Date();

    // If no start time is set, maintenance is active when enabled
    if (!currentSettings.maintenance_start) return true;

    const startTime = new Date(currentSettings.maintenance_start);

    // If no end time is set, maintenance is active after start time
    if (!currentSettings.maintenance_end) return now >= startTime;

    const endTime = new Date(currentSettings.maintenance_end);

    // Maintenance is active between start and end time
    return now >= startTime && now < endTime;
  };

  const shouldBypassMaintenance = () => {
    // Allow admin users to bypass maintenance mode
    // But allow testing by adding ?test_maintenance=true to URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test_maintenance') === 'true') {
      return false; // Force showing maintenance page for testing
    }

    return profile?.role === 'admin';
  };

  // Show loading state while checking maintenance settings
  // During loading, prevent any navigation to blocked routes
  if (loading) {
    // If we're on a potentially blocked route during loading, show loading spinner
    if (isRouteBlocked(location.pathname)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Immediate maintenance check - no timing gap
  const maintenanceActive = isMaintenanceActive();
  const bypassMaintenance = shouldBypassMaintenance();
  const routeBlocked = isRouteBlocked(location.pathname);

  // Debug logging to track maintenance state
  console.log('🔍 MaintenanceWrapper Debug:', {
    pathname: location.pathname,
    maintenanceActive,
    bypassMaintenance,
    routeBlocked,
    settings,
    isEnabled: settings?.is_enabled,
    userRole: profile?.role,
    loading
  });

  logger.info('MaintenanceWrapper Debug:', {
    pathname: location.pathname,
    maintenanceActive,
    bypassMaintenance,
    routeBlocked,
    settings,
    isEnabled: settings?.is_enabled,
    userRole: profile?.role
  });

  // CRITICAL: Show maintenance notice for blocked routes during maintenance
  // This prevents the route components from rendering entirely
  if (maintenanceActive && !bypassMaintenance && routeBlocked) {
    logger.warn(`🚫 Route blocked during maintenance: ${location.pathname}`);
    return <MaintenanceNotice />;
  }

  // Show normal app content (homepage will show countdown via MaintenanceCountdown component)
  return <>{children}</>;
};