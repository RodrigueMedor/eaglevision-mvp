import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { AuthProvider } from './context/AuthContext';

// Theme and Styles
import theme from './theme/theme';
import GlobalStyles from './theme/GlobalStyles';

// Components
import Layout from './components/Layout/Layout';
import AdminLayout from './components/Layout/AdminLayout';
import ErrorBoundary from './ErrorBoundary';
import AuthWrapper from './components/AuthWrapper';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home/Home';
import About from './pages/About/About';
import Services from './pages/Services/Services';
import Contact from './pages/Contact/Contact';
import FAQ from './pages/FAQ/FAQ';
import Privacy from './pages/Privacy/Privacy';
import Terms from './pages/Terms/Terms';
import AdminDashboard from './pages/Admin/AdminDashboard';
import Appointments from './pages/Admin/Appointments/Appointments';
import AppointmentCalendar from './components/Calendar/AppointmentCalendar';
import Messages from './pages/Admin/Messages/Messages';
import Reports from './pages/Admin/Reports/Reports';
import AnalyticsDashboard from './pages/Admin/AnalyticsDashboard'; // Correct path to AnalyticsDashboard
import Login from './pages/Admin/Login';
import Profile from './pages/Admin/Profile/Profile';

// Settings
import Settings from './pages/Admin/Settings/Settings';
import TaxSettings from './pages/Admin/Settings/TaxSettings';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <GlobalStyles />
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              
              {/* Public Routes */}
              <Route path="/login" element={
                <AuthWrapper>
                  <Login />
                </AuthWrapper>
              } />
              
              {/* Protected Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <Navigate to="/admin/dashboard" replace />
                </ProtectedRoute>
              } />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/appointments" element={
                <ProtectedRoute>
                  <Appointments />
                </ProtectedRoute>
              }>
                <Route index element={<Appointments />} />
                <Route path="new" element={<Appointments />} />
              </Route>
              } />
              <Route path="/admin/calendar" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AppointmentCalendar />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/messages/*" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Messages />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <AnalyticsDashboard />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/reports" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Reports />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Outlet />
                  </AdminLayout>
                </ProtectedRoute>
              }>
                <Route index element={<Settings />} />
                <Route path="tax" element={<TaxSettings />} />
              </Route>
              
              <Route path="/admin/profile" element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Profile />
                  </AdminLayout>
                </ProtectedRoute>
              } />
              
              {/* Redirect to home for unknown routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
