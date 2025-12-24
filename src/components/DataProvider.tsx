import { useEffect, useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { wsSync } from '@/lib/websocketSync';
import {
  menuApi,
  ordersApi,
  billsApi,
  customersApi,
  staffApi,
  settingsApi,
  expensesApi,
  waiterCallsApi,
  transactionsApi,
  categoriesApi,
  checkBackendHealth,
  getApiBaseUrl,
} from '@/lib/apiClient';
import { Loader2, Server, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface DataProviderProps {
  children: React.ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const hasLoadedRef = useRef(false);

  const loadDataFromBackend = async () => {
    if (hasLoadedRef.current) {
      console.log('[DataProvider] Already loaded, skipping...');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const healthy = await checkBackendHealth();
      if (!healthy) {
        throw new Error('Backend server is not reachable');
      }

      // Connect WebSocket for real-time updates
      wsSync.connect();

      // Fetch all data from backend
      const [menuItems, orders, bills, customers, staff, settings, expenses, waiterCalls, transactions, categories] = await Promise.all([
        menuApi.getAll().catch(() => []),
        ordersApi.getAll().catch(() => []),
        billsApi.getAll().catch(() => []),
        customersApi.getAll().catch(() => []),
        staffApi.getAll().catch(() => []),
        settingsApi.get().catch(() => null),
        expensesApi.getAll().catch(() => []),
        waiterCallsApi.getAll().catch(() => []),
        transactionsApi.getAll().catch(() => []),
        categoriesApi.getAll().catch(() => []),
      ]);

      // Update store with backend data
      const store = useStore.getState();
      store.setMenuItems(menuItems || []);
      store.setOrders(orders || []);
      store.setBills(bills || []);
      store.setCustomers(customers || []);
      store.setStaff(staff || []);
      store.setSettings(settings);
      store.setExpenses(expenses || []);
      store.setWaiterCalls(waiterCalls || []);
      store.setTransactions(transactions || []);
      store.setCategories(categories || []);
      store.setDataLoaded(true);

      hasLoadedRef.current = true;
      console.log('[DataProvider] Successfully loaded data from backend');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to backend';
      setError(message);
      console.error('[DataProvider] Connection error:', message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const [menuItems, orders, bills, customers, staff, settings, expenses, waiterCalls, transactions, categories] = await Promise.all([
        menuApi.getAll().catch(() => []),
        ordersApi.getAll().catch(() => []),
        billsApi.getAll().catch(() => []),
        customersApi.getAll().catch(() => []),
        staffApi.getAll().catch(() => []),
        settingsApi.get().catch(() => null),
        expensesApi.getAll().catch(() => []),
        waiterCallsApi.getAll().catch(() => []),
        transactionsApi.getAll().catch(() => []),
        categoriesApi.getAll().catch(() => []),
      ]);

      const store = useStore.getState();
      store.setMenuItems(menuItems || []);
      store.setOrders(orders || []);
      store.setBills(bills || []);
      store.setCustomers(customers || []);
      store.setStaff(staff || []);
      store.setSettings(settings);
      store.setExpenses(expenses || []);
      store.setWaiterCalls(waiterCalls || []);
      store.setTransactions(transactions || []);
      store.setCategories(categories || []);

      console.log('[DataProvider] Refreshed data from backend');
    } catch (err) {
      console.error('[DataProvider] Refresh error:', err);
    }
  };

  // Set up WebSocket event handlers for real-time updates
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Connection status handler - only refresh on reconnection, not initial
    unsubscribers.push(
      wsSync.on('connection', (data) => {
        console.log('[DataProvider] WebSocket connection status:', data.status);
        if (data.status === 'connected' && hasLoadedRef.current) {
          refreshData();
        }
      })
    );

    // Menu updates
    unsubscribers.push(
      wsSync.on('MENU_UPDATE', async () => {
        console.log('[DataProvider] Received MENU_UPDATE');
        const menuItems = await menuApi.getAll();
        useStore.getState().setMenuItems(menuItems);
      })
    );

    // Staff updates
    unsubscribers.push(
      wsSync.on('STAFF_UPDATE', async () => {
        console.log('[DataProvider] Received STAFF_UPDATE');
        const staff = await staffApi.getAll();
        useStore.getState().setStaff(staff);
      })
    );

    // Order updates
    unsubscribers.push(
      wsSync.on('ORDER_UPDATE', async () => {
        console.log('[DataProvider] Received ORDER_UPDATE');
        const orders = await ordersApi.getAll();
        useStore.getState().setOrders(orders);
      })
    );

    // Bill updates - also refresh orders since paying a bill changes order status to 'served'
    unsubscribers.push(
      wsSync.on('BILL_UPDATE', async () => {
        console.log('[DataProvider] Received BILL_UPDATE');
        const [bills, transactions, orders] = await Promise.all([
          billsApi.getAll(),
          transactionsApi.getAll(),
          ordersApi.getAll(),
        ]);
        const store = useStore.getState();
        store.setBills(bills);
        store.setTransactions(transactions);
        store.setOrders(orders);
      })
    );

    // Customer updates
    unsubscribers.push(
      wsSync.on('CUSTOMER_UPDATE', async () => {
        console.log('[DataProvider] Received CUSTOMER_UPDATE');
        const customers = await customersApi.getAll();
        useStore.getState().setCustomers(customers);
      })
    );

    // Waiter call updates
    unsubscribers.push(
      wsSync.on('WAITER_CALL', async () => {
        console.log('[DataProvider] Received WAITER_CALL');
        const waiterCalls = await waiterCallsApi.getAll();
        useStore.getState().setWaiterCalls(waiterCalls);
      })
    );

    // Settings updates
    unsubscribers.push(
      wsSync.on('SETTINGS_UPDATE', async () => {
        console.log('[DataProvider] Received SETTINGS_UPDATE');
        const settings = await settingsApi.get();
        useStore.getState().setSettings(settings);
      })
    );

    // Expense updates
    unsubscribers.push(
      wsSync.on('EXPENSE_UPDATE', async () => {
        console.log('[DataProvider] Received EXPENSE_UPDATE');
        const expenses = await expensesApi.getAll();
        useStore.getState().setExpenses(expenses);
      })
    );

    // Categories updates
    unsubscribers.push(
      wsSync.on('CATEGORIES_UPDATE', async () => {
        console.log('[DataProvider] Received CATEGORIES_UPDATE');
        const categories = await categoriesApi.getAll();
        useStore.getState().setCategories(categories);
      })
    );

    // Initial load
    loadDataFromBackend();

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const handleSaveUrl = () => {
    localStorage.setItem('api_base_url', serverUrl);
    toast.success('Server URL updated. Reconnecting...');
    setShowConfig(false);
    hasLoadedRef.current = false;
    loadDataFromBackend();
  };

  const handleRetry = () => {
    hasLoadedRef.current = false;
    loadDataFromBackend();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Connecting to server...</p>
          <p className="text-xs text-muted-foreground">{getApiBaseUrl()}</p>
        </div>
      </div>
    );
  }

  // Error state - show configuration
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <WifiOff className="h-16 w-16 mx-auto text-destructive" />
          <div>
            <h1 className="text-2xl font-bold">Cannot Connect to Server</h1>
            <p className="text-muted-foreground mt-2">{error}</p>
          </div>

          {showConfig ? (
            <div className="space-y-4 text-left">
              <div>
                <label className="text-sm font-medium">Server URL</label>
                <Input
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://192.168.1.100:3001"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your backend server's IP address and port
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowConfig(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSaveUrl} className="flex-1">
                  Save & Connect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Button onClick={handleRetry} className="w-full gap-2">
                <Server className="h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => setShowConfig(true)} className="w-full">
                Change Server URL
              </Button>
              <p className="text-xs text-muted-foreground">
                Current: {getApiBaseUrl()}
              </p>
            </div>
          )}

          <div className="text-sm text-muted-foreground border-t pt-4">
            <p className="font-medium mb-2">Make sure:</p>
            <ul className="text-left space-y-1 text-xs">
              <li>• Backend server is running (node backend/server.js)</li>
              <li>• Server URL uses the correct IP address</li>
              <li>• Both devices are on the same network</li>
              <li>• Firewall allows port 3001</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
