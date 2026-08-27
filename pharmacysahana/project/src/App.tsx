import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import Login from './pages/Login';
import Verification from './pages/Verification';
import Scan from './pages/Scan';
import LiveTracking from './pages/LiveTracking';
import PublicVerify from './pages/PublicVerify';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserApprovals from './pages/admin/UserApprovals';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

// Manufacturer Pages
import ManufacturerDashboard from './pages/manufacturer/ManufacturerDashboard';
import DataEntry from './pages/manufacturer/DataEntry';
import StockMaintenance from './pages/manufacturer/StockMaintenance';
import DispatchMFG from './pages/manufacturer/Dispatch';
import QRGeneration from './pages/manufacturer/QRGeneration';
import BatchManagement from './pages/manufacturer/BatchManagement';
import ProductRecall from './pages/manufacturer/ProductRecall';
import ProductionReport from './pages/manufacturer/ProductionReport';
import LowStockAlertMFG from './pages/manufacturer/LowStockAlert';

// Dealer Pages
import DealerDashboard from './pages/dealer/DealerDashboard';
import DealerStock from './pages/dealer/Stock';
import DealerDispatch from './pages/dealer/Dispatch';
import StockHistory from './pages/dealer/StockHistory';
import PendingOrders from './pages/dealer/PendingOrders';
import AutoRestock from './pages/dealer/AutoRestock';
import DamagedReturns from './pages/dealer/DamagedReturns';

// Transport Pages
import TransportDashboard from './pages/transport/TransportDashboard';
import LocationUpdate from './pages/transport/LocationUpdate';
import DeliveryStatus from './pages/transport/DeliveryStatus';
import DeliveryProof from './pages/transport/DeliveryProof';
import DelayAlerts from './pages/transport/DelayAlerts';

// Pharmacy Pages
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard';
import QRChecking from './pages/pharmacy/QRChecking';
import CurrentStock from './pages/pharmacy/CurrentStock';
import SoldStock from './pages/pharmacy/SoldStock';
import ExpiryAlertPharmacy from './pages/pharmacy/ExpiryAlert';
import NearbyDealers from './pages/pharmacy/NearbyDealers';
import LowStockAlertPharmacy from './pages/pharmacy/LowStockAlert';
import AutoReorder from './pages/pharmacy/AutoReorder';
import MedicineSearch from './pages/pharmacy/MedicineSearch';
import SalesReport from './pages/pharmacy/SalesReport';
import ReturnsPharmacy from './pages/pharmacy/Returns';
import DiscountAlert from './pages/pharmacy/DiscountAlert';
import ReceiveShipment from './pages/pharmacy/ReceiveShipment';

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard';
import DrugAlert from './pages/patient/DrugAlert';
import ExpiryAlertPatient from './pages/patient/ExpiryAlert';
import TransportData from './pages/patient/TransportData';
import AuthenticityCheck from './pages/patient/AuthenticityCheck';
import UsageReminder from './pages/patient/UsageReminder';
import PurchaseHistory from './pages/patient/PurchaseHistory';
import SideEffectReporting from './pages/patient/SideEffectReporting';
import RefillReminder from './pages/patient/RefillReminder';

// Transport Box Pages
import TransportBox from './pages/manufacturer/TransportBox';
import ShipmentScan from './pages/manufacturer/ShipmentScan';
import TrackBox from './pages/manufacturer/TrackBox';

// System Pages
import ActivityLog from './pages/ActivityLog';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import AIAssistant from './components/AIAssistant';

import GlobalNotifications from './components/GlobalNotifications';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AIAssistant />
        <GlobalNotifications />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verification" element={<Verification />} />
          <Route path="/scan" element={<ProtectedRoute><Scan /></ProtectedRoute>} />
          <Route path="/live-tracking" element={<ProtectedRoute><DashboardLayout><LiveTracking /></DashboardLayout></ProtectedRoute>} />
          <Route path="/verify/:qrId" element={<PublicVerify />} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/approvals" element={<ProtectedRoute allowedRoles={['admin']}><UserApprovals /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Manufacturer Routes */}
          <Route path="/dashboard/manufacturer" element={<ProtectedRoute allowedRoles={['manufacturer']}><DashboardLayout><ManufacturerDashboard /></DashboardLayout></ProtectedRoute>} />
          <Route path="/manufacturer/data-entry" element={<ProtectedRoute allowedRoles={['manufacturer']}><DashboardLayout><DataEntry /></DashboardLayout></ProtectedRoute>} />
          <Route path="/manufacturer/stock" element={<ProtectedRoute allowedRoles={['manufacturer']}><DashboardLayout><StockMaintenance /></DashboardLayout></ProtectedRoute>} />
          <Route path="/manufacturer/dispatch" element={<ProtectedRoute allowedRoles={['manufacturer']}><DashboardLayout><DispatchMFG /></DashboardLayout></ProtectedRoute>} />
          <Route path="/manufacturer/qr-generation" element={<ProtectedRoute allowedRoles={['manufacturer']}><DashboardLayout><QRGeneration /></DashboardLayout></ProtectedRoute>} />
          <Route path="/manufacturer/batches" element={<ProtectedRoute allowedRoles={['manufacturer']}><DashboardLayout><BatchManagement /></DashboardLayout></ProtectedRoute>} />
          <Route path="/manufacturer/recall" element={<ProtectedRoute allowedRoles={['manufacturer']}><DashboardLayout><ProductRecall /></DashboardLayout></ProtectedRoute>} />
          <Route path="/manufacturer/reports" element={<ProtectedRoute allowedRoles={['manufacturer']}><DashboardLayout><ProductionReport /></DashboardLayout></ProtectedRoute>} />
          <Route path="/manufacturer/low-stock" element={<ProtectedRoute allowedRoles={['manufacturer']}><DashboardLayout><LowStockAlertMFG /></DashboardLayout></ProtectedRoute>} />

          {/* Dealer Routes */}
          <Route path="/dashboard/dealer" element={<ProtectedRoute allowedRoles={['dealer']}><DashboardLayout><DealerDashboard /></DashboardLayout></ProtectedRoute>} />
          <Route path="/dealer/stock" element={<ProtectedRoute allowedRoles={['dealer']}><DashboardLayout><DealerStock /></DashboardLayout></ProtectedRoute>} />
          <Route path="/dealer/dispatch" element={<ProtectedRoute allowedRoles={['dealer', 'manufacturer', 'admin']}><DashboardLayout><DealerDispatch /></DashboardLayout></ProtectedRoute>} />
          <Route path="/dealer/stock-history" element={<ProtectedRoute allowedRoles={['dealer']}><DashboardLayout><StockHistory /></DashboardLayout></ProtectedRoute>} />
          <Route path="/dealer/pending-orders" element={<ProtectedRoute allowedRoles={['dealer']}><DashboardLayout><PendingOrders /></DashboardLayout></ProtectedRoute>} />
          <Route path="/dealer/auto-restock" element={<ProtectedRoute allowedRoles={['dealer']}><DashboardLayout><AutoRestock /></DashboardLayout></ProtectedRoute>} />
          <Route path="/dealer/returns" element={<ProtectedRoute allowedRoles={['dealer', 'manufacturer', 'admin']}><DashboardLayout><DamagedReturns /></DashboardLayout></ProtectedRoute>} />

          {/* Transport Routes */}
          <Route path="/dashboard/transport" element={<ProtectedRoute allowedRoles={['transport']}><DashboardLayout><TransportDashboard /></DashboardLayout></ProtectedRoute>} />
          <Route path="/transport/location" element={<ProtectedRoute allowedRoles={['transport']}><DashboardLayout><LocationUpdate /></DashboardLayout></ProtectedRoute>} />
          <Route path="/transport/delivery-status" element={<ProtectedRoute allowedRoles={['transport']}><DashboardLayout><DeliveryStatus /></DashboardLayout></ProtectedRoute>} />
          <Route path="/transport/delivery-proof" element={<ProtectedRoute allowedRoles={['transport']}><DashboardLayout><DeliveryProof /></DashboardLayout></ProtectedRoute>} />
          <Route path="/transport/delay-alerts" element={<ProtectedRoute allowedRoles={['transport']}><DashboardLayout><DelayAlerts /></DashboardLayout></ProtectedRoute>} />

          {/* Pharmacy Routes */}
          <Route path="/dashboard/pharmacy" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><PharmacyDashboard /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pharmacy/qr-checking" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><QRChecking /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pharmacy/stock" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><CurrentStock /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pharmacy/sold-stock" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><SoldStock /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pharmacy/expiry-alert" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><ExpiryAlertPharmacy /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pharmacy/nearby-dealers" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><NearbyDealers /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pharmacy/low-stock" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><LowStockAlertPharmacy /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pharmacy/auto-reorder" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><AutoReorder /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pharmacy/search" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><MedicineSearch /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pharmacy/sales-report" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><SalesReport /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pharmacy/returns" element={<ProtectedRoute allowedRoles={['pharmacy', 'dealer', 'manufacturer', 'admin']}><DashboardLayout><ReturnsPharmacy /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pharmacy/discount-alert" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><DiscountAlert /></DashboardLayout></ProtectedRoute>} />
          <Route path="/pharmacy/receive-shipment" element={<ProtectedRoute allowedRoles={['pharmacy']}><DashboardLayout><ReceiveShipment /></DashboardLayout></ProtectedRoute>} />

          {/* Patient Routes */}
          <Route path="/dashboard/patient" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><PatientDashboard /></DashboardLayout></ProtectedRoute>} />
          <Route path="/patient/drug-alert" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><DrugAlert /></DashboardLayout></ProtectedRoute>} />
          <Route path="/patient/expiry-alert" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><ExpiryAlertPatient /></DashboardLayout></ProtectedRoute>} />
          <Route path="/patient/transport" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><TransportData /></DashboardLayout></ProtectedRoute>} />
          <Route path="/patient/authenticity" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><AuthenticityCheck /></DashboardLayout></ProtectedRoute>} />
          <Route path="/patient/reminders" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><UsageReminder /></DashboardLayout></ProtectedRoute>} />
          <Route path="/patient/purchase-history" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><PurchaseHistory /></DashboardLayout></ProtectedRoute>} />
          <Route path="/patient/side-effects" element={<ProtectedRoute allowedRoles={['patient', 'admin']}><DashboardLayout><SideEffectReporting /></DashboardLayout></ProtectedRoute>} />
          <Route path="/patient/refill" element={<ProtectedRoute allowedRoles={['patient']}><DashboardLayout><RefillReminder /></DashboardLayout></ProtectedRoute>} />

          {/* Transport Box Routes - new */}
          <Route path="/manufacturer/transport-box" element={
            <ProtectedRoute allowedRoles={['manufacturer', 'dealer', 'admin']}>
              <DashboardLayout><TransportBox /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/shipment-scan" element={
            <ProtectedRoute allowedRoles={['manufacturer', 'dealer', 'transport', 'pharmacy', 'admin']}>
              <ShipmentScan />
            </ProtectedRoute>
          } />
          <Route path="/track/:qrId" element={<TrackBox />} />

          {/* System Routes */}
          <Route path="/activity-log" element={<ProtectedRoute><DashboardLayout><ActivityLog /></DashboardLayout></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><DashboardLayout><Analytics /></DashboardLayout></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><DashboardLayout><Notifications /></DashboardLayout></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
