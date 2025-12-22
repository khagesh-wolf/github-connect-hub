import { useMemo } from 'react';
import { useStore } from '@/store/useStore';

// Estimated prep time per category (in minutes)
const PREP_TIMES: Record<string, number> = {
  'Tea': 3,
  'Snacks': 8,
  'Cold Drink': 2,
  'Pastry': 1,
};

const AVERAGE_PREP_TIME = 5; // Default fallback

export function useWaitTime() {
  const orders = useStore((state) => state.orders);

  const estimateWaitTime = useMemo(() => {
    // Get orders that are pending or accepted (in queue)
    const queuedOrders = orders.filter(o => 
      o.status === 'pending' || o.status === 'accepted' || o.status === 'preparing'
    );

    // Calculate total queue time
    let totalQueueMinutes = 0;
    
    queuedOrders.forEach(order => {
      order.items.forEach(item => {
        // Try to find category from name or use average
        const category = Object.keys(PREP_TIMES).find(cat => 
          item.name.toLowerCase().includes(cat.toLowerCase())
        );
        const prepTime = category ? PREP_TIMES[category] : AVERAGE_PREP_TIME;
        totalQueueMinutes += prepTime * item.qty;
      });
    });

    // Assume kitchen can handle ~3 orders in parallel
    const parallelFactor = 3;
    const estimatedMinutes = Math.ceil(totalQueueMinutes / parallelFactor);

    return estimatedMinutes;
  }, [orders]);

  const getWaitTimeForNewOrder = (cartItems: { name: string; qty: number }[]) => {
    let newOrderTime = 0;
    
    cartItems.forEach(item => {
      const category = Object.keys(PREP_TIMES).find(cat => 
        item.name.toLowerCase().includes(cat.toLowerCase())
      );
      const prepTime = category ? PREP_TIMES[category] : AVERAGE_PREP_TIME;
      newOrderTime += prepTime * item.qty;
    });

    // Total wait = current queue + new order time
    const totalWait = estimateWaitTime + Math.ceil(newOrderTime / 2);
    
    return totalWait;
  };

  const formatWaitTime = (minutes: number) => {
    if (minutes <= 0) return 'Ready now';
    if (minutes < 5) return '< 5 min';
    if (minutes < 10) return '5-10 min';
    if (minutes < 15) return '10-15 min';
    if (minutes < 20) return '15-20 min';
    return `~${minutes} min`;
  };

  const getQueueLength = () => {
    return orders.filter(o => 
      o.status === 'pending' || o.status === 'accepted' || o.status === 'preparing'
    ).length;
  };

  return {
    estimatedWaitTime: estimateWaitTime,
    getWaitTimeForNewOrder,
    formatWaitTime,
    queueLength: getQueueLength(),
  };
}
