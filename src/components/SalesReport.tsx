import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, CreditCard } from 'lucide-react';

type ReportPeriod = 'today' | 'week' | 'month';

export default function SalesReport() {
  const { transactions, customers, orders } = useStore();
  const [period, setPeriod] = useState<ReportPeriod>('today');

  const reportData = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let periodStart: Date;
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    switch (period) {
      case 'today':
        periodStart = todayStart;
        previousPeriodStart = new Date(todayStart);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
        previousPeriodEnd = todayStart;
        break;
      case 'week':
        periodStart = weekStart;
        previousPeriodStart = new Date(weekStart);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
        previousPeriodEnd = weekStart;
        break;
      case 'month':
        periodStart = monthStart;
        previousPeriodStart = new Date(monthStart);
        previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
        previousPeriodEnd = monthStart;
        break;
    }

    const periodTransactions = transactions.filter(
      t => new Date(t.paidAt) >= periodStart
    );
    const previousTransactions = transactions.filter(
      t => new Date(t.paidAt) >= previousPeriodStart && new Date(t.paidAt) < previousPeriodEnd
    );

    const totalRevenue = periodTransactions.reduce((sum, t) => sum + t.total, 0);
    const previousRevenue = previousTransactions.reduce((sum, t) => sum + t.total, 0);
    const revenueChange = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
      : totalRevenue > 0 ? '100' : '0';

    const totalOrders = periodTransactions.length;
    const previousOrders = previousTransactions.length;
    const ordersChange = previousOrders > 0
      ? ((totalOrders - previousOrders) / previousOrders * 100).toFixed(1)
      : totalOrders > 0 ? '100' : '0';

    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const prevAvgOrder = previousOrders > 0 ? Math.round(previousRevenue / previousOrders) : 0;
    const avgChange = prevAvgOrder > 0
      ? ((avgOrderValue - prevAvgOrder) / prevAvgOrder * 100).toFixed(1)
      : avgOrderValue > 0 ? '100' : '0';

    // Payment method breakdown
    const cashTotal = periodTransactions
      .filter(t => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.total, 0);
    const fonepayTotal = periodTransactions
      .filter(t => t.paymentMethod === 'fonepay')
      .reduce((sum, t) => sum + t.total, 0);

    // Top selling items
    const itemSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    periodTransactions.forEach(t => {
      t.items.forEach(item => {
        if (!itemSales[item.name]) {
          itemSales[item.name] = { name: item.name, qty: 0, revenue: 0 };
        }
        itemSales[item.name].qty += item.qty;
        itemSales[item.name].revenue += item.qty * item.price;
      });
    });
    const topItems = Object.values(itemSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Hourly breakdown (for today)
    const hourlyData: Record<number, number> = {};
    if (period === 'today') {
      periodTransactions.forEach(t => {
        const hour = new Date(t.paidAt).getHours();
        hourlyData[hour] = (hourlyData[hour] || 0) + t.total;
      });
    }

    // Daily breakdown (for week)
    const dailyData: Record<string, number> = {};
    if (period === 'week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      periodTransactions.forEach(t => {
        const day = days[new Date(t.paidAt).getDay()];
        dailyData[day] = (dailyData[day] || 0) + t.total;
      });
    }

    return {
      totalRevenue,
      revenueChange: parseFloat(revenueChange),
      totalOrders,
      ordersChange: parseFloat(ordersChange),
      avgOrderValue,
      avgChange: parseFloat(avgChange),
      cashTotal,
      fonepayTotal,
      topItems,
      hourlyData,
      dailyData,
      uniqueCustomers: new Set(periodTransactions.flatMap(t => t.customerPhones)).size,
    };
  }, [transactions, period]);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {(['today', 'week', 'month'] as ReportPeriod[]).map(p => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            onClick={() => setPeriod(p)}
            className="capitalize"
          >
            {p === 'today' ? 'Today' : p === 'week' ? 'Last 7 Days' : 'This Month'}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`रू${reportData.totalRevenue.toLocaleString()}`}
          change={reportData.revenueChange}
          icon={DollarSign}
        />
        <StatCard
          title="Orders"
          value={reportData.totalOrders.toString()}
          change={reportData.ordersChange}
          icon={ShoppingBag}
        />
        <StatCard
          title="Avg Order Value"
          value={`रू${reportData.avgOrderValue}`}
          change={reportData.avgChange}
          icon={TrendingUp}
        />
        <StatCard
          title="Unique Customers"
          value={reportData.uniqueCustomers.toString()}
          icon={Users}
        />
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#f0f9f4] rounded-lg border border-[#27ae60]/20">
              <div className="text-sm text-[#666] mb-1">Cash</div>
              <div className="text-2xl font-bold text-[#27ae60]">
                रू{reportData.cashTotal.toLocaleString()}
              </div>
              <div className="text-xs text-[#888] mt-1">
                {reportData.totalRevenue > 0 
                  ? `${((reportData.cashTotal / reportData.totalRevenue) * 100).toFixed(0)}%` 
                  : '0%'}
              </div>
            </div>
            <div className="p-4 bg-[#fdf0f4] rounded-lg border border-[#c32148]/20">
              <div className="text-sm text-[#666] mb-1">Fonepay</div>
              <div className="text-2xl font-bold text-[#c32148]">
                रू{reportData.fonepayTotal.toLocaleString()}
              </div>
              <div className="text-xs text-[#888] mt-1">
                {reportData.totalRevenue > 0 
                  ? `${((reportData.fonepayTotal / reportData.totalRevenue) * 100).toFixed(0)}%` 
                  : '0%'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Selling Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Selling Items</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.topItems.length === 0 ? (
            <p className="text-[#999] text-center py-4">No sales data for this period.</p>
          ) : (
            <div className="space-y-3">
              {reportData.topItems.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#f0f0f0] flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">रू{item.revenue.toLocaleString()}</div>
                    <div className="text-xs text-[#888]">{item.qty} sold</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Distribution */}
      {period === 'today' && Object.keys(reportData.hourlyData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 h-32 items-end">
              {Array.from({ length: 24 }, (_, i) => i).map(hour => {
                const value = reportData.hourlyData[hour] || 0;
                const maxValue = Math.max(...Object.values(reportData.hourlyData), 1);
                const height = (value / maxValue) * 100;
                return (
                  <div
                    key={hour}
                    className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t relative group"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  >
                    {value > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {hour}:00 - रू{value}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-[#888] mt-2">
              <span>12AM</span>
              <span>6AM</span>
              <span>12PM</span>
              <span>6PM</span>
              <span>12AM</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Distribution */}
      {period === 'week' && Object.keys(reportData.dailyData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 h-32 items-end">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                const value = reportData.dailyData[day] || 0;
                const maxValue = Math.max(...Object.values(reportData.dailyData), 1);
                const height = (value / maxValue) * 100;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-primary/30 hover:bg-primary/50 transition-colors rounded-t"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <div className="text-xs text-[#888] mt-2">{day}</div>
                    <div className="text-xs font-medium">रू{value}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon 
}: { 
  title: string; 
  value: string; 
  change?: number; 
  icon: any;
}) {
  const isPositive = change && change >= 0;
  
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className="w-5 h-5 text-muted-foreground" />
          {change !== undefined && (
            <div className={`flex items-center text-xs ${isPositive ? 'text-[#27ae60]' : 'text-[#e74c3c]'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{title}</div>
      </CardContent>
    </Card>
  );
}
