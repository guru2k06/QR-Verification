import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AuditLog from './pages/admin/AuditLog';
import IssuedCertificates from './pages/admin/IssuedCertificates';
import PendingRequests from './pages/admin/PendingRequests';
import RequestForm from './pages/public/RequestForm';
import VerifyCertificate from './pages/public/VerifyCertificate';

function AdminLayout() {
  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/request" replace />} />
          <Route path="request" element={<RequestForm />} />
          <Route path="verify/:id" element={<VerifyCertificate />} />
          <Route path="admin/login" element={<AdminLogin />} />
          <Route
            path="admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="requests" element={<PendingRequests />} />
            <Route path="certificates" element={<IssuedCertificates />} />
            <Route path="audit" element={<AuditLog />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
