import { useState, useEffect } from 'react';
import { Settings } from '@/types';
import { settingsApi } from '@/lib/apiClient';

const defaultSettings: Settings = {
  restaurantName: 'Restaurant',
  tableCount: 10,
  wifiSSID: '',
  wifiPassword: '',
  baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
  counterAsAdmin: false,
  kotPrintingEnabled: false,
  kdsEnabled: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsApi.get();
        if (data && data.restaurantName) {
          setSettings({ ...defaultSettings, ...data });
        }
      } catch (err) {
        console.error('[useSettings] Failed to load settings:', err);
        setError('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  return { settings, isLoading, error };
}
