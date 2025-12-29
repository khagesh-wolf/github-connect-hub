import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';

interface ManifestConfig {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  theme_color: string;
  background_color: string;
}

const ROLE_CONFIGS: Record<string, Omit<ManifestConfig, 'name' | 'short_name'>> = {
  '/install/admin': {
    description: 'Admin dashboard for menu management and reports',
    start_url: '/admin',
    theme_color: '#6366f1', // Indigo
    background_color: '#1e1b4b',
  },
  '/install/counter': {
    description: 'Point-of-sale counter terminal',
    start_url: '/counter',
    theme_color: '#10b981', // Emerald
    background_color: '#0f172a',
  },
  '/install/kitchen': {
    description: 'Kitchen display for order management',
    start_url: '/kitchen',
    theme_color: '#f97316', // Orange
    background_color: '#431407',
  },
  '/install/waiter': {
    description: 'Mobile waiter app for table orders',
    start_url: '/waiter',
    theme_color: '#8b5cf6', // Violet
    background_color: '#2e1065',
  },
};

const ROLE_LABELS: Record<string, string> = {
  '/install/admin': 'Admin',
  '/install/counter': 'Counter',
  '/install/kitchen': 'Kitchen',
  '/install/waiter': 'Waiter',
};

/**
 * Hook to dynamically generate and inject a manifest for the current install page
 */
export const useDynamicManifest = () => {
  const location = useLocation();
  const { settings } = useSettings();

  useEffect(() => {
    const roleConfig = ROLE_CONFIGS[location.pathname];
    if (!roleConfig) return;

    const roleLabel = ROLE_LABELS[location.pathname];
    const restaurantName = settings.restaurantName || 'Sajilo Orders';
    const subName = settings.restaurantSubName;
    
    // Create app name with role
    const appName = subName 
      ? `${restaurantName} - ${subName} ${roleLabel}`
      : `${restaurantName} ${roleLabel}`;
    
    const shortName = `${restaurantName.slice(0, 8)} ${roleLabel}`;

    // Build the manifest object
    const manifest = {
      name: appName,
      short_name: shortName,
      description: roleConfig.description,
      theme_color: roleConfig.theme_color,
      background_color: roleConfig.background_color,
      display: 'standalone',
      orientation: 'portrait',
      start_url: roleConfig.start_url,
      scope: '/',
      icons: [
        {
          src: settings.logo || '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: settings.logo || '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    };

    // Create a blob URL for the manifest
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);

    // Find or create the manifest link
    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }

    // Update the manifest URL
    manifestLink.href = manifestUrl;

    // Also update theme-color meta tag
    let themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = roleConfig.theme_color;

    // Update apple-touch-icon if logo is available
    if (settings.logo) {
      let appleTouchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleTouchIcon);
      }
      appleTouchIcon.href = settings.logo;
    }

    // Cleanup
    return () => {
      URL.revokeObjectURL(manifestUrl);
    };
  }, [location.pathname, settings.restaurantName, settings.restaurantSubName, settings.logo]);
};
