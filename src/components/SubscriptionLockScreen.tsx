import { Lock, Phone, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionStatus } from '@/lib/centralSupabase';

interface SubscriptionLockScreenProps {
  status: SubscriptionStatus;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function SubscriptionLockScreen({ status, onRefresh, isRefreshing }: SubscriptionLockScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-destructive/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">
            System Locked
          </CardTitle>
          <CardDescription className="text-base">
            {status.message}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {status.expiresAt && (
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {status.isTrial ? 'Trial expired on' : 'Subscription ended on'}
              </p>
              <p className="font-semibold text-lg">
                {status.expiresAt.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium text-center text-muted-foreground">
              Contact administrator to renew your subscription
            </p>
            
            <div className="flex flex-col gap-2">
              <a
                href="tel:+9779800000000"
                className="flex items-center justify-center gap-2 p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">+977 9800000000</span>
              </a>
              
              <a
                href="mailto:support@example.com"
                className="flex items-center justify-center gap-2 p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">support@example.com</span>
              </a>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Checking...' : 'Check Subscription Status'}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Click to refresh after payment is confirmed
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
