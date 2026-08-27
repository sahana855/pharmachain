import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { getDB } from '../lib/db';
import { BarChart3, TrendingUp, DollarSign, Package, Users, Truck } from 'lucide-react';
import Card from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDB();
      const users = await db.getAll('users');
      const medicines = await db.getAll('medicines');
      const orders = await db.getAll('orders');
      const stock = await db.getAll('stock');
      const sales = await db.getAll('sales');
      const deliveries = await db.getAll('deliveries');

      setData({
        totalUsers: users.length,
        totalMedicines: medicines.length,
        totalOrders: orders.length,
        totalStock: stock.reduce((s, i) => s + i.quantity, 0),
        totalSales: sales.length,
        totalRevenue: sales.reduce((s, i) => s + i.totalAmount, 0),
        activeDeliveries: deliveries.filter(d => d.status !== 'delivered').length,
        usersByRole: [
          { name: 'Manufacturer', value: users.filter(u => u.role === 'manufacturer').length },
          { name: 'Dealer', value: users.filter(u => u.role === 'dealer').length },
          { name: 'Transport', value: users.filter(u => u.role === 'transport').length },
          { name: 'Pharmacy', value: users.filter(u => u.role === 'pharmacy').length },
          { name: 'Patient', value: users.filter(u => u.role === 'patient').length },
        ],
        ordersByStatus: [
          { name: 'Pending', value: orders.filter(o => o.status === 'pending').length },
          { name: 'Approved', value: orders.filter(o => o.status === 'approved').length },
          { name: 'In Transit', value: orders.filter(o => o.status === 'in_transit').length },
          { name: 'Delivered', value: orders.filter(o => o.status === 'delivered').length },
        ],
      });
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1><p className="text-gray-500 mt-1">Overall system-wide analytics and insights</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="flex items-center gap-3"><div className="p-3 bg-blue-100 rounded-lg"><Users className="w-6 h-6 text-blue-600" /></div><div><p className="text-sm text-gray-500">Total Users</p><p className="text-2xl font-bold text-gray-900">{data.totalUsers}</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="p-3 bg-green-100 rounded-lg"><Package className="w-6 h-6 text-green-600" /></div><div><p className="text-sm text-gray-500">Medicines</p><p className="text-2xl font-bold text-gray-900">{data.totalMedicines}</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="p-3 bg-purple-100 rounded-lg"><Truck className="w-6 h-6 text-purple-600" /></div><div><p className="text-sm text-gray-500">Orders</p><p className="text-2xl font-bold text-gray-900">{data.totalOrders}</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><div className="p-3 bg-yellow-100 rounded-lg"><DollarSign className="w-6 h-6 text-yellow-600" /></div><div><p className="text-sm text-gray-500">Revenue</p><p className="text-2xl font-bold text-gray-900">₹{data.totalRevenue}</p></div></div></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Users by Role" icon={<BarChart3 />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.usersByRole}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Orders by Status" icon={<TrendingUp />}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.ordersByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                {data.ordersByStatus.map((_: any, index: number) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
