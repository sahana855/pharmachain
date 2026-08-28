import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { shipmentApi } from '../../lib/api';
import { BarChart3, Download, DollarSign, TrendingUp } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesReport() {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await shipmentApi.list();
        // Treat delivered shipments destined for this pharmacy as "sales"
        const delivered = (res.items || []).filter((s: any) =>
          (s.toId === user?.id || s.toId?._id === user?.id) &&
          (s.status === 'DELIVERED_TO_PHARMACY' || s.status === 'DELIVERED')
        );
        setSales(delivered);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const generateCSV = () => {
    const headers = ['Shipment #', 'From', 'Total Amount', 'Date'];
    const rows = sales.map((s: any) => [s.shipmentNumber, s.fromName, s.totalAmount, new Date(s.createdAt).toLocaleDateString()]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getChartData = () => {
    const grouped: Record<string, { total: number; count: number }> = {};
    sales.forEach((s: any) => {
      const date = new Date(s.createdAt);
      const key = period === 'daily' ? date.toLocaleDateString() : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = { total: 0, count: 0 };
      grouped[key].total += s.totalAmount || 0;
      grouped[key].count += (s.items || []).reduce((a: number, i: any) => a + i.quantity, 0);
    });
    return Object.entries(grouped).map(([date, data]) => ({
      date,
      revenue: data.total,
      items: data.count,
    }));
  };

  const totalRevenue = sales.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);
  const totalItems = sales.reduce((s: number, i: any) => s + (i.items || []).reduce((a: number, x: any) => a + x.quantity, 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Sales Report</h1><p className="text-gray-500 mt-1">Daily & monthly sales analysis</p></div>
        <Button onClick={generateCSV}><Download size={16} /> Export CSV</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Total Sales</p><p className="text-2xl font-bold text-gray-900">{sales.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Items Sold</p><p className="text-2xl font-bold text-gray-900">{totalItems}</p></Card>
        <Card><p className="text-sm text-gray-500">Total Revenue</p><p className="text-2xl font-bold text-green-600">₹{totalRevenue}</p></Card>
      </div>
      <Card title="Sales Chart" icon={<BarChart3 />} action={
        <div className="flex gap-2">
          <Button size="sm" variant={period === 'daily' ? 'primary' : 'secondary'} onClick={() => setPeriod('daily')}>Daily</Button>
          <Button size="sm" variant={period === 'monthly' ? 'primary' : 'secondary'} onClick={() => setPeriod('monthly')}>Monthly</Button>
        </div>
      }>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={getChartData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" fill="#3B82F6" name="Revenue (₹)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Sales Details" icon={<TrendingUp />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Medicine</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Qty</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{s.medicineName}</td>
                  <td className="px-4 py-3 text-sm">{s.quantity}</td>
                  <td className="px-4 py-3 text-sm">₹{s.price}</td>
                  <td className="px-4 py-3 text-sm font-medium">₹{s.totalAmount}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {sales.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No sales data</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
