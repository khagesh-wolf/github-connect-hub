import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionLockScreen } from './SubscriptionLockScreen';
import { SubscriptionWarning } from './SubscriptionWarning';
import { Loader2 } from 'lucide-react';

interface SubscriptionGuardProps {
  children: ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { status, isLoading, isValid, showWarning, refresh } = useSubscription();

  // Show loading state on initial check
  if (isLoading && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verifying subscription...</p>
        </div>
      </div>
    );
  }

  // Show lock screen if subscription is invalid
  if (!isValid && status) {
    return (
      <SubscriptionLockScreen 
        status={status} 
        onRefresh={refresh}
        isRefreshing={isLoading}
      />
    );
  }

  // Show app with optional warning banner
  return (
    <>
      {showWarning && status && <SubscriptionWarning status={status} />}
      <div className={showWarning ? 'pt-10' : ''}>
        {children}
      </div>
    </>
  );
}
