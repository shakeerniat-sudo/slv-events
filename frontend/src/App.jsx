import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Vendors from './pages/Vendors';
import Staff from './pages/Staff';
import AssignmentCenter from './pages/AssignmentCenter';
import Calendar from './pages/Calendar';
import ConflictManagement from './pages/ConflictManagement';
import Payments from './pages/Payments';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// Protected Route Wrapper (Ensures authentication only)
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-500 animate-pulse">
        Restoring secure session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Role-based auth guard for child routes
const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { hasRole } = useAuth();

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Layout Wrapper to render active route inside Layout Outlet
const LayoutWrapper = () => {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Main Routes sharing layout wrapper */}
          <Route element={<ProtectedRoute><LayoutWrapper /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            
            <Route
              path="/assignments"
              element={
                <RoleProtectedRoute allowedRoles={['Admin', 'Vendor Coordinator']}>
                  <AssignmentCenter />
                </RoleProtectedRoute>
              }
            />
            
            <Route
              path="/vendors"
              element={
                <RoleProtectedRoute allowedRoles={['Admin', 'Vendor Coordinator']}>
                  <Vendors />
                </RoleProtectedRoute>
              }
            />
            
            <Route
              path="/staff"
              element={
                <RoleProtectedRoute allowedRoles={['Admin', 'Operations Lead']}>
                  <Staff />
                </RoleProtectedRoute>
              }
            />
            
            <Route
              path="/calendar"
              element={
                <RoleProtectedRoute allowedRoles={['Admin', 'Vendor Coordinator', 'Operations Lead']}>
                  <Calendar />
                </RoleProtectedRoute>
              }
            />
            
            <Route
              path="/conflicts"
              element={
                <RoleProtectedRoute allowedRoles={['Admin', 'Vendor Coordinator']}>
                  <ConflictManagement />
                </RoleProtectedRoute>
              }
            />
            
            <Route
              path="/payments"
              element={
                <RoleProtectedRoute allowedRoles={['Admin', 'Finance Team']}>
                  <Payments />
                </RoleProtectedRoute>
              }
            />
            
            <Route
              path="/inventory"
              element={
                <RoleProtectedRoute allowedRoles={['Admin', 'Operations Lead']}>
                  <Inventory />
                </RoleProtectedRoute>
              }
            />
            
            <Route
              path="/reports"
              element={
                <RoleProtectedRoute allowedRoles={['Admin', 'Finance Team']}>
                  <Reports />
                </RoleProtectedRoute>
              }
            />
            
            <Route path="/notifications" element={<Notifications />} />
            
            <Route
              path="/settings"
              element={
                <RoleProtectedRoute allowedRoles={['Admin']}>
                  <Settings />
                </RoleProtectedRoute>
              }
            />
          </Route>

          {/* Fallback 404 Page Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
