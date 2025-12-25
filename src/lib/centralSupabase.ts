// Central Supabase client for subscription management
// This connects to the admin/central database that manages all restaurant subscriptions

import { createClient } from '@supabase/supabase-js';

const centralSupabaseUrl = import.meta.env.VITE_CENTRAL_SUPABASE_URL;
const centralSupabaseAnonKey = import.meta.env.VITE_CENTRAL_SUPABASE_ANON_KEY;

export const restaurantId = import.meta.env.VITE_RESTAURANT_ID;

// Only create client if credentials are configured
export const centralSupabase = centralSupabaseUrl && centralSupabaseAnonKey
  ? createClient(centralSupabaseUrl, centralSupabaseAnonKey)
  : null;

export interface Restaurant {
  id: string;
  name: string;
  domain: string;
  trial_start: string;
  subscription_end: string | null;
  plan: '6_months' | '1_year' | null;
  is_active: boolean;
  created_at: string;
}

export interface SubscriptionStatus {
  isValid: boolean;
  isTrial: boolean;
  daysRemaining: number;
  expiresAt: Date | null;
  plan: string | null;
  message: string;
}

export async function checkSubscription(): Promise<SubscriptionStatus> {
  // If central DB not configured, allow access (development mode)
  if (!centralSupabase || !restaurantId) {
    console.warn('[Subscription] Central DB not configured - running in development mode');
    return {
      isValid: true,
      isTrial: false,
      daysRemaining: 999,
      expiresAt: null,
      plan: 'development',
      message: 'Development mode - no subscription check',
    };
  }

  try {
    const { data, error } = await centralSupabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .maybeSingle();

    if (error) {
      console.error('[Subscription] Error checking subscription:', error);
      // On error, allow access to prevent blocking due to network issues
      return {
        isValid: true,
        isTrial: false,
        daysRemaining: 0,
        expiresAt: null,
        plan: null,
        message: 'Could not verify subscription - temporary access granted',
      };
    }

    if (!data) {
      return {
        isValid: false,
        isTrial: false,
        daysRemaining: 0,
        expiresAt: null,
        plan: null,
        message: 'Restaurant not found in system. Please contact administrator.',
      };
    }

    const restaurant = data as Restaurant;
    const now = new Date();
    const trialStart = new Date(restaurant.trial_start);
    const trialEnd = new Date(trialStart);
    trialEnd.setMonth(trialEnd.getMonth() + 1); // 1 month trial

    // Check if restaurant is manually deactivated
    if (!restaurant.is_active) {
      return {
        isValid: false,
        isTrial: false,
        daysRemaining: 0,
        expiresAt: null,
        plan: restaurant.plan,
        message: 'Account has been deactivated. Please contact administrator.',
      };
    }

    // Check if in trial period
    if (now < trialEnd && !restaurant.subscription_end) {
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        isValid: true,
        isTrial: true,
        daysRemaining,
        expiresAt: trialEnd,
        plan: 'trial',
        message: daysRemaining <= 5 
          ? `Trial expires in ${daysRemaining} days. Subscribe to continue using.`
          : `Trial period - ${daysRemaining} days remaining`,
      };
    }

    // Check if has active subscription
    if (restaurant.subscription_end) {
      const subscriptionEnd = new Date(restaurant.subscription_end);
      
      if (now < subscriptionEnd) {
        const daysRemaining = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          isValid: true,
          isTrial: false,
          daysRemaining,
          expiresAt: subscriptionEnd,
          plan: restaurant.plan,
          message: daysRemaining <= 7
            ? `Subscription expires in ${daysRemaining} days. Renew to continue.`
            : `Active subscription - ${daysRemaining} days remaining`,
        };
      }
    }

    // Trial and subscription both expired
    return {
      isValid: false,
      isTrial: false,
      daysRemaining: 0,
      expiresAt: restaurant.subscription_end ? new Date(restaurant.subscription_end) : trialEnd,
      plan: restaurant.plan,
      message: 'Your subscription has expired. Please renew to continue using the system.',
    };
  } catch (err) {
    console.error('[Subscription] Unexpected error:', err);
    return {
      isValid: true,
      isTrial: false,
      daysRemaining: 0,
      expiresAt: null,
      plan: null,
      message: 'Could not verify subscription - temporary access granted',
    };
  }
}
