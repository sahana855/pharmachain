import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { shipmentApi } from '../../lib/api';
import { CheckCircle, Package, Truck } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function ReceiveShipment() {
  const { user } = useAuth();
  const [incomingShipments, setIncomingShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  const fetchShipments = async () => {
    try {
      const data = await shipmentApi.list();
      const all = data.items || [];
      const incoming = all.filter((s: any) =>
        s.toId === user?.id &&
        ['ASSIGNED_TO_PHARMACY', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED_TO_PHARMACY'].includes(s.status)
      );
      setIncomingShipments(incoming);
    } catch (e) {
      console.error('Failed to load shipments:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchShipments(); }, [user]);

  const handleReceive = async (shipmentId: string) => {
    setSuccess('');
    try {
      await shipmentApi.accept(shipmentId);
      setSuccess('Shipment received successfully!');
      fetchShipments();
    } catch (err: any) {
      alert(err?.message || 'Failed to receive shipment');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Receive Shipments</h1>
        <p className="text-gray-500 mt-1">Accept incoming shipments from dealers</p>
      </div>

      {success && <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <Card title="Incoming Shipments" subtitle={`${incomingShipments.length} shipments to receive`} icon={<Package />}>
        {incomingShipments.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={48} className="mx-auto mb-3 text-green-400" />
            <p className="text-gray-500 font-medium">No pending shipments</p>
            <p className="text-gray-400 text-sm mt-1">All shipments have been received</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incomingShipments.map(shipment => (
              <div key={shipment._id || shipment.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{shipment.shipmentNumber}</h3>
                    <p className="text-sm text-gray-500">From: {shipment.fromName} ({shipment.fromRole})</p>
                    {shipment.transportName && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Truck size={12} /> Transport: {shipment.transportName}
                      </p>
                    )}
                  </div>
                  <Badge variant={
                    shipment.status === 'DELIVERED_TO_PHARMACY' ? 'success' :
                    shipment.status === 'IN_TRANSIT' || shipment.status === 'OUT_FOR_DELIVERY' ? 'info' : 'warning'
                  }>
                    {shipment.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="space-y-2 mb-3">
                  {(shipment.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.medicineName} x{item.quantity}</span>
                      <span className="text-gray-700">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-semibold text-sm">
                    <span>Total</span>
                    <span>₹{shipment.totalAmount}</span>
                  </div>
                </div>

                {shipment.currentLocation && (
                  <p className="text-xs text-gray-400 mb-2">Current Location: {shipment.currentLocation}</p>
                )}
                {shipment.expectedDelivery && (
                  <p className="text-xs text-gray-400 mb-3">Expected: {new Date(shipment.expectedDelivery).toLocaleDateString()}</p>
                )}

                {['ASSIGNED_TO_PHARMACY', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(shipment.status) && (
                  <Button size="sm" variant="success" onClick={() => handleReceive(shipment._id || shipment.id)}>
                    <CheckCircle size={14} /> Receive Shipment
                  </Button>
                )}
                {shipment.status === 'DELIVERED_TO_PHARMACY' && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle size={14} /> Received
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
