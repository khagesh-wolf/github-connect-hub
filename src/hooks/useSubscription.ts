import { useState, useEffect, useCallback } from 'react';
import { checkSubscription, SubscriptionStatus } from '@/lib/centralSupabase';

const CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const subscriptionStatus = await checkSubscription();
      setStatus(subscriptionStatus);
      setLastChecked(new Date());
    } catch (error) {
      console.error('[useSubscription] Error:', error);
      // On error, assume valid to not block users
      setStatus({
        isValid: true,
        isTrial: false,
        daysRemaining: 0,
        expiresAt: null,
        plan: null,
        message: 'Could not verify subscription',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Set up periodic check
    const interval = setInterval(refresh, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    status,
    isLoading,
    lastChecked,
    refresh,
    isValid: status?.isValid ?? true,
    showWarning: status?.isValid && status?.daysRemaining <= 7,
  };
}
